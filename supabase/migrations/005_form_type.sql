-- 申込フォーム種別を区別するためのカラム追加
-- 'firm' = 会計事務所様向け（既存・複数顧問先）
-- 'sme'  = 一般中小企業様向け（自社1件）
-- 2026-05-01

alter table applications
  add column if not exists form_type text not null default 'firm'
    check (form_type in ('firm','sme'));

create index if not exists idx_applications_form_type on applications(form_type);
