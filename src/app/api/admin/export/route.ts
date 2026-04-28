import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getServiceClient } from '@/lib/supabase';
import { getEnv } from '@/lib/env';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const PRICE_PER_SERVICE = 9900;

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const SUBMISSION_LABEL: Record<string, string> = {
  paper: '紙で送付',
  email: 'メールで送信',
  form: 'フォームから入力',
};

export async function GET(req: NextRequest) {
  const limit = checkRateLimit(clientKey(req, 'admin-export'), { windowMs: 60_000, max: 10 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'リクエストが多すぎます' }, { status: 429 });
  }
  const pw = req.headers.get('x-admin-password') ?? '';
  const expected = getEnv('ADMIN_PASSWORD') ?? '';
  if (!expected || !safeEqual(pw, expected)) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id, submission_method, applicant_office_name, applicant_name,
      applicant_email, applicant_phone, total_contacts, status, created_at,
      application_contacts (
        row_index, company_name, company_name_kana, employee_count,
        contact_name, phone, email, freee_invited,
        needs_nendo_koshin, needs_santei
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type RowOut = Record<string, string | number | null>;
  const rows: RowOut[] = [];

  for (const app of data ?? []) {
    const created = new Date(app.created_at as string);
    const dateStr = `${created.getFullYear()}/${String(created.getMonth() + 1).padStart(2, '0')}/${String(created.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}`;

    type RawContact = {
      row_index: number;
      company_name: string | null;
      company_name_kana: string | null;
      employee_count: number | null;
      contact_name: string | null;
      phone: string | null;
      email: string | null;
      freee_invited: boolean | null;
      needs_nendo_koshin: boolean | null;
      needs_santei: boolean | null;
    };
    const contacts = (app.application_contacts ?? []) as RawContact[];

    if (contacts.length === 0) {
      rows.push({
        '受付日': dateStr,
        '受付時刻': timeStr,
        '受付ID': String(app.id).slice(0, 8),
        '申込種別': SUBMISSION_LABEL[app.submission_method as string] ?? String(app.submission_method),
        '会計事務所名': app.applicant_office_name ?? '',
        '申込担当者': app.applicant_name ?? '',
        '申込者メール': app.applicant_email ?? '',
        '申込者電話': app.applicant_phone ?? '',
        '顧問先#': '',
        '顧問先様会社名': '',
        '会社名（カナ）': '',
        '従業員数': '',
        'ご担当者様名': '',
        'お電話番号': '',
        'メールアドレス': '',
        'freee招待済み': '',
        '年度更新': '',
        '算定基礎届': '',
        '小計': 0,
        '状態': app.status ?? '',
      });
      continue;
    }

    for (const c of contacts.sort((x, y) => x.row_index - y.row_index)) {
      const subtotal = ((c.needs_nendo_koshin ? 1 : 0) + (c.needs_santei ? 1 : 0)) * PRICE_PER_SERVICE;
      rows.push({
        '受付日': dateStr,
        '受付時刻': timeStr,
        '受付ID': String(app.id).slice(0, 8),
        '申込種別': SUBMISSION_LABEL[app.submission_method as string] ?? String(app.submission_method),
        '会計事務所名': app.applicant_office_name ?? '',
        '申込担当者': app.applicant_name ?? '',
        '申込者メール': app.applicant_email ?? '',
        '申込者電話': app.applicant_phone ?? '',
        '顧問先#': c.row_index,
        '顧問先様会社名': c.company_name ?? '',
        '会社名（カナ）': c.company_name_kana ?? '',
        '従業員数': c.employee_count ?? '',
        'ご担当者様名': c.contact_name ?? '',
        'お電話番号': c.phone ?? '',
        'メールアドレス': c.email ?? '',
        'freee招待済み': c.freee_invited ? '○' : '',
        '年度更新': c.needs_nendo_koshin ? '○' : '',
        '算定基礎届': c.needs_santei ? '○' : '',
        '小計': subtotal,
        '状態': app.status ?? '',
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '受注一覧');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const today = new Date();
  const fname = `nendosantei-export-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fname}"`,
    },
  });
}
