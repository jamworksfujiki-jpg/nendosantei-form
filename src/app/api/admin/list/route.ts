import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(req: NextRequest) {
  const limit = checkRateLimit(clientKey(req, 'admin-list'), { windowMs: 60_000, max: 30 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'リクエストが多すぎます。しばらくしてからお試しください' }, { status: 429 });
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
        id, row_index, company_name, company_name_kana, employee_count,
        contact_name, phone, email, freee_invited,
        needs_nendo_koshin, needs_santei,
        application_files ( id, file_kind, original_filename, size_bytes )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type RawFile = { id: string; file_kind: 'santei' | 'roho' | 'other'; original_filename: string; size_bytes: number };
  type RawContact = {
    id: string;
    row_index: number;
    company_name: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    needs_nendo_koshin?: boolean;
    needs_santei?: boolean;
    application_files?: RawFile[];
  };

  const applications = (data ?? []).map((a) => {
    const contacts = (a.application_contacts ?? []).slice().sort(
      (x: RawContact, y: RawContact) => x.row_index - y.row_index,
    ) as RawContact[];
    const nendoCount = contacts.filter((c) => c.needs_nendo_koshin).length;
    const santeiCount = contacts.filter((c) => c.needs_santei).length;
    const serviceCount = nendoCount + santeiCount;
    const revenue = serviceCount * PRICE_PER_SERVICE;
    return {
      ...a,
      application_contacts: contacts,
      nendo_count: nendoCount,
      santei_count: santeiCount,
      service_count: serviceCount,
      revenue,
    };
  });

  const totalOrders = applications.length;
  const totalContacts = applications.reduce((sum, a) => sum + (a.total_contacts ?? 0), 0);
  const totalNendo = applications.reduce((sum, a) => sum + a.nendo_count, 0);
  const totalSantei = applications.reduce((sum, a) => sum + a.santei_count, 0);
  const totalServices = totalNendo + totalSantei;
  const totalRevenue = totalServices * PRICE_PER_SERVICE;

  return NextResponse.json({
    applications,
    summary: {
      totalOrders,
      totalContacts,
      totalNendo,
      totalSantei,
      totalServices,
      totalRevenue,
      pricePerService: PRICE_PER_SERVICE,
    },
  });
}
