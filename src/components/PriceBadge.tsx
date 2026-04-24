export default function PriceBadge() {
  return (
    <div className="my-8">
      <div className="relative rounded-xl border-2 border-blue-600 bg-gradient-to-br from-blue-50 via-white to-white px-6 py-9 sm:py-11 text-center shadow-sm">
        {/* リボンバッジ */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <div className="bg-blue-600 text-white text-[11px] font-semibold tracking-[0.22em] uppercase px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap">
            会計事務所様 特別価格
          </div>
        </div>

        <p className="text-[11px] sm:text-xs text-slate-500 tracking-[0.2em] uppercase mb-2">
          1項目あたり
        </p>

        <div className="flex items-baseline justify-center gap-1 text-blue-700">
          <span className="text-6xl sm:text-[88px] font-semibold tracking-tight tabular-nums leading-none">9,900</span>
          <span className="text-2xl sm:text-3xl font-semibold ml-1">円</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">税込</p>

        <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-md mx-auto">
          <div className="flex items-start gap-2.5 text-sm text-slate-700">
            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">✓</span>
            <div>
              <span className="block font-medium text-slate-900">年度更新</span>
              <span className="text-xs text-slate-500">労働保険料申告書／1顧問先 <span className="font-semibold text-blue-700">9,900円</span></span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-slate-700">
            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">✓</span>
            <div>
              <span className="block font-medium text-slate-900">算定基礎届</span>
              <span className="text-xs text-slate-500">1顧問先 <span className="font-semibold text-blue-700">9,900円</span></span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-400">
          ※ 顧問先ごとに必要なサービスを選択いただけます（両方も可）
        </p>
      </div>
    </div>
  );
}
