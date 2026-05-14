import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { PRICE_PLANS, getPlan, type PlanKey } from '@/lib/plans';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limit = checkRateLimit(clientKey(req, 'admin-list'), { windowMs: 60_000, max: 30 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'リクエストが多すぎます。しばらくしてからお試しください' }, { status: 429 });
  }
  // Auth is enforced by middleware (cookie session)
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id, submission_method, form_type, plan, applicant_office_name, applicant_name,
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

  const applicationsAll = (data ?? []).map((a) => {
    const contacts = (a.application_contacts ?? []).slice().sort(
      (x: RawContact, y: RawContact) => x.row_index - y.row_index,
    ) as RawContact[];
    const nendoCount = contacts.filter((c) => c.needs_nendo_koshin).length;
    const santeiCount = contacts.filter((c) => c.needs_santei).length;
    const serviceCount = nendoCount + santeiCount;
    const planKey = (a.plan ?? 'accountant') as PlanKey;
    const price = getPlan(planKey).priceInclTax;
    const revenue = serviceCount * price;
    return {
      ...a,
      form_type: a.form_type ?? 'firm',
      plan: planKey,
      application_contacts: contacts,
      nendo_count: nendoCount,
      santei_count: santeiCount,
      service_count: serviceCount,
      revenue,
      unit_price: price,
    };
  });

  // 「税理士部分」（accountant プラン= 9,900円）は一旦非表示
  const applications = applicationsAll.filter((a) => a.form_type !== 'firm' && a.plan !== 'accountant');

  function summarize(rows: typeof applicationsAll) {
    const nendo = rows.reduce((sum, a) => sum + a.nendo_count, 0);
    const santei = rows.reduce((sum, a) => sum + a.santei_count, 0);
    const services = nendo + santei;
    const revenue = rows.reduce((sum, a) => sum + a.revenue, 0);
    return {
      totalOrders: rows.length,
      totalContacts: rows.reduce((sum, a) => sum + (a.total_contacts ?? 0), 0),
      totalNendo: nendo,
      totalSantei: santei,
      totalServices: services,
      totalRevenue: revenue,
    };
  }

  const summary = summarize(applications);
  const summarySme = summarize(applicationsAll.filter((a) => a.form_type === 'sme'));
  const summaryByPlan = {
    middle: summarize(applicationsAll.filter((a) => a.plan === 'middle')),
    standard: summarize(applicationsAll.filter((a) => a.plan === 'standard')),
  };

  return NextResponse.json({
    applications,
    summary,
    summaryByFormType: {
      sme: summarySme,
    },
    summaryByPlan,
    plans: PRICE_PLANS,
  });
}
