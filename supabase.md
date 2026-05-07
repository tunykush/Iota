Ok, bạn đã tạo Supabase project rồi. Nhìn screenshot thì project `iota` đang ở trạng thái database vừa khởi tạo/đang coming up. Step tiếp theo nên làm thật kỹ theo thứ tự dưới đây.

__Việc Cần Làm Ngay Trên Supabase__

- Chờ status database hết `Coming up...`.
- Vào `SQL Editor` để chạy schema database.
- Vào `Storage` để tạo bucket lưu PDF.
- Vào `Project Settings > API` để lấy `Project URL`, `anon public key`, `service_role key`.
- Sau đó quay lại repo để thêm `.env.local` và nối code.

__Step 4A.1: Tạo Database Schema__ Vào Supabase dashboard bên trái, bấm icon `SQL Editor`, tạo New Query, paste SQL này và chạy:

```sql
create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('pdf', 'website', 'database')),
  title text not null,
  original_filename text,
  storage_bucket text,
  storage_path text,
  url text,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  chunk_count integer not null default 0,
  content_hash text,
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  job_type text not null check (job_type in ('pdf', 'website', 'database')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  stage text check (stage in ('extracting', 'chunking', 'embedding', 'storing')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index integer not null,
  text text not null,
  token_count integer,
  embedding vector(1536),
  source_type text not null check (source_type in ('pdf', 'website', 'database')),
  page_number integer,
  url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.message_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.conversation_messages(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  chunk_id uuid references public.document_chunks(id) on delete set null,
  score double precision,
  snippet text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

__Step 4A.2: Tạo Indexes__ Chạy tiếp query này trong `SQL Editor`:

```sql
create index if not exists idx_documents_user_created
  on public.documents(user_id, created_at desc);

create index if not exists idx_documents_user_status
  on public.documents(user_id, status);

create index if not exists idx_documents_user_source_type
  on public.documents(user_id, source_type);

create index if not exists idx_ingestion_jobs_user_document
  on public.ingestion_jobs(user_id, document_id);

create index if not exists idx_ingestion_jobs_user_status
  on public.ingestion_jobs(user_id, status);

create index if not exists idx_document_chunks_user_document
  on public.document_chunks(user_id, document_id);

create index if not exists idx_document_chunks_document_index
  on public.document_chunks(document_id, chunk_index);

create index if not exists idx_conversations_user_updated
  on public.conversations(user_id, updated_at desc);

create index if not exists idx_conversation_messages_conversation_created
  on public.conversation_messages(conversation_id, created_at);

create index if not exists idx_message_sources_message
  on public.message_sources(message_id);
```

Index vector để phase embeddings sau mới cần. Khi có embeddings thật, chạy thêm:

```sql
create index if not exists idx_document_chunks_embedding_hnsw
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops);
```

__Step 4A.3: Tự Cập Nhật `updated_at`__ Chạy tiếp:

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();
```

__Step 4A.4: Bật RLS Và Policy__ Đây là phần quan trọng nhất. Chạy query này:

