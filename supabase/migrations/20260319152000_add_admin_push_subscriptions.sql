create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_push_subscriptions enable row level security;

create trigger update_admin_push_subscriptions_updated_at
before update on public.admin_push_subscriptions
for each row execute function public.update_updated_at_column();
