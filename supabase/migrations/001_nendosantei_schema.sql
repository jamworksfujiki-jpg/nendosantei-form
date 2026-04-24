-- 年度更新・算定基礎届 受付フォーム スキーマ
-- 2026-04-24

create extension if not exists "pgcrypto";

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  submission_method text not null check (submission_method in ('paper','email','form')),
  applicant_office_name text,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  deadline_acknowledged boolean not null default false,
  privacy_agreed boolean not null default false,
  total_contacts int not null default 0,
  status text not null default 'received' check (status in ('received','processing','done','cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists application_contacts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  row_index int not null,
  company_name text not null,
  contact_name text not null,
  phone text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_application_contacts_app on application_contacts(application_id);

create table if not exists application_files (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references application_contacts(id) on delete cascade,
  file_kind text not null check (file_kind in ('santei','roho','other')),
  storage_path text not null,
  original_filename text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_application_files_contact on application_files(contact_id);

create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  type text not null check (type in ('thanks','admin_notify')),
  status text not null check (status in ('sent','failed')),
  error text,
  sent_at timestamptz not null default now()
);

-- RLS：anon は何もできない。API ルート（service_role）のみ
alter table applications enable row level security;
alter table application_contacts enable row level security;
alter table application_files enable row level security;
alter table email_logs enable row level security;

-- service_role はバイパスするので明示ポリシー不要
-- anon 用のポリシーは作らない（=拒否）
