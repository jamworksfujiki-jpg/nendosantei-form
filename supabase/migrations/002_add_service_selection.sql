-- 顧問先ごとの依頼サービス選択（年度更新・算定基礎届）
-- 2026-04-24

alter table application_contacts
  add column if not exists needs_nendo_koshin boolean not null default true,
  add column if not exists needs_santei boolean not null default true;
