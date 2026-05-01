'use client';

import { useEffect, useState } from 'react';

interface FileRow {
  id: string;
  file_kind: 'santei' | 'roho' | 'other';
  original_filename: string;
  size_bytes: number;
}

interface ContactRow {
  id: string;
  row_index: number;
  company_name: string;
  company_name_kana?: string | null;
  employee_count?: number | null;
  contact_name?: string;
  phone?: string;
  email?: string;
  freee_invited?: boolean | null;
  needs_nendo_koshin?: boolean;
  needs_santei?: boolean;
  application_files?: FileRow[];
}

type FormType = 'firm' | 'sme';

interface ApplicationRow {
  id: string;
  submission_method: 'paper' | 'email' | 'form';
  form_type: FormType;
  applicant_office_name: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  total_contacts: number;
  status: string;
  created_at: string;
  application_contacts: ContactRow[];
  nendo_count: number;
  santei_count: number;
  service_count: number;
  revenue: number;
}

interface Summary {
  totalOrders: number;
  totalContacts: number;
  totalNendo: number;
  totalSantei: number;
  totalServices: number;
  totalRevenue: number;
  pricePerService: number;
}

interface SummaryByFormType {
  firm: Summary;
  sme: Summary;
}

const FORM_TYPE_LABEL: Record<FormType, string> = {
  firm: '会計事務所',
  sme: '中小企業',
};

const SUBMISSION_LABEL: Record<ApplicationRow['submission_method'], string> = {
  paper: '紙で送付',
  email: 'メールで送信',
  form: 'フォームから入力',
};

const STATUS_LABEL: Record<string, string> = {
  received: '受付済',
  processing: '対応中',
  done: '完了',
  cancelled: 'キャンセル',
};

function formatJpy(n: number) {
  return n.toLocaleString('ja-JP');
}

