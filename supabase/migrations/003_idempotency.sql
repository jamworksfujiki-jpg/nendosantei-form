-- 重複送信防止用のキーテーブル
-- 2026-04-26

create table if not exists idempotency_keys (
  key text primary key,
  application_id uuid references applications(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_idempotency_created on idempotency_keys(created_at);

alter table idempotency_keys enable row level security;
