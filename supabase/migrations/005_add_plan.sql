-- 料金プラン: 9,900円(accountant) / 19,800円(middle) / 23,100円(standard)
-- 2026-05-14

alter table applications
  add column if not exists plan text not null default 'accountant';
