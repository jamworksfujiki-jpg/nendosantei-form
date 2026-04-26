import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getServiceClient, STORAGE_BUCKET } from '@/lib/supabase';
import { applicationSchema } from '@/lib/validation';
import { buildThanksEmail, buildAdminNotifyEmail, FROM_ADDRESS, REPLY_TO } from '@/lib/email-templates';
import { getEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SIGNED_URL_EXPIRES_SEC = 60 * 60 * 24 * 30;

function getResend() {
  const key = getEnv('RESEND_API_KEY', { required: true });
  return new Resend(key);
}

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function safeFilename(name: string) {
  return name.replace(/[^\w.\-_]/g, '_').slice(0, 120);
}

export async function POST(req: NextRequest) {
  let applicationId: string | null = null;
  try {
    const formData = await req.formData();
    const payloadStr = formData.get('payload');
    if (typeof payloadStr !== 'string') {
      return NextResponse.json({ error: 'payloadが見つかりません' }, { status: 400 });
    }

    const parsed = applicationSchema.safeParse(JSON.parse(payloadStr));
    if (!parsed.success) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const input = parsed.data;

    // 期限ハードガード: FORM_HARD_DEADLINE 以降または FORM_ENABLED=false なら拒否
    const hardDeadline = getEnv('FORM_HARD_DEADLINE');
    if (hardDeadline) {
      const limit = new Date(hardDeadline).getTime();
      if (!isNaN(limit) && Date.now() > limit) {
        return NextResponse.json({ error: '受付期間を終了しました。お手数ですが、お電話（03-6272-6183）にてお問い合わせください。' }, { status: 410 });
      }
    }
    if (getEnv('FORM_ENABLED') === 'false') {
      return NextResponse.json({ error: '現在受付を停止しています。お手数ですが、お電話（03-6272-6183）にてお問い合わせください。' }, { status: 410 });
    }

    // 重複送信防止（idempotency）
    const supabaseEarly = getServiceClient();
    if (input.idempotencyKey) {
      const { data: existing } = await supabaseEarly
        .from('idempotency_keys')
        .select('application_id, created_at')
        .eq('key', input.idempotencyKey)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ success: true, id: existing.application_id, duplicate: true });
      }
    }

    // ファイル取得＆検証（需要に応じた条件付き必須）
    type IncomingFile = { rowIndex: number; kind: 'santei' | 'roho'; file: File };
    const files: IncomingFile[] = [];
    for (const c of input.contacts) {
      if (!c.needsNendoKoshin && !c.needsSantei) {
        return NextResponse.json({ error: `顧問先#${c.rowIndex} のご依頼内容を選択してください` }, { status: 400 });
      }
      const santei = formData.get(`file_${c.rowIndex}_santei`);
      const roho = formData.get(`file_${c.rowIndex}_roho`);
      if (c.needsSantei) {
        if (!(santei instanceof File) || santei.size === 0) {
          return NextResponse.json({ error: `顧問先#${c.rowIndex} の算定基礎届が添付されていません` }, { status: 400 });
        }
      }
      if (c.needsNendoKoshin) {
        if (!(roho instanceof File) || roho.size === 0) {
          return NextResponse.json({ error: `顧問先#${c.rowIndex} の労働保険料申告書が添付されていません` }, { status: 400 });
        }
      }
      const toValidate: File[] = [];
      if (c.needsSantei && santei instanceof File) toValidate.push(santei);
      if (c.needsNendoKoshin && roho instanceof File) toValidate.push(roho);
      for (const f of toValidate) {
        if (f.size > MAX_FILE_BYTES) {
          return NextResponse.json({ error: `ファイル ${f.name} が5MBを超えています` }, { status: 400 });
        }
        if (f.type && !ALLOWED_MIME.has(f.type) && !/\.(pdf|xlsx?|png|jpe?g)$/i.test(f.name)) {
          return NextResponse.json({ error: `ファイル ${f.name} の形式が対応していません` }, { status: 400 });
        }
      }
      if (c.needsSantei && santei instanceof File) files.push({ rowIndex: c.rowIndex, kind: 'santei', file: santei });
      if (c.needsNendoKoshin && roho instanceof File) files.push({ rowIndex: c.rowIndex, kind: 'roho', file: roho });
    }

    const supabase = supabaseEarly;

    // applications insert
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .insert({
        submission_method: input.submissionMethod,
        applicant_office_name: input.applicantOfficeName || null,
        applicant_name: input.applicantName,
        applicant_email: input.applicantEmail,
        applicant_phone: input.applicantPhone,
        deadline_acknowledged: input.deadlineAcknowledged,
        privacy_agreed: input.privacyAgreed,
        total_contacts: input.contacts.length,
        status: 'received',
      })
      .select('id')
      .single();
    if (appErr || !app) throw appErr ?? new Error('application insert failed');
    applicationId = app.id as string;

    // contacts insert
    const { data: insertedContacts, error: contactErr } = await supabase
      .from('application_contacts')
      .insert(
        input.contacts.map((c) => ({
          application_id: applicationId,
          row_index: c.rowIndex,
          company_name: c.companyName,
          contact_name: c.contactName,
          phone: c.phone,
          email: c.email,
          needs_nendo_koshin: c.needsNendoKoshin,
          needs_santei: c.needsSantei,
        })),
      )
      .select('id, row_index');
    if (contactErr || !insertedContacts) throw contactErr ?? new Error('contacts insert failed');

    const contactIdByRow = new Map<number, string>();
    insertedContacts.forEach((row) => contactIdByRow.set(row.row_index as number, row.id as string));

    // ファイルアップロード
    const fileRecords: Array<{
      contact_id: string;
      file_kind: 'santei' | 'roho';
      storage_path: string;
      original_filename: string;
      mime_type: string | null;
      size_bytes: number;
    }> = [];
    const fileLinks: string[] = [];

    for (const f of files) {
      const contactId = contactIdByRow.get(f.rowIndex);
      if (!contactId) continue;
      const safeName = safeFilename(f.file.name);
      const storagePath = `applications/${applicationId}/${contactId}/${f.kind}_${safeName}`;
      const arrayBuf = await f.file.arrayBuffer();
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, arrayBuf, {
          contentType: f.file.type || 'application/octet-stream',
          upsert: false,
        });
      if (upErr) throw upErr;
      fileRecords.push({
        contact_id: contactId,
        file_kind: f.kind,
        storage_path: storagePath,
        original_filename: f.file.name,
        mime_type: f.file.type || null,
        size_bytes: f.file.size,
      });
      const { data: signed } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRES_SEC);
      if (signed?.signedUrl) {
        const kindLabel = f.kind === 'santei' ? '算定基礎届' : '労働保険料申告書';
        fileLinks.push(`#${f.rowIndex} ${kindLabel}: ${signed.signedUrl}`);
      }
    }

    if (fileRecords.length > 0) {
      const { error: fileErr } = await supabase.from('application_files').insert(fileRecords);
      if (fileErr) throw fileErr;
    }

    // メール送信
    const adminTo = getEnv('ADMIN_NOTIFY_EMAIL') || 'info@spot-s.jp';
    const adminCcRaw = getEnv('ADMIN_NOTIFY_CC');
    const adminCc = adminCcRaw ? [adminCcRaw] : undefined;
    const fallbackTo = getEnv('ADMIN_NOTIFY_CC') || 'jamworksfujiki@gmail.com';

    const resend = getResend();

    async function sendFailureAlert(failedType: string, originalError: unknown, ctxLines: string[]) {
      try {
        const errMsg = originalError instanceof Error ? originalError.message : String(originalError);
        await resend.emails.send({
          from: FROM_ADDRESS,
          to: [fallbackTo],
          subject: `【要確認】nendosantei-form ${failedType} 送信失敗 / ID:${applicationId ?? 'n/a'}`,
          text: [
            'メール送信が失敗しました。Supabase email_logs と Vercel ログをご確認ください。',
            '',
            `失敗した送信種別: ${failedType}`,
            `受付ID: ${applicationId ?? 'n/a'}`,
            `エラー: ${errMsg}`,
            '',
            '--- 申込内容 ---',
            ...ctxLines,
          ].join('\n'),
        });
      } catch (alertErr) {
        console.error('fallback alert email failed', alertErr);
      }
    }

    // サンクスメール
    try {
      const { subject, text } = buildThanksEmail(input);
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: [input.applicantEmail],
        replyTo: REPLY_TO,
        subject,
        text,
      });
      await supabase.from('email_logs').insert({
        application_id: applicationId,
        type: 'thanks',
        status: 'sent',
      });
    } catch (e) {
      console.error('thanks email failed', e);
      await supabase.from('email_logs').insert({
        application_id: applicationId,
        type: 'thanks',
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      });
      await sendFailureAlert('サンクスメール', e, [
        `宛先: ${input.applicantEmail}`,
        `事務所名: ${input.applicantOfficeName || '(未入力)'}`,
        `担当者: ${input.applicantName}`,
        `件数: ${input.contacts.length}件`,
      ]);
    }

    // 内部通知メール
    try {
      const { subject, text } = buildAdminNotifyEmail(input, applicationId, fileLinks);
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: [adminTo],
        cc: adminCc,
        replyTo: input.applicantEmail,
        subject,
        text,
      });
      await supabase.from('email_logs').insert({
        application_id: applicationId,
        type: 'admin_notify',
        status: 'sent',
      });
    } catch (e) {
      console.error('admin notify email failed', e);
      await supabase.from('email_logs').insert({
        application_id: applicationId,
        type: 'admin_notify',
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      });
      await sendFailureAlert('管理者通知メール', e, [
        `事務所名: ${input.applicantOfficeName || '(未入力)'}`,
        `担当者: ${input.applicantName} / ${input.applicantEmail} / ${input.applicantPhone}`,
        `件数: ${input.contacts.length}件`,
      ]);
    }

    // idempotency 記録（成功時のみ）
    if (input.idempotencyKey && applicationId) {
      await supabase.from('idempotency_keys').insert({
        key: input.idempotencyKey,
        application_id: applicationId,
      }).then(() => undefined, (err) => console.error('idempotency insert failed', err));
    }

    return NextResponse.json({ success: true, id: applicationId });
  } catch (err) {
    console.error('submit error', err);
    return NextResponse.json({ error: '送信処理に失敗しました。お手数ですが、しばらくしてから再度お試しください。' }, { status: 500 });
  }
}
