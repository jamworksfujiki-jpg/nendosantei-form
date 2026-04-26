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
  contact_name?: string;
  phone?: string;
  email?: string;
  needs_nendo_koshin?: boolean;
  needs_santei?: boolean;
  application_files?: FileRow[];
}

interface ApplicationRow {
  id: string;
  submission_method: 'paper' | 'email' | 'form';
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

const SUBMISSION_LABEL: Record<ApplicationRow['submission_method'], string> = {
  paper: '紙で送付',
  email: 'メールで送信',
  form: 'フォームから入力',
};

function formatJpy(n: number) {
  return n.toLocaleString('ja-JP');
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem('nendosantei_admin_pw');
    if (stored) {
      setPassword(stored);
      load(stored);
    }
  }, []);

  async function load(pw: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/list', { headers: { 'x-admin-password': pw } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '取得失敗');
      setRows(json.applications);
      setSummary(json.summary);
      setAuthed(true);
      sessionStorage.setItem('nendosantei_admin_pw', pw);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラー');
      setAuthed(false);
      sessionStorage.removeItem('nendosantei_admin_pw');
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

  async function downloadFile(fileId: string) {
    try {
      const res = await fetch(`/api/admin/file?fileId=${encodeURIComponent(fileId)}`, {
        headers: { 'x-admin-password': password },
      });
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
          onKeyDown={(e) => { if (e.key === 'Enter') load(password); }}
        />
        <button onClick={() => load(password)} disabled={loading} className="btn-primary w-full">
          {loading ? '...' : 'ログイン'}
        </button>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">受注管理</h1>
        <button onClick={() => load(password)} className="btn-secondary">再読込</button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg bg-white border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">受注総数</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatJpy(summary.totalOrders)}
              <span className="text-sm text-slate-500 font-normal ml-1">件</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">会計事務所</p>
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

      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium">受付日</th>
              <th className="text-left px-3 py-2.5 font-medium">会計事務所名</th>
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
            {rows.map((r) => {
              const isExpanded = expanded.has(r.id);
              const contacts = r.application_contacts ?? [];
              return (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-xs">
                    {new Date(r.created_at).toLocaleDateString('ja-JP')}
                    <br />
                    <span className="text-slate-400">{new Date(r.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-900 font-medium">
                    {r.applicant_office_name || <span className="text-slate-400 font-normal">（未入力）</span>}
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
                  <td className="px-3 py-2.5 text-slate-700 max-w-xs">
                    {contacts.length === 0 ? (
                      <span className="text-slate-400 text-xs">（紙・メール受付）</span>
                    ) : isExpanded ? (
                      <ul className="space-y-2 text-xs">
                        {contacts.map((c, i) => {
                          const rohoFile = c.application_files?.find((f) => f.file_kind === 'roho');
                          const santeiFile = c.application_files?.find((f) => f.file_kind === 'santei');
                          return (
                            <li key={i} className="border-l-2 border-slate-200 pl-2">
                              <div>
                                <span className="font-semibold">#{i + 1} {c.company_name}</span>
                                <span className="ml-2 text-slate-400">
                                  {c.needs_nendo_koshin && '年度更新'}
                                  {c.needs_nendo_koshin && c.needs_santei && '＋'}
                                  {c.needs_santei && '算定'}
                                </span>
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
                        <li>
                          <button onClick={() => toggleExpand(r.id)} className="text-blue-800 hover:underline text-xs mt-1">
                            閉じる
                          </button>
                        </li>
                      </ul>
                    ) : (
                      <div className="text-xs">
                        <span className="truncate block max-w-[220px]">
                          {contacts.slice(0, 2).map((c) => c.company_name).join('、')}
                          {contacts.length > 2 && ` 他${contacts.length - 2}社`}
                        </span>
                        {contacts.length > 1 && (
                          <button onClick={() => toggleExpand(r.id)} className="text-blue-800 hover:underline mt-0.5">
                            すべて表示
                          </button>
                        )}
                      </div>
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
                  <td className="px-3 py-2.5 text-slate-600 text-xs">{r.status}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-500">受注はまだありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        単価: ¥9,900 / 項目（年度更新・算定基礎届は別計上）
      </p>
    </main>
  );
}
