'use client';

import { useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isAfterDeadline, isFormStopped, EMAIL_REGEX, PHONE_REGEX } from '@/lib/validation';
import DeadlineNotice from './DeadlineNotice';
import Footer from './Footer';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
];

function formatBytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / (1024 * 1024)).toFixed(2)}MB`;
}

export default function NendosanteiFormSME() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [companyNameKana, setCompanyNameKana] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [needsNendoKoshin, setNeedsNendoKoshin] = useState(true);
  const [needsSantei, setNeedsSantei] = useState(true);
  const [rohoFile, setRohoFile] = useState<File | null>(null);
  const [santeiFile, setSanteiFile] = useState<File | null>(null);
  const [deadlineAcknowledged, setDeadlineAcknowledged] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>('');
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  const afterDeadline = useMemo(() => isAfterDeadline(), []);
  const formStopped = useMemo(() => isFormStopped(), []);

  function validateFile(f: File | null): string | null {
    if (!f) return null;
    if (!ALLOWED_TYPES.includes(f.type) && !/\.(pdf|xlsx?|png|jpe?g)$/i.test(f.name)) {
      return `対応形式は PDF / Excel / PNG / JPEG です（${f.type || '不明'}）`;
    }
    if (f.size > MAX_FILE_BYTES) {
      return `ファイルサイズが上限（5MB）を超えています：${formatBytes(f.size)}`;
    }
    return null;
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!companyName.trim()) e.companyName = '会社名を入力してください';
    if (!contactName.trim()) e.contactName = 'ご担当者名を入力してください';
    if (!phone.trim()) e.phone = '電話番号を入力してください';
    else if (!PHONE_REGEX.test(phone.trim())) e.phone = '電話番号の形式が正しくありません';
    if (!email.trim()) e.email = 'メールアドレスを入力してください';
    else if (!EMAIL_REGEX.test(email.trim())) e.email = 'メールアドレスの形式が正しくありません';
    if (!needsNendoKoshin && !needsSantei) e.needs = '年度更新または算定基礎届のいずれかを選択してください';
    if (needsNendoKoshin && !rohoFile) e.rohoFile = '労働保険料申告書を選択してください';
    if (needsSantei && !santeiFile) e.santeiFile = '算定基礎届を選択してください';
    if (!privacyAgreed) e.privacyAgreed = '個人情報の取り扱いに同意してください';
    if (afterDeadline && !deadlineAcknowledged) e.deadlineAcknowledged = '期限超過の同意が必要です';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setGlobalError(null);
    if (!validate()) {
      setGlobalError('入力内容にエラーがあります。赤字の項目をご確認ください。');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    try {
      const fileRequests: { rowIndex: number; kind: 'santei' | 'roho'; file: File }[] = [];
      if (needsNendoKoshin && rohoFile) fileRequests.push({ rowIndex: 1, kind: 'roho', file: rohoFile });
      if (needsSantei && santeiFile) fileRequests.push({ rowIndex: 1, kind: 'santei', file: santeiFile });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const tokenRes = await fetch('/api/upload-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: fileRequests.map((f) => ({
            rowIndex: f.rowIndex,
            kind: f.kind,
            filename: f.file.name,
          })),
        }),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenJson.error || 'アップロード許可の取得に失敗しました');
      const tickets: Array<{ rowIndex: number; kind: 'santei' | 'roho'; path: string; token: string; signedUrl: string }> = tokenJson.tickets;

      const uploadedFiles: Array<{ rowIndex: number; kind: 'santei' | 'roho'; storagePath: string; originalFilename: string; sizeBytes: number; mimeType?: string }> = [];
      for (const f of fileRequests) {
        const ticket = tickets.find((t) => t.rowIndex === f.rowIndex && t.kind === f.kind);
        if (!ticket) throw new Error(`チケットが見つかりません: ${f.kind}`);
        const uploadUrl = ticket.signedUrl.startsWith('http')
          ? ticket.signedUrl
          : `${supabaseUrl}${ticket.signedUrl}`;
        const upRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            apikey: supabaseAnon,
            'Content-Type': f.file.type || 'application/octet-stream',
          },
          body: f.file,
        });
        if (!upRes.ok) {
          const errBody = await upRes.text();
          throw new Error(`ファイルアップロード失敗: ${errBody.slice(0, 100)}`);
        }
        uploadedFiles.push({
          rowIndex: f.rowIndex,
          kind: f.kind,
          storagePath: ticket.path,
          originalFilename: f.file.name,
          sizeBytes: f.file.size,
          mimeType: f.file.type || undefined,
        });
      }

      const empNum = employeeCount.trim() ? parseInt(employeeCount, 10) : null;
      const payload = {
        idempotencyKey: idempotencyKeyRef.current,
        submissionMethod: 'form' as const,
        applicantOfficeName: '',
        applicantName: contactName.trim(),
        applicantEmail: email.trim(),
        applicantPhone: phone.trim(),
        deadlineAcknowledged,
        privacyAgreed,
        contacts: [
          {
            rowIndex: 1,
            companyName: companyName.trim(),
            companyNameKana: companyNameKana.trim(),
            employeeCount: empNum != null && !isNaN(empNum) ? empNum : null,
            contactName: contactName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            freeeInvited: false,
            needsNendoKoshin,
            needsSantei,
            files: uploadedFiles.map((f) => ({
              kind: f.kind,
              storagePath: f.storagePath,
              originalFilename: f.originalFilename,
              sizeBytes: f.sizeBytes,
              mimeType: f.mimeType,
            })),
          },
        ],
      };

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '送信に失敗しました');
      router.push('/thanks');
    } catch (err) {
      console.error(err);
      setGlobalError(err instanceof Error ? err.message : '送信に失敗しました');
      setSubmitting(false);
    }
  }

  if (formStopped) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-center">
            <Image src="/spot-logo.png" alt="スポット社労士くん" width={260} height={61} priority className="h-auto" />
          </div>
        </div>
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
          <div className="rounded-lg border-2 border-slate-300 bg-white p-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">本年度の受付は終了しました</h1>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              年度更新・算定基礎届のご依頼受付期間（〜7/10）を終了しました。<br />
              お手数ですが、お電話またはメールにて直接お問い合わせください。
            </p>
            <div className="mt-6 inline-block text-left rounded-md bg-slate-50 border border-slate-200 px-5 py-4 text-sm text-slate-800 leading-relaxed">
              <p className="font-semibold text-slate-900 mb-1">スポット社労士くん社会保険労務士法人</p>
              <p>TEL: <a href="tel:0362726183" className="text-blue-800 underline underline-offset-4">03-6272-6183</a></p>
              <p>メール: <a href="mailto:info@spot-s.jp" className="text-blue-800 underline underline-offset-4">info@spot-s.jp</a></p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-center">
          <Image src="/spot-logo.png" alt="スポット社労士くん" width={260} height={61} priority className="h-auto" />
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-800 to-emerald-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] text-emerald-100 mb-2">
            2026年度　中小企業様向け
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            年度更新・算定基礎届<br className="sm:hidden" />
            <span className="sm:ml-2">ご依頼フォーム</span>
          </h1>
          <p className="mt-3 text-sm text-emerald-100 leading-relaxed">
            スポット社労士くんが、貴社の年度更新（労働保険料申告書）・算定基礎届を代行いたします。
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* 対象条件 */}
        <section className="section-card">
          <div className="section-header">
            <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border-2 border-emerald-700 text-emerald-700 text-[10px] font-bold">
              条件
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">ご利用条件</h2>
              <p className="text-sm text-slate-600 mt-1">以下を満たす中小企業様が対象です</p>
            </div>
          </div>
          <div className="section-body">
            <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">1</span>
                <span>役員・パート・アルバイトを含み <span className="font-semibold text-slate-900">30名以下</span> の企業（年度内で30名を超えたタイミングがあるケースは対象外）</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">2</span>
                <span>労働保険料申告書（緑封筒）／算定基礎届（茶封筒）の<span className="font-semibold text-slate-900">原本またはPDF/画像</span>をご用意いただけること</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 価格 */}
        <div className="my-8">
          <div className="relative rounded-xl border-2 border-emerald-700 bg-gradient-to-br from-emerald-50 via-white to-white px-6 py-9 sm:py-11 text-center shadow-sm">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2">
              <div className="bg-emerald-700 text-white text-sm sm:text-base font-bold tracking-[0.15em] px-6 sm:px-8 py-2.5 rounded-full shadow-md whitespace-nowrap">
                中小企業様向け 特別価格
              </div>
            </div>
            <div className="flex items-baseline justify-center gap-2 text-red-600 mt-2">
              <span className="text-3xl sm:text-4xl font-bold leading-none">各</span>
              <span className="text-6xl sm:text-[88px] font-bold tracking-tight tabular-nums leading-none">9,900</span>
              <span className="text-2xl sm:text-3xl font-bold ml-1">円</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">税込</p>
            <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto">
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <Image src="/envelopes/green-envelope.avif" alt="緑の封筒（年度更新）" width={302} height={400} className="shrink-0 w-14 sm:w-16 h-auto rounded-sm" unoptimized />
                <div>
                  <span className="block font-bold text-slate-900">年度更新</span>
                  <span className="text-xs text-slate-500 block">労働保険料申告書</span>
                  <span className="text-base font-bold text-red-600 tabular-nums">9,900円</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <Image src="/envelopes/brown-envelope.png" alt="茶色の封筒（算定基礎届）" width={1417} height={2111} className="shrink-0 w-14 sm:w-16 h-auto rounded-sm" />
                <div>
                  <span className="block font-bold text-slate-900">算定基礎届</span>
                  <span className="text-xs text-slate-500 block">1社あたり</span>
                  <span className="text-base font-bold text-red-600 tabular-nums">9,900円</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-slate-400">※ 必要なサービスを選択いただけます（両方も可）</p>
          </div>
        </div>

        <DeadlineNotice
          isAfterDeadline={afterDeadline}
          acknowledged={deadlineAcknowledged}
          onAcknowledge={setDeadlineAcknowledged}
        />
        {errors.deadlineAcknowledged && (
          <p className="text-sm text-red-700 -mt-3 mb-3 ml-1">{errors.deadlineAcknowledged}</p>
        )}

        {/* 会計事務所向けへの導線 */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>会計事務所様で複数の顧問先をまとめてご依頼の場合は</span>
          <Link href="/" className="text-emerald-700 font-semibold underline underline-offset-4 hover:text-emerald-900">
            会計事務所様向けフォームへ →
          </Link>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* STEP 1: 会社情報 */}
          <section className="section-card" aria-labelledby="company-heading">
            <div className="section-header">
              <span className="step-badge">
                <span className="step-badge-label">STEP</span>
                <span className="step-badge-number">1</span>
              </span>
              <div>
                <h3 id="company-heading" className="text-base font-bold text-slate-900">
                  貴社の情報
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">ご依頼される会社様の情報をご入力ください</p>
              </div>
            </div>
            <div className="section-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="sm:col-span-2">
                  <label htmlFor="cname" className="block text-sm font-semibold text-slate-800 mb-2">
                    会社名<span className="text-xs font-normal text-slate-500 ml-1">（個人の場合は屋号）</span><span className="badge-required">必須</span>
                  </label>
                  <input id="cname" type="text" className="input-base" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="例）株式会社サンプル" aria-invalid={!!errors.companyName} autoComplete="organization" />
                  {errors.companyName && <p className="text-sm text-red-600 mt-1.5">⚠ {errors.companyName}</p>}
                </div>
                <div>
                  <label htmlFor="ckana" className="block text-sm font-semibold text-slate-800 mb-2">
                    会社名（カナ）<span className="badge-optional">任意</span>
                  </label>
                  <input id="ckana" type="text" className="input-base" value={companyNameKana} onChange={(e) => setCompanyNameKana(e.target.value)} placeholder="例）カブシキガイシャサンプル" />
                </div>
                <div>
                  <label htmlFor="emp" className="block text-sm font-semibold text-slate-800 mb-2">
                    従業員数<span className="text-xs font-normal text-slate-500 ml-1">（役員含む）</span><span className="badge-optional">任意</span>
                  </label>
                  <input id="emp" type="number" inputMode="numeric" min={0} max={10000} className="input-base" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} placeholder="例）5" />
                  <p className="text-xs text-slate-500 mt-1.5">対象は30名以下の企業のみ</p>
                </div>
                <div>
                  <label htmlFor="cname2" className="block text-sm font-semibold text-slate-800 mb-2">
                    ご担当者様 お名前<span className="badge-required">必須</span>
                  </label>
                  <input id="cname2" type="text" className="input-base" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="例）山田 太郎" aria-invalid={!!errors.contactName} autoComplete="name" />
                  {errors.contactName && <p className="text-sm text-red-600 mt-1.5">⚠ {errors.contactName}</p>}
                </div>
                <div>
                  <label htmlFor="cphone" className="block text-sm font-semibold text-slate-800 mb-2">
                    お電話番号<span className="badge-required">必須</span>
                  </label>
                  <input id="cphone" type="tel" inputMode="tel" className="input-base" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="例）03-1234-5678" aria-invalid={!!errors.phone} autoComplete="tel" />
                  {errors.phone && <p className="text-sm text-red-600 mt-1.5">⚠ {errors.phone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="cemail" className="block text-sm font-semibold text-slate-800 mb-2">
                    メールアドレス<span className="badge-required">必須</span>
                  </label>
                  <input id="cemail" type="email" inputMode="email" className="input-base" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="例）taro@example.com" aria-invalid={!!errors.email} autoComplete="email" />
                  <p className="text-xs text-slate-500 mt-1.5">お申込み完了後、確認メールをお送りします</p>
                  {errors.email && <p className="text-sm text-red-600 mt-1.5">⚠ {errors.email}</p>}
                </div>
              </div>
            </div>
          </section>

          {/* STEP 2: ご依頼内容 */}
          <section className="section-card" aria-labelledby="services-heading">
            <div className="section-header">
              <span className="step-badge">
                <span className="step-badge-label">STEP</span>
                <span className="step-badge-number">2</span>
              </span>
              <div>
                <h3 id="services-heading" className="text-base font-bold text-slate-900">
                  ご依頼内容<span className="badge-required">必須</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">必要なサービスを選択し、書類をアップロードしてください</p>
              </div>
            </div>
            <div className="section-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={
                  'flex items-center gap-3 px-4 h-14 rounded-md border-2 cursor-pointer transition-colors ' +
                  (needsNendoKoshin
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/30')
                }>
                  <input
                    type="checkbox"
                    checked={needsNendoKoshin}
                    onChange={(e) => setNeedsNendoKoshin(e.target.checked)}
                    className="h-5 w-5 accent-emerald-700"
                  />
                  <span className="text-sm font-semibold">年度更新</span>
                  <span className="ml-auto text-sm font-bold tabular-nums">¥9,900</span>
                </label>
                <label className={
                  'flex items-center gap-3 px-4 h-14 rounded-md border-2 cursor-pointer transition-colors ' +
                  (needsSantei
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/30')
                }>
                  <input
                    type="checkbox"
                    checked={needsSantei}
                    onChange={(e) => setNeedsSantei(e.target.checked)}
                    className="h-5 w-5 accent-emerald-700"
                  />
                  <span className="text-sm font-semibold">算定基礎届</span>
                  <span className="ml-auto text-sm font-bold tabular-nums">¥9,900</span>
                </label>
              </div>
              {errors.needs && <p className="text-sm text-red-600 mt-2">⚠ {errors.needs}</p>}

              {(needsNendoKoshin || needsSantei) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mt-5 pt-5 border-t border-slate-100">
                  {needsNendoKoshin && (
                    <div>
                      <label htmlFor="rohofile" className="block text-sm font-semibold text-slate-800 mb-2">
                        労働保険料申告書<span className="badge-required">必須</span>
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            id="rohofile"
                            type="file"
                            accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg"
                            className="sr-only"
                            aria-invalid={!!errors.rohoFile}
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              const err = validateFile(f);
                              if (err) {
                                alert(err);
                                e.target.value = '';
                                return;
                              }
                              setRohoFile(f);
                            }}
                          />
                          <span>{rohoFile ? '変更' : 'ファイルを選択'}</span>
                        </label>
                        {rohoFile && (
                          <div className="flex items-center gap-2 text-sm text-slate-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
                            <span className="font-medium truncate max-w-[180px]" title={rohoFile.name}>{rohoFile.name}</span>
                            <span className="text-xs text-slate-500">{formatBytes(rohoFile.size)}</span>
                            <button
                              type="button"
                              onClick={() => setRohoFile(null)}
                              className="text-slate-500 hover:text-red-700 font-bold text-base leading-none px-1 -my-1"
                              aria-label="ファイルを削除"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">対応形式: PDF / Excel / PNG / JPEG（5MBまで）</p>
                      {errors.rohoFile && <p className="text-sm text-red-600 mt-1.5">⚠ {errors.rohoFile}</p>}
                    </div>
                  )}
                  {needsSantei && (
                    <div>
                      <label htmlFor="santeifile" className="block text-sm font-semibold text-slate-800 mb-2">
                        算定基礎届<span className="badge-required">必須</span>
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            id="santeifile"
                            type="file"
                            accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg"
                            className="sr-only"
                            aria-invalid={!!errors.santeiFile}
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              const err = validateFile(f);
                              if (err) {
                                alert(err);
                                e.target.value = '';
                                return;
                              }
                              setSanteiFile(f);
                            }}
                          />
                          <span>{santeiFile ? '変更' : 'ファイルを選択'}</span>
                        </label>
                        {santeiFile && (
                          <div className="flex items-center gap-2 text-sm text-slate-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
                            <span className="font-medium truncate max-w-[180px]" title={santeiFile.name}>{santeiFile.name}</span>
                            <span className="text-xs text-slate-500">{formatBytes(santeiFile.size)}</span>
                            <button
                              type="button"
                              onClick={() => setSanteiFile(null)}
                              className="text-slate-500 hover:text-red-700 font-bold text-base leading-none px-1 -my-1"
                              aria-label="ファイルを削除"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">対応形式: PDF / Excel / PNG / JPEG（5MBまで）</p>
                      {errors.santeiFile && <p className="text-sm text-red-600 mt-1.5">⚠ {errors.santeiFile}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* STEP 3: 同意・送信 */}
          <section className="section-card">
            <div className="section-header">
              <span className="step-badge">
                <span className="step-badge-label">STEP</span>
                <span className="step-badge-number">3</span>
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ご確認・送信<span className="badge-required">必須</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">最後にご確認のうえ送信ください</p>
              </div>
            </div>
            <div className="section-body">
              <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-emerald-700"
                  aria-required="true"
                  aria-invalid={!!errors.privacyAgreed}
                />
                <span className="text-sm text-slate-800 leading-relaxed">
                  <span className="font-semibold">個人情報の取り扱いに同意します</span>
                  <span className="block text-xs text-slate-500 mt-1">
                    ご入力いただいた個人情報は、本依頼の遂行および関連連絡のためにのみ使用いたします。詳細は{' '}
                    <a href="https://spot-s.or.jp/privacy/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900">
                      プライバシーポリシー
                    </a>{' '}
                    をご確認ください。
                  </span>
                </span>
              </label>
              {errors.privacyAgreed && <p className="text-sm text-red-600 mt-2">⚠ {errors.privacyAgreed}</p>}
            </div>
          </section>

          {globalError && (
            <div className="rounded-lg bg-red-50 border-2 border-red-300 p-4 text-sm text-red-800 flex items-start gap-2" role="alert">
              <span className="text-lg">⚠</span>
              <span>{globalError}</span>
            </div>
          )}

          <div className="pt-2">
            <p className="text-center text-sm text-slate-600 mb-3">
              ご入力内容にお間違いがないかご確認のうえ、下のボタンから送信してください
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-14 sm:h-16 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-base sm:text-lg font-bold tracking-wide shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              {submitting ? '送信中…' : '上記の内容で送信する'}
            </button>
            <p className="mt-3 text-xs text-center text-slate-500">
              送信後、お申込み内容を <span className="font-medium text-slate-700">{email || 'ご登録メール'}</span> 宛にお送りします
            </p>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
