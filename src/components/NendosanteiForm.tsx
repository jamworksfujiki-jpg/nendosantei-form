'use client';

import { useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ContactRow, SubmissionMethod } from '@/lib/types';
import { isAfterDeadline, isFormStopped, EMAIL_REGEX, PHONE_REGEX } from '@/lib/validation';
import { parseContactsXlsx, buildContactRowFromParsed } from '@/lib/import-xlsx';
import ContactCard from './ContactCard';
import DeadlineNotice from './DeadlineNotice';
import PriceBadge from './PriceBadge';
import FreeeInviteGuide from './FreeeInviteGuide';
import Footer from './Footer';

const MAX_CONTACTS = 50;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

function emptyContact(rowIndex: number): ContactRow {
  return {
    rowIndex,
    companyName: '',
    companyNameKana: '',
    employeeCount: '',
    contactName: '',
    phone: '',
    email: '',
    freeeInvited: false,
    needsNendoKoshin: true,
    needsSantei: true,
    santeiFile: null,
    rohoFile: null,
  };
}

export default function NendosanteiForm() {
  const router = useRouter();
  const [submissionMethod, setSubmissionMethod] = useState<SubmissionMethod | null>(null);
  const [applicantOfficeName, setApplicantOfficeName] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [contacts, setContacts] = useState<ContactRow[]>([emptyContact(1)]);
  const [deadlineAcknowledged, setDeadlineAcknowledged] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contactErrors, setContactErrors] = useState<Record<number, Record<string, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef<string>('');
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  const afterDeadline = useMemo(() => isAfterDeadline(), []);
  const formStopped = useMemo(() => isFormStopped(), []);

  function addContact() {
    if (contacts.length >= MAX_CONTACTS) return;
    const nextIndex = (contacts[contacts.length - 1]?.rowIndex ?? 0) + 1;
    setContacts((prev) => [...prev, emptyContact(nextIndex)]);
  }

  function updateContact(rowIndex: number, patch: Partial<ContactRow>) {
    setContacts((prev) => prev.map((c) => (c.rowIndex === rowIndex ? { ...c, ...patch } : c)));
  }

  function removeContact(rowIndex: number) {
    setContacts((prev) => (prev.length > 1 ? prev.filter((c) => c.rowIndex !== rowIndex) : prev));
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseContactsXlsx(file);
      if (parsed.length === 0) {
        alert('Excelからデータを読み取れませんでした。テンプレートの形式を確認してください。');
        return;
      }
      const decision = window.confirm(
        `Excelから ${parsed.length} 件読み込みました。\n\n[OK] 既存入力を置き換える\n[キャンセル] 既存入力に追記する`,
      );
      if (decision) {
        setContacts(parsed.map((p, i) => buildContactRowFromParsed(p, i + 1)));
      } else {
        const startIdx = (contacts[contacts.length - 1]?.rowIndex ?? 0) + 1;
        const merged = [...contacts, ...parsed.map((p, i) => buildContactRowFromParsed(p, startIdx + i))];
        setContacts(merged.slice(0, MAX_CONTACTS));
      }
    } catch (err) {
      console.error(err);
      alert('CSVの読み込みに失敗しました');
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const newContactErrors: Record<number, Record<string, string>> = {};

    if (!applicantName.trim()) newErrors.applicantName = 'ご担当者名を入力してください';
    if (!applicantEmail.trim()) newErrors.applicantEmail = 'メールアドレスを入力してください';
    else if (!EMAIL_REGEX.test(applicantEmail.trim())) newErrors.applicantEmail = 'メールアドレスの形式が正しくありません';
    if (!applicantPhone.trim()) newErrors.applicantPhone = '電話番号を入力してください';
    else if (!PHONE_REGEX.test(applicantPhone.trim())) newErrors.applicantPhone = '電話番号の形式が正しくありません';
    if (!privacyAgreed) newErrors.privacyAgreed = '個人情報の取り扱いに同意してください';
    if (afterDeadline && !deadlineAcknowledged) newErrors.deadlineAcknowledged = '期限超過の同意が必要です';

    contacts.forEach((c) => {
      const ce: Record<string, string> = {};
      if (!c.companyName.trim()) ce.companyName = '顧問先様会社名を入力してください';
      if (!c.contactName.trim()) ce.contactName = 'ご担当者名を入力してください';
      if (!c.phone.trim()) ce.phone = '電話番号を入力してください';
      else if (!PHONE_REGEX.test(c.phone.trim())) ce.phone = '電話番号の形式が正しくありません';
      if (!c.email.trim()) ce.email = 'メールアドレスを入力してください';
      else if (!EMAIL_REGEX.test(c.email.trim())) ce.email = 'メールアドレスの形式が正しくありません';
      if (!c.needsNendoKoshin && !c.needsSantei) {
        ce.needsNendoKoshin = '年度更新または算定基礎届のいずれかを選択してください';
      }
      if (c.needsNendoKoshin && !c.rohoFile) ce.rohoFile = '労働保険料申告書を選択してください';
      if (c.needsSantei && !c.santeiFile) ce.santeiFile = '算定基礎届を選択してください';
      if (Object.keys(ce).length > 0) newContactErrors[c.rowIndex] = ce;
    });

    setErrors(newErrors);
    setContactErrors(newContactErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(newContactErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);
    if (submissionMethod !== 'form') return;
    if (!validate()) {
      setGlobalError('入力内容にエラーがあります。赤字の項目をご確認ください。');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const totalBytes = contacts.reduce(
      (sum, c) => sum + (c.santeiFile?.size ?? 0) + (c.rohoFile?.size ?? 0),
      0,
    );
    if (totalBytes > MAX_TOTAL_BYTES) {
      setGlobalError(`添付ファイルの合計サイズが上限（100MB）を超えています：${(totalBytes / (1024 * 1024)).toFixed(1)}MB。件数を分けて送信してください。`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    try {
      // 1) Supabase Storage の signed upload URL を /api/upload-token で取得
      const fileRequests: { rowIndex: number; kind: 'santei' | 'roho'; file: File }[] = [];
      contacts.forEach((c) => {
        if (c.needsNendoKoshin && c.rohoFile) fileRequests.push({ rowIndex: c.rowIndex, kind: 'roho', file: c.rohoFile });
        if (c.needsSantei && c.santeiFile) fileRequests.push({ rowIndex: c.rowIndex, kind: 'santei', file: c.santeiFile });
      });

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

      // 2) 各ファイルを Supabase Storage に直接 PUT
      const uploadedFiles: Array<{ rowIndex: number; kind: 'santei' | 'roho'; storagePath: string; originalFilename: string; sizeBytes: number; mimeType?: string }> = [];
      for (const f of fileRequests) {
        const ticket = tickets.find((t) => t.rowIndex === f.rowIndex && t.kind === f.kind);
        if (!ticket) throw new Error(`チケットが見つかりません: #${f.rowIndex} ${f.kind}`);
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
          throw new Error(`ファイルアップロード失敗 (#${f.rowIndex} ${f.kind}): ${errBody.slice(0, 100)}`);
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

      // 3) JSON のみで /api/submit に申込内容を送信
      const payload = {
        idempotencyKey: idempotencyKeyRef.current,
        submissionMethod: 'form' as const,
        applicantOfficeName: applicantOfficeName.trim(),
        applicantName: applicantName.trim(),
        applicantEmail: applicantEmail.trim(),
        applicantPhone: applicantPhone.trim(),
        deadlineAcknowledged,
        privacyAgreed,
        contacts: contacts.map((c) => {
          const empNum = c.employeeCount.trim() ? parseInt(c.employeeCount, 10) : null;
          return {
            rowIndex: c.rowIndex,
            companyName: c.companyName.trim(),
            companyNameKana: c.companyNameKana.trim(),
            employeeCount: empNum != null && !isNaN(empNum) ? empNum : null,
            contactName: c.contactName.trim(),
            phone: c.phone.trim(),
            email: c.email.trim(),
            freeeInvited: c.freeeInvited,
            needsNendoKoshin: c.needsNendoKoshin,
            needsSantei: c.needsSantei,
            files: uploadedFiles.filter((f) => f.rowIndex === c.rowIndex).map((f) => ({
              kind: f.kind,
              storagePath: f.storagePath,
              originalFilename: f.originalFilename,
              sizeBytes: f.sizeBytes,
              mimeType: f.mimeType,
            })),
          };
        }),
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
            <Image
              src="/spot-logo.png"
              alt="スポット社労士くん"
              width={260}
              height={61}
              priority
              className="h-auto"
            />
          </div>
        </div>
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
          <div className="rounded-lg border-2 border-slate-300 bg-white p-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              本年度の受付は終了しました
            </h1>
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
      {/* 上部ロゴバー */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-center">
          <Image
            src="/spot-logo.png"
            alt="スポット社労士くん"
            width={260}
            height={61}
            priority
            className="h-auto"
          />
        </div>
      </div>

      {/* タイトルバナー */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-800 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] text-blue-100 mb-2">
            2026年度　会計事務所様向け
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            年度更新・算定基礎届<br className="sm:hidden" />
            <span className="sm:ml-2">ご依頼フォーム</span>
          </h1>
          <p className="mt-3 text-sm text-blue-100 leading-relaxed">
            スポット社労士くんが、会計事務所様の顧問先の年度更新・算定基礎届を一括で代行いたします。
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

        {/* 紹介条件 */}
        <section className="section-card">
          <div className="section-header">
            <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border-2 border-blue-800 text-blue-800 text-[10px] font-bold">
              条件
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                ご紹介いただける顧問先の条件
              </h2>
              <p className="text-sm text-slate-600 mt-1">以下すべてを満たす顧問先様が対象です</p>
            </div>
          </div>
          <div className="section-body">
            <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-800 text-white text-xs font-bold flex items-center justify-center">1</span>
                <span>2025/4/1〜2026/3/31 まで <span className="font-semibold text-slate-900">freee人事労務</span> で給与計算を確定し利用している会計事務所の顧問先</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-800 text-white text-xs font-bold flex items-center justify-center">2</span>
                <span>役員、パート・アルバイトを含み <span className="font-semibold text-slate-900">30名以下</span> の顧問先（年度内で30名を超えたタイミングがあるケースは対象外）</span>
              </li>
            </ul>
          </div>
        </section>

        <PriceBadge />
        <DeadlineNotice
          isAfterDeadline={afterDeadline}
          acknowledged={deadlineAcknowledged}
          onAcknowledge={setDeadlineAcknowledged}
        />
        {errors.deadlineAcknowledged && (
          <p className="text-sm text-red-700 -mt-3 mb-3 ml-1">{errors.deadlineAcknowledged}</p>
        )}

        {/* STEP 1: 提出方法選択 */}
        <section className="section-card" aria-labelledby="submission-heading">
          <div className="section-header">
            <span className="step-badge">
              <span className="step-badge-label">STEP</span>
              <span className="step-badge-number">1</span>
            </span>
            <div>
              <h2 id="submission-heading" className="text-base font-bold text-slate-900">
                提出方法を選択<span className="badge-required">必須</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">ご希望の提出方法をお選びください</p>
            </div>
          </div>
          <div className="section-body">
            <div role="radiogroup" aria-labelledby="submission-heading" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                { v: 'paper' as const, label: '紙で送付', desc: '郵送・FAX' },
                { v: 'email' as const, label: 'メールで送信', desc: '添付で送る' },
                { v: 'form' as const, label: 'フォームから入力', desc: 'このフォームで完結' },
              ]).map((opt) => {
                const selected = submissionMethod === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSubmissionMethod(opt.v)}
                    className={
                      'h-auto min-h-[72px] px-4 py-3 rounded-lg border-2 transition-all text-center ' +
                      (selected
                        ? 'border-blue-800 bg-blue-50 text-blue-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/30')
                    }
                  >
                    <span className="block text-sm font-semibold">{opt.label}</span>
                    <span className="block text-[11px] mt-0.5 opacity-70">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
            {!submissionMethod && (
              <p className="mt-3 text-xs text-slate-500 text-center">
                上の3つから、ご希望の提出方法をお選びください
              </p>
            )}
          </div>
        </section>

        {/* 紙 */}
        {submissionMethod === 'paper' && (
          <section className="section-card">
            <div className="section-header">
              <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border-2 border-slate-400 text-slate-600 text-[10px] font-bold">
                送付先
              </span>
              <h3 className="text-base font-bold text-slate-900">郵送先のご案内</h3>
            </div>
            <div className="section-body">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-800 leading-relaxed space-y-1.5">
                <p className="font-semibold text-slate-900">スポット社労士くん社会保険労務士法人　油井 宛</p>
                <p>〒102-0075 東京都千代田区三番町3-8 泉館三番町6F</p>
                <p>TEL: <a href="tel:0362726183" className="text-blue-700 underline underline-offset-4 decoration-blue-300 hover:decoration-blue-900 font-medium">03-6272-6183</a></p>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                算定基礎届・労働保険料申告書を上記住所までお送りください。
              </p>
            </div>
          </section>
        )}

        {/* メール */}
        {submissionMethod === 'email' && (
          <section className="section-card">
            <div className="section-header">
              <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border-2 border-slate-400 text-slate-600 text-[10px] font-bold">
                送信先
              </span>
              <h3 className="text-base font-bold text-slate-900">メール送信先のご案内</h3>
            </div>
            <div className="section-body">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-lg sm:text-xl text-slate-900 font-semibold">
                  <a href="mailto:yui@100ten.co.jp" className="text-blue-700 underline underline-offset-4 decoration-blue-300 hover:decoration-blue-900">yui@100ten.co.jp</a>
                </p>
              </div>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                算定基礎届・労働保険料申告書を上記アドレスまでメール送信してください。<br />
                件名に<span className="font-semibold text-slate-900">「年度更新・算定基礎届のご依頼」</span>とご記入ください。
              </p>
            </div>
          </section>
        )}

        {/* フォーム */}
        {submissionMethod === 'form' && (
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* STEP 2: ご担当者様情報 */}
            <section className="section-card" aria-labelledby="applicant-heading">
              <div className="section-header">
                <span className="step-badge">
                  <span className="step-badge-label">STEP</span>
                  <span className="step-badge-number">2</span>
                </span>
                <div>
                  <h3 id="applicant-heading" className="text-base font-bold text-slate-900">
                    ご担当者様情報
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">会計事務所のご担当者様の情報をご入力ください</p>
                </div>
              </div>
              <div className="section-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="sm:col-span-2">
                    <label htmlFor="ofcname" className="block text-sm font-semibold text-slate-800 mb-2">
                      会計事務所名<span className="badge-optional">任意</span>
                    </label>
                    <input id="ofcname" type="text" className="input-base" value={applicantOfficeName} onChange={(e) => setApplicantOfficeName(e.target.value)} placeholder="例）○○会計事務所" autoComplete="organization" />
                  </div>
                  <div>
                    <label htmlFor="appname" className="block text-sm font-semibold text-slate-800 mb-2">
                      ご担当者様 お名前<span className="badge-required">必須</span>
                    </label>
                    <input id="appname" type="text" className="input-base" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="例）山田 太郎" aria-invalid={!!errors.applicantName} autoComplete="name" />
                    {errors.applicantName && <p className="text-sm text-red-600 mt-1.5">⚠ {errors.applicantName}</p>}
                  </div>
                  <div>
                    <label htmlFor="appphone" className="block text-sm font-semibold text-slate-800 mb-2">
                      お電話番号<span className="badge-required">必須</span>
                    </label>
                    <input id="appphone" type="tel" inputMode="tel" className="input-base" value={applicantPhone} onChange={(e) => setApplicantPhone(e.target.value)} placeholder="例）03-1234-5678" aria-invalid={!!errors.applicantPhone} autoComplete="tel" />
                    {errors.applicantPhone && <p className="text-sm text-red-600 mt-1.5">⚠ {errors.applicantPhone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="appemail" className="block text-sm font-semibold text-slate-800 mb-2">
                      メールアドレス<span className="badge-required">必須</span>
                    </label>
                    <input id="appemail" type="email" inputMode="email" className="input-base" value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} placeholder="例）taro@example.com" aria-invalid={!!errors.applicantEmail} autoComplete="email" />
                    <p className="text-xs text-slate-500 mt-1.5">お申込み完了後、確認メールをお送りします</p>
                    {errors.applicantEmail && <p className="text-sm text-red-600 mt-1.5">⚠ {errors.applicantEmail}</p>}
                  </div>
                </div>
              </div>
            </section>

            {/* STEP 3: 顧問先情報 */}
            <section className="section-card" aria-labelledby="contacts-heading">
              <div className="section-header">
                <span className="step-badge">
                  <span className="step-badge-label">STEP</span>
                  <span className="step-badge-number">3</span>
                </span>
                <div className="flex-1">
                  <h3 id="contacts-heading" className="text-base font-bold text-slate-900">
                    顧問先情報<span className="badge-required">必須</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">ご依頼される顧問先様の情報を入力（最大50件）</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-full px-3 py-1 tabular-nums">
                  {contacts.length} / {MAX_CONTACTS}
                </span>
              </div>
              <div className="section-body">
                <div className="space-y-3">
                  {contacts.map((c, idx) => (
                    <ContactCard
                      key={c.rowIndex}
                      contact={c}
                      index={idx}
                      total={contacts.length}
                      onUpdate={updateContact}
                      onRemove={removeContact}
                      errors={contactErrors[c.rowIndex] as Partial<Record<keyof ContactRow, string>> | undefined}
                    />
                  ))}
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={addContact}
                    disabled={contacts.length >= MAX_CONTACTS}
                    className="btn-secondary inline-flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>顧問先を追加</span>
                  </button>
                  <a href="/templates/nendosantei-template.xlsx" download className="btn-ghost inline-flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>Excelテンプレートをダウンロード</span>
                  </a>
                  <label className="btn-ghost inline-flex items-center justify-center gap-2 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <span>Excelから一括入力</span>
                    <input ref={csvInputRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="sr-only" onChange={handleCsvUpload} />
                  </label>
                </div>
                <p className="mt-2.5 text-xs text-slate-500 leading-relaxed">
                  ※ Excelテンプレートをダウンロードして編集 → 一括入力で最大50件まで読み込めます（ファイルは別途各カードに添付してください）
                </p>
              </div>
            </section>

            <FreeeInviteGuide />

            {/* STEP 4: 同意・送信 */}
            <section className="section-card">
              <div className="section-header">
                <span className="step-badge">
                  <span className="step-badge-label">STEP</span>
                  <span className="step-badge-number">4</span>
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ご確認・送信<span className="badge-required">必須</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">最後にご確認のうえ送信ください</p>
                </div>
              </div>
              <div className="section-body">
                <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    className="mt-0.5 h-5 w-5 accent-blue-800"
                    aria-required="true"
                    aria-invalid={!!errors.privacyAgreed}
                  />
                  <span className="text-sm text-slate-800 leading-relaxed">
                    <span className="font-semibold">個人情報の取り扱いに同意します</span>
                    <span className="block text-xs text-slate-500 mt-1">
                      ご入力いただいた個人情報は、本依頼の遂行および関連連絡のためにのみ使用いたします。詳細は{' '}
                      <a href="https://spot-s.or.jp/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">
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
                className="w-full h-14 sm:h-16 rounded-lg bg-blue-800 hover:bg-blue-900 text-white text-base sm:text-lg font-bold tracking-wide shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 focus-visible:ring-offset-2"
              >
                {submitting ? '送信中…' : '上記の内容で送信する'}
              </button>
              <p className="mt-3 text-xs text-center text-slate-500">
                送信後、お申込み内容を <span className="font-medium text-slate-700">{applicantEmail || 'ご登録メール'}</span> 宛にお送りします
              </p>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
