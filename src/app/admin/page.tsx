'use client';

import { useEffect, useState } from 'react';

interface ApplicationRow {
  id: string;
  submission_method: string;
  applicant_office_name: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  total_contacts: number;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <h1 className="text-xl sm:text-2xl font-bold">受注一覧（{rows.length}件）</h1>
        <button onClick={() => load(password)} className="btn-secondary">再読込</button>
      </div>
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-3 py-2">受付日時</th>
              <th className="text-left px-3 py-2">提出方法</th>
              <th className="text-left px-3 py-2">事務所</th>
              <th className="text-left px-3 py-2">担当者</th>
              <th className="text-left px-3 py-2">連絡先</th>
              <th className="text-right px-3 py-2">件数</th>
              <th className="text-left px-3 py-2">状態</th>
              <th className="text-left px-3 py-2">ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString('ja-JP')}</td>
                <td className="px-3 py-2">{r.submission_method}</td>
                <td className="px-3 py-2">{r.applicant_office_name ?? '-'}</td>
                <td className="px-3 py-2">{r.applicant_name ?? '-'}</td>
                <td className="px-3 py-2 text-xs">{r.applicant_email}<br />{r.applicant_phone}</td>
                <td className="px-3 py-2 text-right font-mono">{r.total_contacts}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2 text-xs font-mono text-gray-500">{r.id.slice(0, 8)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-500">受注はまだありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
