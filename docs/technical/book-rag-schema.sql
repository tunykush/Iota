-- ============================================================================
-- Book RAG Schema Migration
-- Run this in Supabase SQL Editor AFTER the base schema from supabase.md
-- ============================================================================

-- ── 1. Book Structure Table ────────────────────────────────────────────────
-- Persists the detected book structure so retrieval can use it without re-parsing.

create table if not exists public.book_structures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  title text not null default 'Untitled Book',
  total_chapters integer not null default 0,
  total_sections integer not null default 0,
  total_characters integer not null default 0,
  toc jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(document_id)
);

-- ── 2. Book Chapters Table ─────────────────────────────────────────────────
-- One row per chapter. Stores LLM-generated summary for 2-phase retrieval.

create table if not exists public.book_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  book_structure_id uuid not null references public.book_structures(id) on delete cascade,
  chapter_number integer,
  chapter_title text not null,
  summary text,
  position_in_book double precision not null default 0,
  section_count integer not null default 0,
  char_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── 3. Entity Index Table ──────────────────────────────────────────────────
-- Stores extracted entities (characters, places, concepts) linked to chunks.

create table if not exists public.book_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  entity_name text not null,
  entity_type text not null check (entity_type in ('person', 'place', 'concept', 'event', 'organization', 'other')),
  aliases text[] not null default '{}',
  chunk_ids uuid[] not null default '{}',
  chapter_numbers integer[] not null default '{}',
  mention_count integer not null default 0,
  first_appearance double precision,  -- position_in_book 0.0-1.0
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── 4. Add book-specific columns to document_chunks ────────────────────────
-- These allow efficient SQL filtering without parsing jsonb metadata.

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'document_chunks' and column_name = 'chunk_type') then
    alter table public.document_chunks add column chunk_type text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'document_chunks' and column_name = 'chapter_number') then
    alter table public.document_chunks add column chapter_number integer;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'document_chunks' and column_name = 'section_depth') then
    alter table public.document_chunks add column section_depth integer;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'document_chunks' and column_name = 'position_in_book') then
    alter table public.document_chunks add column position_in_book double precision;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'document_chunks' and column_name = 'chapter_id') then
    alter table public.document_chunks add column chapter_id uuid references public.book_chapters(id) on delete set null;
  end if;
end $$;

-- ── 5. Indexes for Book RAG queries ───────────────────────────────────────

create index if not exists idx_book_structures_document
  on public.book_structures(document_id);

create index if not exists idx_book_chapters_document
  on public.book_chapters(document_id, chapter_number);

create index if not exists idx_book_chapters_structure
  on public.book_chapters(book_structure_id);

create index if not exists idx_book_entities_document
  on public.book_entities(document_id);

create index if not exists idx_book_entities_name
  on public.book_entities(user_id, entity_name);

create index if not exists idx_book_entities_type
  on public.book_entities(user_id, entity_type);

create index if not exists idx_document_chunks_chunk_type
  on public.document_chunks(user_id, chunk_type)
  where chunk_type is not null;

create index if not exists idx_document_chunks_chapter
  on public.document_chunks(user_id, document_id, chapter_number)
  where chapter_number is not null;

create index if not exists idx_document_chunks_position
  on public.document_chunks(document_id, position_in_book)
  where position_in_book is not null;

-- ── 6. RLS Policies ───────────────────────────────────────────────────────

alter table public.book_structures enable row level security;
alter table public.book_chapters enable row level security;
alter table public.book_entities enable row level security;

create policy "book_structures_select_own" on public.book_structures for select to authenticated using (user_id = auth.uid());
create policy "book_structures_insert_own" on public.book_structures for insert to authenticated with check (user_id = auth.uid());
create policy "book_structures_update_own" on public.book_structures for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "book_structures_delete_own" on public.book_structures for delete to authenticated using (user_id = auth.uid());

create policy "book_chapters_select_own" on public.book_chapters for select to authenticated using (user_id = auth.uid());
create policy "book_chapters_insert_own" on public.book_chapters for insert to authenticated with check (user_id = auth.uid());
create policy "book_chapters_update_own" on public.book_chapters for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "book_chapters_delete_own" on public.book_chapters for delete to authenticated using (user_id = auth.uid());

create policy "book_entities_select_own" on public.book_entities for select to authenticated using (user_id = auth.uid());
create policy "book_entities_insert_own" on public.book_entities for insert to authenticated with check (user_id = auth.uid());
create policy "book_entities_update_own" on public.book_entities for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "book_entities_delete_own" on public.book_entities for delete to authenticated using (user_id = auth.uid());

