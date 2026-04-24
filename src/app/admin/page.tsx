'use client';

import { useEffect, useState } from 'react';

interface ContactRow {
  row_index: number;
  company_name: string;
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
}

interface Summary {
  totalOrders: number;
  totalContacts: number;
  totalRevenue: number;
  pricePerContact: number;
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg bg-white border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">売上件数</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatJpy(summary.totalContacts)}
              <span className="text-sm text-slate-500 font-normal ml-1">件</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">顧問先ベース</p>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-5">
            <p className="text-xs text-blue-700 uppercase tracking-wider mb-1.5">総売上</p>
            <p className="text-2xl font-semibold text-blue-900 tabular-nums">
              ¥{formatJpy(summary.totalRevenue)}
            </p>
            <p className="text-xs text-blue-700/80 mt-1">
              @¥{formatJpy(summary.pricePerContact)} × {formatJpy(summary.totalContacts)}件
            </p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">受注総数</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatJpy(summary.totalOrders)}
              <span className="text-sm text-slate-500 font-normal ml-1">件</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">会計事務所ベース</p>
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
              <th className="text-right px-3 py-2.5 font-medium">件数</th>
              <th className="text-right px-3 py-2.5 font-medium">売上</th>
              <th className="text-left px-3 py-2.5 font-medium">状態</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isExpanded = expanded.has(r.id);
              const companies = r.application_contacts.map((c) => c.company_name);
              const revenue = r.total_contacts * (summary?.pricePerContact ?? 9900);
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
                    {companies.length === 0 ? (
                      <span className="text-slate-400 text-xs">（紙・メール受付）</span>
                    ) : isExpanded ? (
                      <ul className="space-y-0.5 text-xs">
                        {companies.map((name, i) => (
                          <li key={i}>#{i + 1} {name}</li>
                        ))}
                        <li>
                          <button onClick={() => toggleExpand(r.id)} className="text-blue-600 hover:underline text-xs mt-1">
                            閉じる
                          </button>
                        </li>
                      </ul>
                    ) : (
                      <div className="text-xs">
                        <span className="truncate block max-w-[220px]">
                          {companies.slice(0, 2).join('、')}
                          {companies.length > 2 && ` 他${companies.length - 2}社`}
                        </span>
                        {companies.length > 2 && (
                          <button onClick={() => toggleExpand(r.id)} className="text-blue-600 hover:underline mt-0.5">
                            すべて表示
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-900">
                    {r.total_contacts}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-900">
                    ¥{formatJpy(revenue)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 text-xs">{r.status}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">受注はまだありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        ログインPW: spot1192（環境変数 ADMIN_PASSWORD で変更可）
      </p>
    </main>
  );
}
