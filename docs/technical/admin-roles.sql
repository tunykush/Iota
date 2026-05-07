-- Iota admin/user role setup for Supabase.
-- Run this in Supabase SQL Editor after the base schema in supabase.md.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own_name" on public.profiles;
create policy "profiles_update_own_name"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create or replace function public.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'user')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_user_profile on auth.users;
create trigger trg_sync_user_profile
after insert or update on auth.users
for each row execute function public.sync_user_profile();

-- Optional helper: check if current authenticated user is admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Admin can read all rows through SQL/RLS-aware clients if needed.
-- The app's admin API currently uses SUPABASE_SERVICE_ROLE_KEY server-side.
drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
on public.profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "documents_admin_select_all" on public.documents;
create policy "documents_admin_select_all"
on public.documents for select
to authenticated
using (public.is_admin());

drop policy if exists "ingestion_jobs_admin_select_all" on public.ingestion_jobs;
create policy "ingestion_jobs_admin_select_all"
on public.ingestion_jobs for select
to authenticated
using (public.is_admin());

drop policy if exists "document_chunks_admin_select_all" on public.document_chunks;
create policy "document_chunks_admin_select_all"
on public.document_chunks for select
to authenticated
using (public.is_admin());

drop policy if exists "conversations_admin_select_all" on public.conversations;
create policy "conversations_admin_select_all"
on public.conversations for select
to authenticated
using (public.is_admin());

drop policy if exists "conversation_messages_admin_select_all" on public.conversation_messages;
create policy "conversation_messages_admin_select_all"
on public.conversation_messages for select
to authenticated
using (public.is_admin());

drop policy if exists "message_sources_admin_select_all" on public.message_sources;
create policy "message_sources_admin_select_all"
on public.message_sources for select
to authenticated
using (public.is_admin());

-- To make an existing account admin, replace the email below with your login email:
-- update public.profiles
-- set role = 'admin', updated_at = now()
-- where email = 'your-email@example.com';
--
-- You can keep logging in with the same email/password. Role lives in public.profiles.