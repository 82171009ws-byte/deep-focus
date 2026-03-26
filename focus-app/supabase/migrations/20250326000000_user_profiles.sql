-- ユーザーごとの設定（最小: is_premium）。Stripe 連携用カラムを先に置いておく。
-- Supabase SQL Editor または CLI で実行してください。

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_premium boolean not null default false,
  stripe_customer_id text,
  updated_at timestamptz not null default now()
);

comment on table public.user_profiles is 'アプリ単位のユーザー設定。RLS で本人のみ参照・更新。';
comment on column public.user_profiles.is_premium is 'アプリ上のプレミアム可否。本番では Stripe Webhook 等で更新する想定。';
comment on column public.user_profiles.stripe_customer_id is 'Stripe Customer ID（Checkout / Portal / Webhook で設定）。';

-- updated_at 自動更新
create or replace function public.user_profiles_set_updated_at()
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

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row
  execute function public.user_profiles_set_updated_at();

-- 新規サインアップ時に空のプロフィール行を作成（クライアントからの INSERT に依存しない）
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile();

alter table public.user_profiles enable row level security;

-- 本人のみ読み取り
create policy "user_profiles_select_own"
  on public.user_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- 本人のみ更新（アプリからのフラグ変更や将来のメタ更新用）
create policy "user_profiles_update_own"
  on public.user_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- トリガー失敗時や既存ユーザー向けに、自分の id の行のみ INSERT 可
create policy "user_profiles_insert_own"
  on public.user_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Stripe Webhook 等は service_role で RLS をバイパスする想定（サーバー専用キー）

grant select, insert, update on table public.user_profiles to authenticated;