interface EmailLogRow {
  id: string;
  application_id: string | null;
  type: string;
  status: string;
  error: string | null;
  sent_at: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryByFormType, setSummaryByFormType] = useState<SummaryByFormType | null>(null);
  const [formTypeFilter, setFormTypeFilter] = useState<'all' | FormType>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'orders' | 'failed'>('orders');
  const [failedLogs, setFailedLogs] = useState<EmailLogRow[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importMeta, setImportMeta] = useState({
    submissionMethod: 'email' as 'paper' | 'email',
    applicantOfficeName: '',
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    needsNendoKoshin: true,
    needsSantei: true,
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSubmitting, setImportSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setAuthed(true);
          loadData();
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '認証に失敗しました');
      setAuthed(true);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラー');
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/list');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '取得失敗');
      setRows(json.applications);
      setSummary(json.summary);
      setSummaryByFormType(json.summaryByFormType ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラー');
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function loadFailedLogs() {
    try {
      const res = await fetch('/api/admin/email-logs?status=failed');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '取得失敗');
      setFailedLogs(json.logs);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラー');
    }
  }

  async function submitImport() {
    if (!importFile) {
      alert('Excelファイルを選択してください');
      return;
    }
    if (!importMeta.applicantName.trim() || !importMeta.applicantEmail.trim() || !importMeta.applicantPhone.trim()) {
      alert('申込者情報（お名前・メール・電話）は必須です');
      return;
    }
    setImportSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('meta', JSON.stringify(importMeta));
      fd.append('file', importFile);
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '取込失敗');
      alert(`取り込み完了：顧問先 ${json.contactsCount} 社を登録しました`);
      setImportOpen(false);
      setImportFile(null);
      setImportMeta({
        submissionMethod: 'email',
        applicantOfficeName: '',
        applicantName: '',
        applicantEmail: '',
        applicantPhone: '',
        needsNendoKoshin: true,
        needsSantei: true,
      });
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラー');
    } finally {
      setImportSubmitting(false);
    }
  }

  async function downloadFile(fileId: string) {
    try {
      const res = await fetch(`/api/admin/file?fileId=${encodeURIComponent(fileId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'DL失敗');
      window.open(json.url, '_blank', 'noopener');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ダウンロードに失敗しました');
    }
  }

  if (!authed) {
    return (
      <main className="max-w-md mx-auto p-8">
        <h1 className="text-xl font-bold mb-4">管理画面ログイン</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          className="input-base mb-3"
          onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
        />
        <button onClick={handleLogin} disabled={loading} className="btn-primary w-full">
          {loading ? '...' : 'ログイン'}
        </button>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">受注管理</h1>
        <div className="flex gap-2">
          <button onClick={() => setImportOpen(true)} className="h-11 px-4 rounded-md font-medium text-white bg-blue-800 hover:bg-blue-900 inline-flex items-center gap-2 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Excelから取り込む
          </button>
          <button onClick={() => { loadData(); if (tab === 'failed') loadFailedLogs(); }} className="btn-secondary">再読込</button>
        </div>
      </div>

      {importOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setImportOpen(false); }}>
          <div className="bg-white rounded-lg max-w-xl w-full my-8 shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Excel から取り込む</h2>
              <button onClick={() => setImportOpen(false)} className="text-slate-500 hover:text-slate-900 text-xl leading-none px-2">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                メール・郵送で受け取った Excel（顧問先リスト）を取り込みます。<br />
                ※ お客様にはサンクスメールは送信されません（管理者の内部登録）
              </p>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  受領経路<span className="badge-required">必須</span>
                </label>
                <div className="flex gap-2">
                  {([
                    { v: 'email' as const, label: 'メールで受領' },
                    { v: 'paper' as const, label: '紙で受領' },
                  ]).map((opt) => {
                    const selected = importMeta.submissionMethod === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setImportMeta({ ...importMeta, submissionMethod: opt.v })}
                        className={
                          'h-11 px-4 rounded-md border-2 text-sm transition-colors ' +
                          (selected
                            ? 'border-blue-800 bg-blue-50 text-blue-900 font-semibold'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300')
                        }
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  会計事務所名<span className="badge-optional">任意</span>
                </label>
                <input
                  type="text"
                  className="input-base"
                  value={importMeta.applicantOfficeName}
                  onChange={(e) => setImportMeta({ ...importMeta, applicantOfficeName: e.target.value })}
                  placeholder="例）○○会計事務所"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    申込担当者名<span className="badge-required">必須</span>
                  </label>
                  <input
                    type="text"
                    className="input-base"
                    value={importMeta.applicantName}
                    onChange={(e) => setImportMeta({ ...importMeta, applicantName: e.target.value })}
                    placeholder="例）山田 太郎"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    お電話番号<span className="badge-required">必須</span>
                  </label>
                  <input
                    type="tel"
                    className="input-base"
                    value={importMeta.applicantPhone}
                    onChange={(e) => setImportMeta({ ...importMeta, applicantPhone: e.target.value })}
                    placeholder="例）03-1234-5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  メールアドレス<span className="badge-required">必須</span>
                </label>
                <input
                  type="email"
                  className="input-base"
                  value={importMeta.applicantEmail}
                  onChange={(e) => setImportMeta({ ...importMeta, applicantEmail: e.target.value })}
                  placeholder="例）taro@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  ご依頼内容<span className="badge-required">必須</span>
                  <span className="ml-2 text-xs font-normal text-slate-500">（取り込む全顧問先に一括適用）</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={'flex items-center gap-2 px-3 h-11 rounded-md border-2 cursor-pointer transition-colors ' + (importMeta.needsNendoKoshin ? 'border-blue-800 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700')}>
                    <input
                      type="checkbox"
                      checked={importMeta.needsNendoKoshin}
                      onChange={(e) => setImportMeta({ ...importMeta, needsNendoKoshin: e.target.checked })}
                      className="h-4 w-4 accent-blue-800"
                    />
                    <span className="text-sm font-medium">年度更新</span>
                  </label>
                  <label className={'flex items-center gap-2 px-3 h-11 rounded-md border-2 cursor-pointer transition-colors ' + (importMeta.needsSantei ? 'border-blue-800 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700')}>
                    <input
                      type="checkbox"
                      checked={importMeta.needsSantei}
                      onChange={(e) => setImportMeta({ ...importMeta, needsSantei: e.target.checked })}
                      className="h-4 w-4 accent-blue-800"
                    />
                    <span className="text-sm font-medium">算定基礎届</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Excelファイル<span className="badge-required">必須</span>
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200"
                />
                {importFile && (
                  <p className="text-xs text-slate-500 mt-1.5">選択中: {importFile.name} ({(importFile.size / 1024).toFixed(1)}KB)</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setImportOpen(false)} className="btn-secondary" disabled={importSubmitting}>キャンセル</button>
              <button onClick={submitImport} className="btn-primary" disabled={importSubmitting}>
                {importSubmitting ? '登録中…' : '登録する'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('orders')}
          className={'px-4 py-2 text-sm font-semibold border-b-2 transition-colors ' + (tab === 'orders' ? 'border-blue-800 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-700')}
        >
          受注一覧
        </button>
        <button
          type="button"
          onClick={() => { setTab('failed'); loadFailedLogs(); }}
          className={'px-4 py-2 text-sm font-semibold border-b-2 transition-colors ' + (tab === 'failed' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700')}
        >
          メール失敗ログ
        </button>
      </div>

      {tab === 'failed' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto mb-6">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">発生日時</th>
                <th className="text-left px-3 py-2.5 font-medium">受付ID</th>
                <th className="text-left px-3 py-2.5 font-medium">種別</th>
                <th className="text-left px-3 py-2.5 font-medium">エラー内容</th>
              </tr>
            </thead>
            <tbody>
              {failedLogs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-600">
                    {new Date(log.sent_at).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono text-slate-500">{log.application_id?.slice(0, 8) ?? '-'}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-red-50 text-red-700 border border-red-200">
                      {log.type === 'thanks' ? 'サンクスメール' : log.type === 'admin_notify' ? '管理通知' : log.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-700 break-all">{log.error ?? '-'}</td>
                </tr>
              ))}
              {failedLogs.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-slate-500">失敗ログはありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && summaryByFormType && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {(['firm', 'sme'] as const).map((ft) => {
            const s = summaryByFormType[ft];
            const isFirm = ft === 'firm';
            return (
              <div
                key={ft}
                className={
                  'rounded-lg border-2 p-4 ' +
                  (isFirm ? 'border-blue-200 bg-blue-50/40' : 'border-emerald-200 bg-emerald-50/40')
                }
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className={'text-sm font-bold ' + (isFirm ? 'text-blue-900' : 'text-emerald-900')}>
                    {FORM_TYPE_LABEL[ft]}様向け
                  </h2>
                  <span className="text-xs text-slate-500">
                    {isFirm ? '/ （複数顧問先）' : '/sme （自社1件）'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-md bg-white border border-slate-200 p-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">受注</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums">
                      {formatJpy(s.totalOrders)}<span className="text-xs text-slate-500 font-normal ml-0.5">件</span>
                    </p>
                  </div>
                  <div className="rounded-md bg-white border border-slate-200 p-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">年度更新</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums">
                      {formatJpy(s.totalNendo)}<span className="text-xs text-slate-500 font-normal ml-0.5">件</span>
                    </p>
                  </div>
                  <div className="rounded-md bg-white border border-slate-200 p-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">算定基礎届</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums">
                      {formatJpy(s.totalSantei)}<span className="text-xs text-slate-500 font-normal ml-0.5">件</span>
                    </p>
                  </div>
                  <div className={'rounded-md border p-3 ' + (isFirm ? 'bg-blue-100 border-blue-300' : 'bg-emerald-100 border-emerald-300')}>
                    <p className={'text-[10px] uppercase tracking-wider mb-1 ' + (isFirm ? 'text-blue-700' : 'text-emerald-700')}>売上</p>
                    <p className={'text-lg font-semibold tabular-nums ' + (isFirm ? 'text-blue-900' : 'text-emerald-900')}>
                      ¥{formatJpy(s.totalRevenue)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'orders' && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg bg-white border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">合計受注</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatJpy(summary.totalOrders)}
              <span className="text-sm text-slate-500 font-normal ml-1">件</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">両フォーム合算</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">年度更新</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatJpy(summary.totalNendo)}
              <span className="text-sm text-slate-500 font-normal ml-1">件</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">労働保険料申告書</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">算定基礎届</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatJpy(summary.totalSantei)}
              <span className="text-sm text-slate-500 font-normal ml-1">件</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">1項目9,900円</p>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-5">
            <p className="text-xs text-blue-700 uppercase tracking-wider mb-1.5">総売上</p>
            <p className="text-2xl font-semibold text-blue-900 tabular-nums">
              ¥{formatJpy(summary.totalRevenue)}
            </p>
            <p className="text-xs text-blue-700/80 mt-1">
              @¥{formatJpy(summary.pricePerService)} × {formatJpy(summary.totalServices)}項目
            </p>
          </div>
        </div>
      )}

      {tab === 'orders' && (
      <>
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">表示フィルタ:</span>
        {([
          { v: 'all' as const, label: 'すべて', cls: 'border-slate-700 bg-slate-700 text-white' },
          { v: 'firm' as const, label: '会計事務所のみ', cls: 'border-blue-700 bg-blue-700 text-white' },
          { v: 'sme' as const, label: '中小企業のみ', cls: 'border-emerald-700 bg-emerald-700 text-white' },
        ]).map((opt) => {
          const selected = formTypeFilter === opt.v;
          return (
            <button
              key={opt.v}
              type="button"
              onClick={() => setFormTypeFilter(opt.v)}
              className={
                'h-8 px-3 rounded-md border-2 text-xs font-semibold transition-colors ' +
                (selected ? opt.cls : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400')
              }
            >
              {opt.label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-slate-500 tabular-nums">
          {formatJpy(rows.filter((r) => formTypeFilter === 'all' || r.form_type === formTypeFilter).length)} 件表示中
        </span>
      </div>
      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium">受付日</th>
              <th className="text-left px-3 py-2.5 font-medium">種別</th>
              <th className="text-left px-3 py-2.5 font-medium">会計事務所名／会社名</th>
              <th className="text-left px-3 py-2.5 font-medium">ご担当者</th>
              <th className="text-left px-3 py-2.5 font-medium">申込種別</th>
              <th className="text-left px-3 py-2.5 font-medium">紐づく会社名</th>
              <th className="text-center px-3 py-2.5 font-medium">年度更新</th>
              <th className="text-center px-3 py-2.5 font-medium">算定</th>
              <th className="text-right px-3 py-2.5 font-medium">売上</th>
              <th className="text-left px-3 py-2.5 font-medium">状態</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter((r) => formTypeFilter === 'all' || r.form_type === formTypeFilter).map((r) => {
              const isExpanded = expanded.has(r.id);
              const contacts = r.application_contacts ?? [];
              return (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-xs">
                    {new Date(r.created_at).toLocaleDateString('ja-JP')}
                    <br />
                    <span className="text-slate-400">{new Date(r.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={
                      'inline-block px-2 py-0.5 rounded text-xs font-semibold ' +
                      (r.form_type === 'sme'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200')
                    }>
                      {FORM_TYPE_LABEL[r.form_type ?? 'firm']}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-900 font-medium">
                    {r.form_type === 'sme'
                      ? (r.application_contacts?.[0]?.company_name || <span className="text-slate-400 font-normal">（未入力）</span>)
                      : (r.applicant_office_name || <span className="text-slate-400 font-normal">（未入力）</span>)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {r.applicant_name ?? '-'}
                    <br />
                    <span className="text-xs text-slate-500">{r.applicant_email}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                      {SUBMISSION_LABEL[r.submission_method] ?? r.submission_method}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {contacts.length === 0 ? (
                      <span className="text-slate-400 text-xs">（顧問先未登録）</span>
                    ) : (
                      <ul className="space-y-2.5 text-xs">
                        {(isExpanded || contacts.length <= 3 ? contacts : contacts.slice(0, 3)).map((c, i) => {
                          const rohoFile = c.application_files?.find((f) => f.file_kind === 'roho');
                          const santeiFile = c.application_files?.find((f) => f.file_kind === 'santei');
                          return (
                            <li key={i} className="border-l-2 border-slate-200 pl-2">
                              <div>
                                <span className="font-semibold">#{i + 1} {c.company_name}</span>
                                {c.company_name_kana && (
                                  <span className="ml-1.5 text-slate-400">（{c.company_name_kana}）</span>
                                )}
                                <span className="ml-2 text-slate-400">
                                  {c.needs_nendo_koshin && '年度更新'}
                                  {c.needs_nendo_koshin && c.needs_santei && '＋'}
                                  {c.needs_santei && '算定'}
                                </span>
                              </div>
                              <div className="text-slate-600 mt-0.5">
                                {c.contact_name ?? ''} / {c.phone ?? ''} / {c.email ?? ''}
                              </div>
                              <div className="text-slate-600 mt-0.5 flex flex-wrap items-center gap-1.5">
                                {c.employee_count != null && (
                                  <span>従業員 <span className="font-semibold text-slate-900">{c.employee_count}</span> 名</span>
                                )}
                                {c.freee_invited ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">freee招待済</span>
                                ) : (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-50 text-slate-500 border border-slate-200">freee未招待</span>
                                )}
                              </div>
                              {(rohoFile || santeiFile) && (
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {rohoFile && (
                                    <button
                                      type="button"
                                      onClick={() => downloadFile(rohoFile.id)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                                    >
                                      📎 年度更新DL
                                    </button>
                                  )}
                                  {santeiFile && (
                                    <button
                                      type="button"
                                      onClick={() => downloadFile(santeiFile.id)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                                    >
                                      📎 算定基礎DL
                                    </button>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                        {contacts.length > 3 && (
                          <li>
                            <button onClick={() => toggleExpand(r.id)} className="text-blue-800 hover:underline text-xs mt-1 font-semibold">
                              {isExpanded ? '↑ 閉じる' : `↓ 残り ${contacts.length - 3} 社を表示`}
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono tabular-nums text-slate-900">
                    {r.nendo_count > 0 ? r.nendo_count : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono tabular-nums text-slate-900">
                    {r.santei_count > 0 ? r.santei_count : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-900">
                    ¥{formatJpy(r.revenue)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <span className={
                      'inline-block px-2 py-0.5 rounded font-semibold ' +
                      (r.status === 'received' ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : r.status === 'processing' ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : r.status === 'done' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : r.status === 'cancelled' ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : 'bg-slate-50 text-slate-700 border border-slate-200')
                    }>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.filter((r) => formTypeFilter === 'all' || r.form_type === formTypeFilter).length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-500">
                  {rows.length === 0 ? '受注はまだありません' : '該当する受注がありません'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}

      <p className="mt-4 text-xs text-slate-400">
        単価: ¥9,900 / 項目（年度更新・算定基礎届は別計上）
      </p>
    </main>
  );
}
