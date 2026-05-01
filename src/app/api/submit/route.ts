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

export async function POST(req: NextRequest) {
  let applicationId: string | null = null;
  try {
    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: 'invalid request body' }, { status: 400 });
    }

    const parsed = applicationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const input = parsed.data;

    // 期限ハードガード
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

    const supabase = getServiceClient();

    // 重複送信防止（idempotency）
    if (input.idempotencyKey) {
      const { data: existing } = await supabase
        .from('idempotency_keys')
        .select('application_id, created_at')
        .eq('key', input.idempotencyKey)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ success: true, id: existing.application_id, duplicate: true });
      }
    }

    // 必要に応じたファイル検証
    for (const c of input.contacts) {
      if (!c.needsNendoKoshin && !c.needsSantei) {
        return NextResponse.json({ error: `顧問先#${c.rowIndex} のご依頼内容を選択してください` }, { status: 400 });
      }
      const hasSantei = c.files.some((f) => f.kind === 'santei');
      const hasRoho = c.files.some((f) => f.kind === 'roho');
      if (c.needsSantei && !hasSantei) {
        return NextResponse.json({ error: `顧問先#${c.rowIndex} の算定基礎届がアップロードされていません` }, { status: 400 });
      }
      if (c.needsNendoKoshin && !hasRoho) {
        return NextResponse.json({ error: `顧問先#${c.rowIndex} の労働保険料申告書がアップロードされていません` }, { status: 400 });
      }
    }

    // applications insert
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .insert({
        submission_method: input.submissionMethod,
        form_type: input.formType,
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
          company_name_kana: c.companyNameKana || null,
          employee_count: c.employeeCount ?? null,
          contact_name: c.contactName,
          phone: c.phone,
          email: c.email,
          freee_invited: c.freeeInvited ?? false,
          needs_nendo_koshin: c.needsNendoKoshin,
          needs_santei: c.needsSantei,
        })),
      )
      .select('id, row_index');
    if (contactErr || !insertedContacts) throw contactErr ?? new Error('contacts insert failed');

    const contactIdByRow = new Map<number, string>();
    insertedContacts.forEach((row) => contactIdByRow.set(row.row_index as number, row.id as string));

    // pending → applications/<id>/<contactId>/ に Storage 上で移動
    const fileRecords: Array<{
      contact_id: string;
      file_kind: 'santei' | 'roho';
      storage_path: string;
      original_filename: string;
      mime_type: string | null;
      size_bytes: number;
    }> = [];
    const fileLinks: string[] = [];

    for (const c of input.contacts) {
      const contactId = contactIdByRow.get(c.rowIndex);
      if (!contactId) continue;
      for (const f of c.files) {
        const finalPath = `applications/${applicationId}/${contactId}/${f.kind}_${f.originalFilename.replace(/[^\w.\-_]/g, '_').slice(0, 120)}`;
        const { error: moveErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .move(f.storagePath, finalPath);
        if (moveErr) {
          console.error('storage move error', moveErr, { from: f.storagePath, to: finalPath });
          continue;
        }
        fileRecords.push({
          contact_id: contactId,
          file_kind: f.kind,
          storage_path: finalPath,
          original_filename: f.originalFilename,
          mime_type: f.mimeType ?? null,
          size_bytes: f.sizeBytes,
        });
        const { data: signed } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(finalPath, SIGNED_URL_EXPIRES_SEC);
        if (signed?.signedUrl) {
          const kindLabel = f.kind === 'santei' ? '算定基礎届' : '労働保険料申告書';
          fileLinks.push(`#${c.rowIndex} ${kindLabel}: ${signed.signedUrl}`);
        }
      }
    }

    if (fileRecords.length > 0) {
      const { error: fileErr } = await supabase.from('application_files').insert(fileRecords);
      if (fileErr) throw fileErr;
    }

    // メール送信
    const adminTo = getEnv('ADMIN_NOTIFY_EMAIL') || 'info@spot-s.jp';
    const adminCcRaw = getEnv('ADMIN_NOTIFY_CC');
    const adminCcList = adminCcRaw
      ? adminCcRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const adminCc = adminCcList.length > 0 ? adminCcList : undefined;
    const fallbackTo = adminCcList[0] || 'jamworksfujiki@gmail.com';

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
    try {
      const fallbackCcRaw = getEnv('ADMIN_NOTIFY_CC');
      const fallbackTo =
        (fallbackCcRaw ? fallbackCcRaw.split(',').map((s) => s.trim()).filter(Boolean)[0] : null) ||
        'jamworksfujiki@gmail.com';
      const resend = getResend();
      const detail = err instanceof Error ? `${err.message}\n\n${err.stack ?? ''}` : String(err);
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: [fallbackTo],
        subject: `【緊急】nendosantei-form 送信エラー / ID:${applicationId ?? 'n/a'}`,
        text: [
          'フォーム送信中にエラーが発生しました。Vercel Logs を確認してください。',
          '',
          `受付ID: ${applicationId ?? 'n/a'} (DBに途中まで書き込まれている可能性あり)`,
          `発生時刻: ${new Date().toISOString()}`,
          '',
          '--- エラー詳細 ---',
          detail,
        ].join('\n'),
      });
    } catch (alertErr) {
      console.error('emergency alert failed', alertErr);
    }
    return NextResponse.json({ error: '送信処理に失敗しました。お手数ですが、しばらくしてから再度お試しください。' }, { status: 500 });
  }
}
