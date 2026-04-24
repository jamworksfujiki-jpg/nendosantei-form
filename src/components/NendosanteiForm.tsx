'use client';

import { useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ContactRow, SubmissionMethod } from '@/lib/types';
import { isAfterDeadline, EMAIL_REGEX, PHONE_REGEX } from '@/lib/validation';
import { parseContactsCsv, buildContactRowFromParsed } from '@/lib/csv';
import ContactCard from './ContactCard';
import DeadlineNotice from './DeadlineNotice';
import PriceBadge from './PriceBadge';
import FreeeInviteGuide from './FreeeInviteGuide';
import Footer from './Footer';

const MAX_CONTACTS = 50;

function emptyContact(rowIndex: number): ContactRow {
  return {
    rowIndex,
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
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
  const afterDeadline = useMemo(() => isAfterDeadline(), []);

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
      const parsed = await parseContactsCsv(file);
      if (parsed.length === 0) {
        alert('CSVからデータを読み取れませんでした。テンプレートの形式を確認してください。');
        return;
      }
      const decision = window.confirm(
        `CSVから ${parsed.length} 件読み込みました。\n\n[OK] 既存入力を置き換える\n[キャンセル] 既存入力に追記する`,
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
      if (!c.companyName.trim()) ce.companyName = '紹介会社名を入力してください';
      if (!c.contactName.trim()) ce.contactName = 'ご担当者名を入力してください';
      if (!c.phone.trim()) ce.phone = '電話番号を入力してください';
      else if (!PHONE_REGEX.test(c.phone.trim())) ce.phone = '電話番号の形式が正しくありません';
      if (!c.email.trim()) ce.email = 'メールアドレスを入力してください';
      else if (!EMAIL_REGEX.test(c.email.trim())) ce.email = 'メールアドレスの形式が正しくありません';
      if (!c.santeiFile) ce.santeiFile = '算定基礎届を選択してください';
      if (!c.rohoFile) ce.rohoFile = '労働保険料申告書を選択してください';
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
    setSubmitting(true);
    try {
      const formData = new FormData();
      const payload = {
        submissionMethod: 'form' as const,
        applicantOfficeName: applicantOfficeName.trim(),
        applicantName: applicantName.trim(),
        applicantEmail: applicantEmail.trim(),
        applicantPhone: applicantPhone.trim(),
        deadlineAcknowledged,
        privacyAgreed,
        contacts: contacts.map((c) => ({
          rowIndex: c.rowIndex,
          companyName: c.companyName.trim(),
          contactName: c.contactName.trim(),
          phone: c.phone.trim(),
          email: c.email.trim(),
        })),
      };
      formData.append('payload', JSON.stringify(payload));
      contacts.forEach((c) => {
        if (c.santeiFile) formData.append(`file_${c.rowIndex}_santei`, c.santeiFile);
        if (c.rohoFile) formData.append(`file_${c.rowIndex}_roho`, c.rohoFile);
      });

      const res = await fetch('/api/submit', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '送信に失敗しました');
      router.push('/thanks');
    } catch (err) {
      console.error(err);
      setGlobalError(err instanceof Error ? err.message : '送信に失敗しました');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ヘッダ */}
        <header className="mb-10">
          <div className="flex items-center justify-between mb-8 gap-4">
            <Image
              src="/spot-logo.png"
              alt="スポット社労士くん"
              width={200}
              height={47}
              priority
            />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 px-2.5 py-1 rounded-full border border-slate-300 bg-white tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden></span>
              受付中
            </span>
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <span className="block w-8 h-px bg-slate-900" aria-hidden />
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-[0.22em]">
                ご依頼フォーム
              </span>
              <span className="text-[11px] text-slate-400 tabular-nums">2026年度</span>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-semibold text-slate-900 leading-[1.25] tracking-tight">
              会計事務所様へのご依頼
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
              <span className="text-slate-900 font-medium">年度更新・算定基礎届</span>
              <span className="text-slate-300 mx-2.5" aria-hidden>／</span>
              <span>代行受付フォーム</span>
            </p>
            <div className="mt-6 pt-5 border-t border-slate-200/80 text-[13px] text-slate-500 leading-relaxed">
              スポット社労士くんが、会計事務所様の顧問先の年度更新・算定基礎届を一括で代行いたします。
            </div>
          </div>
        </header>

        {/* 紹介条件 */}
        <section className="bg-white rounded-lg border border-slate-200 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            ご紹介いただける顧問先の条件
          </h2>
          <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center">1</span>
              <span>2025/4/1〜2026/3/31 まで <span className="font-medium text-slate-900">freee人事労務</span> で給与計算を確定し利用している会計事務所の顧問先</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center">2</span>
              <span>役員、パート・アルバイトを含み <span className="font-medium text-slate-900">30名以下</span> の顧問先（年度内で30名を超えたタイミングがあるケースは対象外）</span>
            </li>
          </ul>
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

        {/* 提出方法選択 */}
        <section className="my-8" aria-labelledby="submission-heading">
          <h2 id="submission-heading" className="text-base font-semibold text-slate-900 mb-3">
            提出方法をお選びください
          </h2>
          <div role="radiogroup" aria-labelledby="submission-heading" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { v: 'paper' as const, label: '紙で送付' },
              { v: 'email' as const, label: 'メールで送信' },
              { v: 'form' as const, label: 'フォームから入力' },
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
                    'h-12 px-4 rounded-md border text-sm transition-all text-center ' +
                    (selected
                      ? 'border-blue-600 bg-blue-600 text-white font-medium'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50')
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 紙 */}
        {submissionMethod === 'paper' && (
          <section className="rounded-lg bg-white border border-slate-200 p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">送付先</h3>
            <div className="text-sm text-slate-800 leading-relaxed space-y-1">
              <p className="font-medium text-slate-900">スポット社労士くん社会保険労務士法人　油井 宛</p>
              <p>〒102-0075 東京都千代田区三番町3-8 泉館三番町6F</p>
              <p>TEL: <a href="tel:0362726183" className="text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-900">03-6272-6183</a></p>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              算定基礎届・労働保険料申告書を上記住所までお送りください。
            </p>
          </section>
        )}

        {/* メール */}
        {submissionMethod === 'email' && (
          <section className="rounded-lg bg-white border border-slate-200 p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">送信先メールアドレス</h3>
            <p className="text-lg text-slate-900 font-medium">
              <a href="mailto:yui@spot-s.or.jp" className="underline underline-offset-4 decoration-slate-300 hover:decoration-slate-900">yui@spot-s.or.jp</a>
            </p>
            <p className="mt-3 text-sm text-slate-600">
              算定基礎届・労働保険料申告書を上記アドレスまでメール送信してください。件名に「年度更新・算定基礎届のご依頼」とご記入ください。
            </p>
          </section>
        )}

        {/* フォーム */}
        {submissionMethod === 'form' && (
          <form onSubmit={handleSubmit} noValidate>
            {/* 申込者情報 */}
            <section className="rounded-lg bg-white border border-slate-200 p-5 sm:p-6" aria-labelledby="applicant-heading">
              <h3 id="applicant-heading" className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                ご担当者様情報（会計事務所）
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="ofcname" className="block text-sm font-medium text-slate-700 mb-1.5">会計事務所名</label>
                  <input id="ofcname" type="text" className="input-base" value={applicantOfficeName} onChange={(e) => setApplicantOfficeName(e.target.value)} placeholder="○○会計事務所" autoComplete="organization" />
                </div>
                <div>
                  <label htmlFor="appname" className="block text-sm font-medium text-slate-700 mb-1.5">
                    お名前 <span className="text-red-700">*</span>
                  </label>
                  <input id="appname" type="text" className="input-base" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="山田 太郎" aria-invalid={!!errors.applicantName} autoComplete="name" />
                  {errors.applicantName && <p className="text-sm text-red-700 mt-1">{errors.applicantName}</p>}
                </div>
                <div>
                  <label htmlFor="appphone" className="block text-sm font-medium text-slate-700 mb-1.5">
                    お電話番号 <span className="text-red-700">*</span>
                  </label>
                  <input id="appphone" type="tel" inputMode="tel" className="input-base" value={applicantPhone} onChange={(e) => setApplicantPhone(e.target.value)} placeholder="03-1234-5678" aria-invalid={!!errors.applicantPhone} autoComplete="tel" />
                  {errors.applicantPhone && <p className="text-sm text-red-700 mt-1">{errors.applicantPhone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="appemail" className="block text-sm font-medium text-slate-700 mb-1.5">
                    メールアドレス <span className="text-red-700">*</span>
                  </label>
                  <input id="appemail" type="email" inputMode="email" className="input-base" value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} placeholder="taro@example.com" aria-invalid={!!errors.applicantEmail} autoComplete="email" />
                  {errors.applicantEmail && <p className="text-sm text-red-700 mt-1">{errors.applicantEmail}</p>}
                </div>
              </div>
            </section>

            {/* 顧問先一覧 */}
            <section className="my-6" aria-labelledby="contacts-heading">
              <div className="flex items-baseline justify-between mb-3">
                <h3 id="contacts-heading" className="text-base font-semibold text-slate-900">
                  顧問先情報
                  <span className="ml-2 text-sm font-normal text-slate-500">（最大 50 件）</span>
                </h3>
                <span className="text-sm text-slate-500 tabular-nums">{contacts.length} / {MAX_CONTACTS}</span>
              </div>
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
                  <span className="text-slate-400 ml-0.5">({contacts.length}/{MAX_CONTACTS})</span>
                </button>
                <a href="/csv-template/nendosantei-template.csv" download className="btn-ghost inline-flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>CSVテンプレートをDL</span>
                </a>
                <label className="btn-ghost inline-flex items-center justify-center gap-2 cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <span>CSVから一括入力</span>
                  <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleCsvUpload} />
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                ※ CSVテンプレートをダウンロードして編集 → 一括入力で最大50件まで読み込めます（ファイルは別途各カードに添付してください）
              </p>
            </section>

            <FreeeInviteGuide />

            {/* 同意 */}
            <section className="rounded-lg bg-white border border-slate-200 p-5 sm:p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-slate-900"
                  aria-required="true"
                  aria-invalid={!!errors.privacyAgreed}
                />
                <span className="text-sm text-slate-800 leading-relaxed">
                  <span className="font-medium">個人情報の取り扱いに同意します</span>
                  <span className="block text-xs text-slate-500 mt-1">
                    ご入力いただいた個人情報は、本依頼の遂行および関連連絡のためにのみ使用いたします。詳細は{' '}
                    <a href="https://spot-s.or.jp/privacy/" target="_blank" rel="noopener noreferrer" className="text-slate-700 underline underline-offset-2 hover:text-slate-900">
                      プライバシーポリシー
                    </a>{' '}
                    をご確認ください。
                  </span>
                </span>
              </label>
              {errors.privacyAgreed && <p className="text-sm text-red-700 mt-2">{errors.privacyAgreed}</p>}
            </section>

            {globalError && (
              <div className="my-4 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800" role="alert">
                {globalError}
              </div>
            )}

            <div className="mt-8">
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 sm:h-14 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-base font-medium tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                {submitting ? '送信中…' : 'この内容で送信する'}
              </button>
              <p className="mt-3 text-xs text-center text-slate-500">
                送信後、お申込み内容を {applicantEmail || 'ご登録メール'} 宛にお送りします
              </p>
            </div>
          </form>
        )}

        {!submissionMethod && (
          <p className="mt-6 text-center text-sm text-slate-500">
            上の3択から、ご希望の提出方法をお選びください。
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
