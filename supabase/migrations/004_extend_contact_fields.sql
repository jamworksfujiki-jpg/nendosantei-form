-- 顧問先カラム拡張: 会社名カナ・従業員数・freee招待状況
-- 2026-04-27

alter table application_contacts
  add column if not exists company_name_kana text,
  add column if not exists employee_count int,
  add column if not exists freee_invited boolean;
