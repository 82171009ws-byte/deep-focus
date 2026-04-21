-- Stripe サブスクリプション状態を user_profiles に保持（Webhook が正の情報源）

alter table public.user_profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists price_id text;

comment on column public.user_profiles.stripe_subscription_id is 'Stripe Subscription ID（Webhook で更新）。';
comment on column public.user_profiles.subscription_status is 'Stripe subscription.status のミラー（Webhook で更新）。';
comment on column public.user_profiles.price_id is '契約中の Stripe Price ID（先頭の subscription item）。';

create index if not exists user_profiles_stripe_customer_id_idx
  on public.user_profiles (stripe_customer_id)
  where stripe_customer_id is not null;
