import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getEnv } from '@/lib/env';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function GET(req: NextRequest) {
  const limit = checkRateLimit(clientKey(req, 'admin-email-logs'), { windowMs: 60_000, max: 30 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'リクエストが多すぎます。しばらくしてからお試しください' }, { status: 429 });
  }
  const pw = req.headers.get('x-admin-password') ?? '';
  const expected = getEnv('ADMIN_PASSWORD') ?? '';
  if (!expected || !safeEqual(pw, expected)) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get('status') ?? 'failed';
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('email_logs')
    .select('id, application_id, type, status, error, sent_at')
    .eq('status', status)
    .order('sent_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data });
}
