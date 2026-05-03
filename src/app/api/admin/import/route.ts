import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceClient } from '@/lib/supabase';
import { getEnv } from '@/lib/env';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { parseContactsXlsx } from '@/lib/import-xlsx';
import { EMAIL_REGEX, PHONE_REGEX } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MetaSchema = z.object({
  submissionMethod: z.enum(['paper', 'email']),
  applicantOfficeName: z.string().trim().max(200).optional().default(''),
  applicantName: z.string().trim().min(1).max(100),
  applicantEmail: z.string().trim().regex(EMAIL_REGEX).max(255),
  applicantPhone: z.string().trim().regex(PHONE_REGEX),
  needsNendoKoshin: z.boolean().optional().default(true),
  needsSantei: z.boolean().optional().default(true),
});

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(clientKey(req, 'admin-import'), { windowMs: 60_000, max: 10 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'リクエストが多すぎます' }, { status: 429 });
  }
  // Auth is enforced by middleware (cookie session)

  try {
    const formData = await req.formData();
    const metaStr = formData.get('meta');
    const file = formData.get('file');

    if (typeof metaStr !== 'string') {
      return NextResponse.json({ error: 'meta が不正です' }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Excelファイルが添付されていません' }, { status: 400 });
    }

    const parsed = MetaSchema.safeParse(JSON.parse(metaStr));
    if (!parsed.success) {
      return NextResponse.json({ error: '入力内容に誤りがあります', details: parsed.error.flatten() }, { status: 400 });
    }
    const meta = parsed.data;

    const contacts = await parseContactsXlsx(file);
    if (contacts.length === 0) {
      return NextResponse.json({ error: 'Excelから顧問先データを読み取れませんでした' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data: app, error: appErr } = await supabase
      .from('applications')
      .insert({
        submission_method: meta.submissionMethod,
        applicant_office_name: meta.applicantOfficeName || null,
        applicant_name: meta.applicantName,
        applicant_email: meta.applicantEmail,
        applicant_phone: meta.applicantPhone,
        deadline_acknowledged: false,
        privacy_agreed: true,
        total_contacts: contacts.length,
        status: 'received',
        notes: '管理画面から取り込み（メール/紙経由）',
      })
      .select('id')
      .single();
    if (appErr || !app) {
      return NextResponse.json({ error: appErr?.message ?? 'application insert failed' }, { status: 500 });
    }
    const applicationId = app.id as string;

    const { error: contactErr } = await supabase
      .from('application_contacts')
      .insert(
        contacts.map((c, i) => ({
          application_id: applicationId,
          row_index: i + 1,
          company_name: c.companyName,
          company_name_kana: c.companyNameKana || null,
          employee_count: c.employeeCount ? parseInt(c.employeeCount, 10) || null : null,
          contact_name: c.contactName,
          phone: c.phone,
          email: c.email,
          freee_invited: c.freeeInvited,
          needs_nendo_koshin: meta.needsNendoKoshin,
          needs_santei: meta.needsSantei,
        })),
      );
    if (contactErr) {
      return NextResponse.json({ error: contactErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: applicationId, contactsCount: contacts.length });
  } catch (err) {
    console.error('admin import error', err);
    return NextResponse.json({ error: '取り込みに失敗しました' }, { status: 500 });
  }
}
