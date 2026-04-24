export default function FreeeInviteGuide() {
  return (
    <section className="section-card">
      <div className="section-header">
        <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border-2 border-emerald-500 text-emerald-600 text-[10px] font-bold">
          お願い
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            freee人事労務 管理者招待のお願い
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">代行業務開始前にお済ませください</p>
        </div>
      </div>
      <div className="section-body">
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          年度更新・算定基礎届の代行を実施するため、freee人事労務にスポット社労士くんを管理者として招待してください。
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">招待手順</p>
          <ol className="text-sm text-slate-700 space-y-2.5 leading-relaxed">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <span>freee人事労務にログイン</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <span><span className="text-slate-900 font-semibold">ホーム ＞ 設定 ＞ 事業所設定 ＞ 権限管理</span></span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">3</span>
              <span><span className="text-slate-900 font-semibold">従業員アカウント以外</span> タブを選択</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">4</span>
              <span><span className="text-slate-900 font-semibold">招待</span> ボタンをクリック</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">5</span>
              <span>
                管理者として{' '}
                <code className="px-2 py-0.5 rounded bg-white border border-slate-300 text-blue-700 font-mono text-sm font-semibold select-all">
                  info@spot-s.jp
                </code>{' '}
                を招待
              </span>
            </li>
          </ol>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          ※ 招待がお済みでない場合、代行業務を開始できませんのでご注意ください。
        </p>
      </div>
    </section>
  );
}