```sql
alter table public.documents enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.message_sources enable row level security;

create policy "documents_select_own"
on public.documents for select
to authenticated
using (user_id = auth.uid());

create policy "documents_insert_own"
on public.documents for insert
to authenticated
with check (user_id = auth.uid());

create policy "documents_update_own"
on public.documents for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "documents_delete_own"
on public.documents for delete
to authenticated
using (user_id = auth.uid());

create policy "ingestion_jobs_select_own"
on public.ingestion_jobs for select
to authenticated
using (user_id = auth.uid());

create policy "ingestion_jobs_insert_own"
on public.ingestion_jobs for insert
to authenticated
with check (user_id = auth.uid());

create policy "ingestion_jobs_update_own"
on public.ingestion_jobs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "document_chunks_select_own"
on public.document_chunks for select
to authenticated
using (user_id = auth.uid());

create policy "document_chunks_insert_own"
on public.document_chunks for insert
to authenticated
with check (user_id = auth.uid());

create policy "document_chunks_update_own"
on public.document_chunks for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "document_chunks_delete_own"
on public.document_chunks for delete
to authenticated
using (user_id = auth.uid());

create policy "conversations_select_own"
on public.conversations for select
to authenticated
using (user_id = auth.uid());

create policy "conversations_insert_own"
on public.conversations for insert
to authenticated
with check (user_id = auth.uid());

create policy "conversations_update_own"
on public.conversations for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "conversations_delete_own"
on public.conversations for delete
to authenticated
using (user_id = auth.uid());

create policy "conversation_messages_select_own"
on public.conversation_messages for select
to authenticated
using (user_id = auth.uid());

create policy "conversation_messages_insert_own"
on public.conversation_messages for insert
to authenticated
with check (user_id = auth.uid());

create policy "message_sources_select_own"
on public.message_sources for select
to authenticated
using (user_id = auth.uid());

create policy "message_sources_insert_own"
on public.message_sources for insert
to authenticated
with check (user_id = auth.uid());
```

__Step 4A.5: Tạo Storage Bucket__ Vào sidebar trái `Storage`:

- Bấm `New bucket`.
- Name: `knowledge-files`.
- Public bucket: `off` / private.
- File size limit: có thể để 20MB hoặc 50MB cho MVP.
- Allowed MIME types nếu có option:
  - `application/pdf`

Sau đó tạo Storage policy. Vào `SQL Editor` chạy:

```sql
create policy "users_can_upload_own_files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'knowledge-files'
  and owner = auth.uid()
);

create policy "users_can_read_own_files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'knowledge-files'
  and owner = auth.uid()
);

create policy "users_can_update_own_files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'knowledge-files'
  and owner = auth.uid()
);

create policy "users_can_delete_own_files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'knowledge-files'
  and owner = auth.uid()
);
```

__Query `updated_at` Đúng__ Paste nguyên block này vào tab `updated_at`, thay block hiện tại, rồi bấm `Run`:

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();
```

__Sau Khi Chạy Xong `updated_at`__ Tiếp theo chạy phần RLS policies. Đây là phần bảo mật quan trọng để user chỉ thấy data của chính mình.

Paste block này vào query mới hoặc tab mới rồi chạy:

```sql
alter table public.documents enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.message_sources enable row level security;

create policy "documents_select_own"
on public.documents for select
to authenticated
using (user_id = auth.uid());

create policy "documents_insert_own"
on public.documents for insert
to authenticated
with check (user_id = auth.uid());

create policy "documents_update_own"
on public.documents for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "documents_delete_own"
on public.documents for delete
to authenticated
using (user_id = auth.uid());

create policy "ingestion_jobs_select_own"
on public.ingestion_jobs for select
to authenticated
using (user_id = auth.uid());

create policy "ingestion_jobs_insert_own"
on public.ingestion_jobs for insert
to authenticated
with check (user_id = auth.uid());

create policy "ingestion_jobs_update_own"
on public.ingestion_jobs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "document_chunks_select_own"
on public.document_chunks for select
to authenticated
using (user_id = auth.uid());

create policy "document_chunks_insert_own"
on public.document_chunks for insert
to authenticated
with check (user_id = auth.uid());

create policy "document_chunks_update_own"
on public.document_chunks for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "document_chunks_delete_own"
on public.document_chunks for delete
to authenticated
using (user_id = auth.uid());

create policy "conversations_select_own"
on public.conversations for select
to authenticated
using (user_id = auth.uid());

create policy "conversations_insert_own"
on public.conversations for insert
to authenticated
with check (user_id = auth.uid());

create policy "conversations_update_own"
on public.conversations for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "conversations_delete_own"
on public.conversations for delete
to authenticated
using (user_id = auth.uid());

create policy "conversation_messages_select_own"
on public.conversation_messages for select
to authenticated
using (user_id = auth.uid());

create policy "conversation_messages_insert_own"
on public.conversation_messages for insert
to authenticated
with check (user_id = auth.uid());