-- ── 7. RPC: 2-Phase Book Retrieval ────────────────────────────────────────
-- Phase 1: Search summary chunks to find relevant chapters
-- Phase 2: Search detail chunks within those chapters

create or replace function public.match_book_summary_chunks(
  query_embedding vector(1536),
  match_count integer default 5,
  filter_user_id uuid default auth.uid(),
  filter_document_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  text text,
  source_type text,
  page_number integer,
  url text,
  metadata jsonb,
  title text,
  document_source_type text,
  document_url text,
  similarity double precision,
  chunk_type text,
  chapter_number integer
)
language sql stable security invoker set search_path = public
as $$
  select
    c.id, c.document_id, c.chunk_index, c.text, c.source_type,
    c.page_number, c.url, c.metadata,
    d.title, d.source_type as document_source_type, d.url as document_url,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.chunk_type, c.chapter_number
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where c.user_id = filter_user_id
    and c.embedding is not null
    and c.chunk_type in ('book_summary', 'chapter_summary', 'section_summary')
    and (filter_document_ids is null or c.document_id = any(filter_document_ids))
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

-- Phase 2: Search detail chunks within specific chapters
create or replace function public.match_book_detail_chunks(
  query_embedding vector(1536),
  match_count integer default 10,
  filter_user_id uuid default auth.uid(),
  filter_document_ids uuid[] default null,
  filter_chapter_numbers integer[] default null
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  text text,
  source_type text,
  page_number integer,
  url text,
  metadata jsonb,
  title text,
  document_source_type text,
  document_url text,
  similarity double precision,
  chunk_type text,
  chapter_number integer,
  position_in_book double precision
)
language sql stable security invoker set search_path = public
as $$
  select
    c.id, c.document_id, c.chunk_index, c.text, c.source_type,
    c.page_number, c.url, c.metadata,
    d.title, d.source_type as document_source_type, d.url as document_url,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.chunk_type, c.chapter_number, c.position_in_book
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where c.user_id = filter_user_id
    and c.embedding is not null
    and c.chunk_type = 'detail'
    and (filter_document_ids is null or c.document_id = any(filter_document_ids))
    and (filter_chapter_numbers is null or c.chapter_number = any(filter_chapter_numbers))
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 30);
$$;

-- ── 8. RPC: Entity-Aware Retrieval ────────────────────────────────────────
-- Find chunks that mention a specific entity

create or replace function public.match_entity_chunks(
  query_entity_name text,
  filter_user_id uuid default auth.uid(),
  filter_document_ids uuid[] default null,
  match_count integer default 10
)
returns table (
  chunk_id uuid,
  document_id uuid,
  text text,
  chapter_number integer,
  position_in_book double precision,
  entity_name text,
  entity_type text
)
language sql stable security invoker set search_path = public
as $$
  select
    unnest(e.chunk_ids) as chunk_id,
    e.document_id,
    c.text,
    c.chapter_number,
    c.position_in_book,
    e.entity_name,
    e.entity_type
  from public.book_entities e
  join public.document_chunks c on c.id = any(e.chunk_ids)
  where e.user_id = filter_user_id
    and lower(e.entity_name) = lower(query_entity_name)
    and (filter_document_ids is null or e.document_id = any(filter_document_ids))
  order by c.position_in_book
  limit least(greatest(match_count, 1), 30);
$$;

-- ── 9. RPC: Get adjacent chunks (for narrative stitching) ─────────────────

create or replace function public.get_adjacent_chunks(
  target_chunk_id uuid,
  window_size integer default 1
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  text text,
  chunk_type text,
  chapter_number integer,
  position_in_book double precision,
  relative_position integer  -- -1 = before, 0 = target, 1 = after
)
language sql stable security invoker set search_path = public
as $$
  with target as (
    select document_id, chunk_index, user_id
    from public.document_chunks
    where id = target_chunk_id
  )
  select
    c.id, c.document_id, c.chunk_index, c.text,
    c.chunk_type, c.chapter_number, c.position_in_book,
    (c.chunk_index - t.chunk_index) as relative_position
  from public.document_chunks c
  cross join target t
  where c.document_id = t.document_id
    and c.user_id = t.user_id
    and c.chunk_index between (t.chunk_index - window_size) and (t.chunk_index + window_size)
  order by c.chunk_index;
$$;
