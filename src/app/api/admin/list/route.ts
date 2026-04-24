import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const PRICE_PER_CONTACT = 9900;

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function GET(req: NextRequest) {
  const pw = req.headers.get('x-admin-password') ?? '';
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!expected || !safeEqual(pw, expected)) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
  }
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id, submission_method, applicant_office_name, applicant_name,
      applicant_email, applicant_phone, total_contacts, status, created_at,
      application_contacts ( row_index, company_name )
    `)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const applications = (data ?? []).map((a) => ({
    ...a,
    application_contacts: (a.application_contacts ?? []).slice().sort(
      (x: { row_index: number }, y: { row_index: number }) => x.row_index - y.row_index,
    ),
  }));

  const totalOrders = applications.length;
  const totalContacts = applications.reduce((sum, a) => sum + (a.total_contacts ?? 0), 0);
  const totalRevenue = totalContacts * PRICE_PER_CONTACT;

  return NextResponse.json({
    applications,
    summary: {
      totalOrders,
      totalContacts,
      totalRevenue,
      pricePerContact: PRICE_PER_CONTACT,
    },
  });
}