create policy "message_sources_select_own"
on public.message_sources for select
to authenticated
using (user_id = auth.uid());

create policy "message_sources_insert_own"
on public.message_sources for insert
to authenticated
with check (user_id = auth.uid());
```

Nếu RLS cũng báo `Success. No rows returned`, database foundation gần như xong. Sau đó mình sẽ hướng dẫn bạn tạo Storage bucket `knowledge-files` và policies cho file PDF.



__1. Chạy RLS Policies__ Đây là bước quan trọng tiếp theo. Nó đảm bảo mỗi user chỉ thấy document/chat của chính họ.

Tạo tab SQL mới tên ví dụ `RLS Policies`, paste block này rồi bấm `Run`:

```sql
alter table public.documents enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.message_sources enable row level security;

create policy "documents_select_own"
on public.documents for select
to authenticated
using (user_id = auth.uid());

create policy "documents_insert_own"
on public.documents for insert
to authenticated
with check (user_id = auth.uid());

create policy "documents_update_own"
on public.documents for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "documents_delete_own"
on public.documents for delete
to authenticated
using (user_id = auth.uid());

create policy "ingestion_jobs_select_own"
on public.ingestion_jobs for select
to authenticated
using (user_id = auth.uid());

create policy "ingestion_jobs_insert_own"
on public.ingestion_jobs for insert
to authenticated
with check (user_id = auth.uid());

create policy "ingestion_jobs_update_own"
on public.ingestion_jobs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "document_chunks_select_own"
on public.document_chunks for select
to authenticated
using (user_id = auth.uid());

create policy "document_chunks_insert_own"
on public.document_chunks for insert
to authenticated
with check (user_id = auth.uid());

create policy "document_chunks_update_own"
on public.document_chunks for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "document_chunks_delete_own"
on public.document_chunks for delete
to authenticated
using (user_id = auth.uid());

create policy "conversations_select_own"
on public.conversations for select
to authenticated
using (user_id = auth.uid());

create policy "conversations_insert_own"
on public.conversations for insert
to authenticated
with check (user_id = auth.uid());

create policy "conversations_update_own"
on public.conversations for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "conversations_delete_own"
on public.conversations for delete
to authenticated
using (user_id = auth.uid());

create policy "conversation_messages_select_own"
on public.conversation_messages for select
to authenticated
using (user_id = auth.uid());

create policy "conversation_messages_insert_own"
on public.conversation_messages for insert
to authenticated
with check (user_id = auth.uid());

create policy "message_sources_select_own"
on public.message_sources for select
to authenticated
using (user_id = auth.uid());

create policy "message_sources_insert_own"
on public.message_sources for insert
to authenticated
with check (user_id = auth.uid());
```

Nếu báo `Success. No rows returned` là ổn.

__2. Tạo Storage Bucket Cho PDF__ Sau RLS, qua sidebar trái chọn `Storage`.

Tạo bucket mới:

```text
Name: knowledge-files
Public: OFF / Private
File size limit: 20MB hoặc 50MB
Allowed MIME type: application/pdf
```


__3. Chạy Storage Policies__ Sau khi tạo bucket xong, quay lại `SQL Editor`, tạo tab mới tên `Storage Policies`, paste:

```sql
create policy "users_can_upload_own_files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'knowledge-files'
  and owner = auth.uid()
);

create policy "users_can_read_own_files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'knowledge-files'
  and owner = auth.uid()
);

create policy "users_can_update_own_files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'knowledge-files'
  and owner = auth.uid()
);

create policy "users_can_delete_own_files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'knowledge-files'
  and owner = auth.uid()
);
```

Nếu có popup warning thì bình thường. Query này không xóa gì cả.

__4. Kiểm Tra Table Editor__ Vào `Table Editor`, kiểm tra có đủ bảng này chưa:

- `documents`
- `ingestion_jobs`
- `document_chunks`
- `conversations`
- `conversation_messages`
- `message_sources`
