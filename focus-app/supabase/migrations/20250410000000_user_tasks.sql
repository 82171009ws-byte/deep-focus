-- ログインユーザーごとのタスク（クライアントは RLS で本人のみ CRUD）
-- estimated_pomodoros は将来用（アプリは未使用でも列だけ用意）

create table if not exists public.user_tasks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  actual_pomodoros integer not null default 0,
  estimated_pomodoros integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_tasks_title_nonempty check (length(trim(title)) > 0),
  constraint user_tasks_actual_nonneg check (actual_pomodoros >= 0),
  constraint user_tasks_estimated_nonneg check (estimated_pomodoros is null or estimated_pomodoros >= 0)
);

comment on table public.user_tasks is 'フォーカスアプリのタスク。未ログイン時は localStorage。';
comment on column public.user_tasks.estimated_pomodoros is '将来用: 見積もりポモ数。';

create index if not exists user_tasks_user_created_idx
  on public.user_tasks (user_id, created_at);

create or replace function public.user_tasks_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_tasks_set_updated_at on public.user_tasks;
create trigger user_tasks_set_updated_at
  before update on public.user_tasks
  for each row
  execute function public.user_tasks_set_updated_at();

alter table public.user_tasks enable row level security;

create policy "user_tasks_select_own"
  on public.user_tasks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_tasks_insert_own"
  on public.user_tasks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_tasks_update_own"
  on public.user_tasks
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_tasks_delete_own"
  on public.user_tasks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.user_tasks to authenticated;

-- タイマー対象タスク（端末間で揃える）
alter table public.user_profiles
  add column if not exists selected_task_id uuid null;

comment on column public.user_profiles.selected_task_id is '現在のタイマー対象タスク id（user_tasks.id）。該当行が無い場合はクライアントで無視可。';
