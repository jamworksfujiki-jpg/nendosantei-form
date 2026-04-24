'use client';

import { useMemo, useState, useRef } from 'react';
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
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ヘッダ */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#298ef2] text-white flex items-center justify-center font-bold text-lg shadow-md">
              S
            </div>
            <span className="text-sm text-gray-500 font-medium">スポット社労士くん</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            【会計事務所様へのご依頼】
          </h1>
          <p className="text-base sm:text-lg text-gray-700 mt-2 font-medium">
            年度更新・算定基礎届 代行受付フォーム
          </p>
        </header>

        {/* 紹介条件 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <span aria-hidden>📋</span>
            ご紹介いただける顧問先の条件
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-700 leading-relaxed">
            <li className="flex gap-2">
              <span className="font-bold text-[#298ef2] shrink-0">①</span>
              <span>2025/4/1〜2026/3/31 まで <strong>freee人事労務</strong> で給与計算を確定し利用している会計事務所の顧問先</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#298ef2] shrink-0">②</span>
              <span>役員、パート・アルバイトを含み <strong>30名以下</strong> の顧問先（年度内で30名を超えたタイミングがあるケースは対象外）</span>
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
          <p className="text-sm text-red-600 -mt-3 mb-3 ml-1">{errors.deadlineAcknowledged}</p>
        )}

        {/* 提出方法選択 */}
        <section className="my-8" aria-labelledby="submission-heading">
          <h2 id="submission-heading" className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
            提出方法をお選びください
          </h2>
          <div role="radiogroup" aria-labelledby="submission-heading" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { v: 'paper' as const, label: '紙で当社に送付', icon: '✉️' },
              { v: 'email' as const, label: 'メールで送信', icon: '📧' },
              { v: 'form' as const, label: 'フォームから入力', icon: '📝' },
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
                    'h-auto min-h-[88px] px-4 py-4 rounded-2xl border-2 text-left transition-all ' +
                    (selected
                      ? 'border-[#298ef2] bg-[#e7f1fb] shadow-md'
                      : 'border-gray-200 bg-white hover:border-[#298ef2]/50 hover:bg-gray-50')
                  }
                >
                  <div className="text-2xl mb-1" aria-hidden>{opt.icon}</div>
                  <div className={'font-semibold ' + (selected ? 'text-[#1d6fc4]' : 'text-gray-900')}>
                    {opt.label}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 紙 */}
        {submissionMethod === 'paper' && (
          <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-3">送付先</h3>
            <div className="text-sm text-gray-800 leading-relaxed space-y-1">
              <p className="font-semibold">スポット社労士くん社会保険労務士法人　油井 宛</p>
              <p>〒102-0075 東京都千代田区三番町3-8 泉館三番町6F</p>
              <p>TEL: <a href="tel:0362726183" className="text-[#298ef2] hover:underline">03-6272-6183</a></p>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              算定基礎届・労働保険料申告書を上記住所までお送りください。
            </p>
          </section>
        )}

        {/* メール */}
        {submissionMethod === 'email' && (
          <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-3">送信先メールアドレス</h3>
            <p className="text-lg text-[#298ef2] font-semibold">
              <a href="mailto:yui@spot-s.or.jp" className="hover:underline">yui@spot-s.or.jp</a>
            </p>
            <p className="mt-3 text-sm text-gray-600">
              算定基礎届・労働保険料申告書を上記アドレスまでメール送信してください。件名に「年度更新・算定基礎届のご依頼」とご記入ください。
            </p>
          </section>
        )}

        {/* フォーム */}
        {submissionMethod === 'form' && (
          <form onSubmit={handleSubmit} noValidate>
            {/* 申込者情報 */}
            <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 shadow-sm" aria-labelledby="applicant-heading">
              <h3 id="applicant-heading" className="text-base sm:text-lg font-bold text-gray-900 mb-4">
                ご担当者様情報（会計事務所）
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="ofcname" className="block text-sm font-medium text-gray-700 mb-1">会計事務所名</label>
                  <input id="ofcname" type="text" className="input-base" value={applicantOfficeName} onChange={(e) => setApplicantOfficeName(e.target.value)} placeholder="○○会計事務所" autoComplete="organization" />
                </div>
                <div>
                  <label htmlFor="appname" className="block text-sm font-medium text-gray-700 mb-1">
                    お名前 <span className="text-red-600">*</span>
                  </label>
                  <input id="appname" type="text" className="input-base" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="山田 太郎" aria-invalid={!!errors.applicantName} autoComplete="name" />
                  {errors.applicantName && <p className="text-sm text-red-600 mt-1">{errors.applicantName}</p>}
                </div>
                <div>
                  <label htmlFor="appphone" className="block text-sm font-medium text-gray-700 mb-1">
                    お電話番号 <span className="text-red-600">*</span>
                  </label>
                  <input id="appphone" type="tel" inputMode="tel" className="input-base" value={applicantPhone} onChange={(e) => setApplicantPhone(e.target.value)} placeholder="03-1234-5678" aria-invalid={!!errors.applicantPhone} autoComplete="tel" />
                  {errors.applicantPhone && <p className="text-sm text-red-600 mt-1">{errors.applicantPhone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="appemail" className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス <span className="text-red-600">*</span>
                  </label>
                  <input id="appemail" type="email" inputMode="email" className="input-base" value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} placeholder="taro@example.com" aria-invalid={!!errors.applicantEmail} autoComplete="email" />
                  {errors.applicantEmail && <p className="text-sm text-red-600 mt-1">{errors.applicantEmail}</p>}
                </div>
              </div>
            </section>

            {/* 顧問先一覧 */}
            <section className="my-6" aria-labelledby="contacts-heading">
              <div className="flex items-baseline justify-between mb-3">
                <h3 id="contacts-heading" className="text-base sm:text-lg font-bold text-gray-900">
                  顧問先情報（最大 50 件）
                </h3>
                <span className="text-sm text-gray-500 font-medium">{contacts.length} / {MAX_CONTACTS}</span>
              </div>
              <div className="space-y-4">
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
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={addContact}
                  disabled={contacts.length >= MAX_CONTACTS}
                  className="btn-secondary"
                >
                  + 顧問先を追加 ({contacts.length}/{MAX_CONTACTS})
                </button>
                <a href="/csv-template/nendosantei-template.csv" download className="btn-ghost text-center">
                  📥 CSVテンプレDL
                </a>
                <label className="btn-ghost text-center cursor-pointer">
                  📤 CSV一括UP
                  <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleCsvUpload} />
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                ※ CSVテンプレートをダウンロードして編集 → 一括UPで最大50件をまとめて入力できます（ファイルは別途各カードに添付してください）
              </p>
            </section>

            <FreeeInviteGuide />

            {/* 同意 */}
            <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 shadow-sm">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-[#298ef2]"
                  aria-required="true"
                  aria-invalid={!!errors.privacyAgreed}
                />
                <span className="text-sm text-gray-800 leading-relaxed">
                  <strong>個人情報の取り扱いに同意します</strong>
                  <span className="block text-xs text-gray-600 mt-1">
                    ご入力いただいた個人情報は、本依頼の遂行および関連連絡のためにのみ使用いたします。詳細は{' '}
                    <a href="https://spot-s.or.jp/privacy/" target="_blank" rel="noopener noreferrer" className="text-[#298ef2] hover:underline">
                      プライバシーポリシー
                    </a>{' '}
                    をご確認ください。
                  </span>
                </span>
              </label>
              {errors.privacyAgreed && <p className="text-sm text-red-600 mt-2">{errors.privacyAgreed}</p>}
            </section>

            {globalError && (
              <div className="my-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800" role="alert">
                {globalError}
              </div>
            )}

            <div className="mt-8">
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 sm:h-16 rounded-2xl bg-[#298ef2] hover:bg-[#1d6fc4] text-white text-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-[#298ef2]/30"
              >
                {submitting ? '送信中…' : 'この内容で送信する'}
              </button>
              <p className="mt-3 text-xs text-center text-gray-500">
                送信後、お申込み内容を {applicantEmail || 'ご登録メール'} 宛にお送りします
              </p>
            </div>
          </form>
        )}

        {!submissionMethod && (
          <p className="mt-6 text-center text-sm text-gray-500">
            上の3択から「ご希望の提出方法」をお選びください。
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
