export default function FreeeInviteGuide() {
  return (
    <section className="my-8 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">
        freee人事労務 管理者招待のお願い
      </h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        年度更新・算定基礎届の代行を実施するため、freee人事労務にスポット社労士くんを管理者として招待してください。
      </p>
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">招待手順</p>
        <ol className="text-sm text-slate-700 space-y-2 leading-relaxed">
          <li>
            <span className="inline-block w-5 text-slate-400 font-mono">1.</span>
            freee人事労務にログイン
          </li>
          <li>
            <span className="inline-block w-5 text-slate-400 font-mono">2.</span>
            <span className="text-slate-900 font-medium">ホーム ＞ 設定 ＞ 事業所設定 ＞ 権限管理</span>
          </li>
          <li>
            <span className="inline-block w-5 text-slate-400 font-mono">3.</span>
            <span className="text-slate-900 font-medium">従業員アカウント以外</span> タブを選択
          </li>
          <li>
            <span className="inline-block w-5 text-slate-400 font-mono">4.</span>
            <span className="text-slate-900 font-medium">招待</span> ボタンをクリック
          </li>
          <li>
            <span className="inline-block w-5 text-slate-400 font-mono">5.</span>
            管理者として{' '}
            <code className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-900 font-mono text-sm select-all">
              info@spot-s.jp
            </code>{' '}
            を招待
          </li>
        </ol>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        ※ 招待がお済みでない場合、代行業務を開始できませんのでご注意ください。
      </p>
    </section>
  );
}
