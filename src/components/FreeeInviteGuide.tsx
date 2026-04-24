export default function FreeeInviteGuide() {
  return (
    <section className="my-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
      <h3 className="text-base sm:text-lg font-bold text-blue-900 flex items-center gap-2">
        <span aria-hidden>📨</span>
        freee人事労務 管理者招待のお願い
      </h3>
      <p className="mt-2 text-sm text-blue-900 leading-relaxed">
        年度更新・算定基礎届の代行を実施するため、freee人事労務にスポット社労士くんを管理者として招待してください。
      </p>
      <div className="mt-4 bg-white rounded-lg p-4 border border-blue-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">招待手順</p>
        <ol className="text-sm text-gray-800 space-y-1.5 leading-relaxed">
          <li>1. freee人事労務にログイン</li>
          <li>2. <strong>ホーム画面 ＞ 設定 ＞ 事業所設定 ＞ 権限管理</strong></li>
          <li>3. <strong>従業員アカウント以外</strong> タブを選択</li>
          <li>4. <strong>招待</strong> ボタンをクリック</li>
          <li>
            5. 管理者として{' '}
            <code className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-sm select-all">
              info@spot-s.jp
            </code>{' '}
            を招待
          </li>
        </ol>
      </div>
      <p className="mt-3 text-xs text-blue-800">
        ※ 招待がお済みでない場合、代行業務を開始できませんのでご注意ください。
      </p>
    </section>
  );
}
