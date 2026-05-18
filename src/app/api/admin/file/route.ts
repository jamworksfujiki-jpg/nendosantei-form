import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, STORAGE_BUCKET } from '@/lib/supabase';
import { getEnv } from '@/lib/env';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const SIGNED_URL_EXPIRES_SEC = 60 * 60 * 24 * 365;

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function GET(req: NextRequest) {
  const limit = checkRateLimit(clientKey(req, 'admin-file'), { windowMs: 60_000, max: 30 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'リクエストが多すぎます。しばらくしてからお試しください' }, { status: 429 });
  }
  // Auth is enforced by middleware (cookie session)

  const fileId = req.nextUrl.searchParams.get('fileId');
  if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 });

  const supabase = getServiceClient();
  const { data: fileRow, error: fileErr } = await supabase
    .from('application_files')
    .select('storage_path, original_filename')
    .eq('id', fileId)
    .single();
  if (fileErr || !fileRow) {
    return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(fileRow.storage_path, SIGNED_URL_EXPIRES_SEC, {
      download: fileRow.original_filename,
    });
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: '署名URLの生成に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, filename: fileRow.original_filename });
}
