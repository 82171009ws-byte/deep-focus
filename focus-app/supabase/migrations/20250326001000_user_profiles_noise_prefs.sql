-- user_profiles にホワイトノイズ設定を追加（最小）
-- ログイン中は Supabase を優先して同期する用途

alter table public.user_profiles
  add column if not exists selected_noise text not null default 'none',
  add column if not exists selected_noise2 text not null default 'none',
  add column if not exists noise_volume integer not null default 70;

-- 値域（0-100）を保証
alter table public.user_profiles
  drop constraint if exists user_profiles_noise_volume_range,
  add constraint user_profiles_noise_volume_range check (noise_volume >= 0 and noise_volume <= 100);

comment on column public.user_profiles.selected_noise is 'ノイズ選択（内部 id）。未選択は none。';
comment on column public.user_profiles.selected_noise2 is 'プレミアム用の2つ目。未選択は none。';
comment on column public.user_profiles.noise_volume is 'ノイズ音量（0-100）。';

