import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, STORAGE_BUCKET } from '@/lib/supabase';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(clientKey(req, 'admin-delete'), { windowMs: 60_000, max: 10 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'リクエストが多すぎます。しばらくしてからお試しください' }, { status: 429 });
  }

  let body: { applicationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 });
  }
  const applicationId = body.applicationId?.trim();
  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: app, error: appErr } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .maybeSingle();
  if (appErr) return NextResponse.json({ error: appErr.message }, { status: 500 });
  if (!app) return NextResponse.json({ error: '該当申込が見つかりません' }, { status: 404 });

  const { data: contacts } = await supabase
    .from('application_contacts')
    .select('id')
    .eq('application_id', applicationId);
  const contactIds = (contacts ?? []).map((c) => c.id);

  let storagePaths: string[] = [];
  if (contactIds.length > 0) {
    const { data: files } = await supabase
      .from('application_files')
      .select('storage_path')
      .in('contact_id', contactIds);
    storagePaths = (files ?? []).map((f) => f.storage_path).filter(Boolean);
  }

  if (storagePaths.length > 0) {
    const { error: rmErr } = await supabase.storage.from(STORAGE_BUCKET).remove(storagePaths);
    if (rmErr) console.error('storage remove (delete) failed', rmErr);
  }

  if (contactIds.length > 0) {
    await supabase.from('application_files').delete().in('contact_id', contactIds);
  }
  await supabase.from('email_logs').delete().eq('application_id', applicationId);
  await supabase.from('application_contacts').delete().eq('application_id', applicationId);
  const { error: delErr } = await supabase.from('applications').delete().eq('id', applicationId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    deleted: {
      application: applicationId,
      contacts: contactIds.length,
      files: storagePaths.length,
    },
  });
}
