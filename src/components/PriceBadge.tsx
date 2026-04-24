export default function PriceBadge() {
  return (
    <div className="my-8">
      <div className="rounded-lg border border-slate-200 bg-white px-6 py-7 sm:py-8 text-center">
        <div className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase mb-3">
          特別価格
        </div>
        <div className="flex items-baseline justify-center gap-1 text-slate-900">
          <span className="text-5xl sm:text-6xl font-light tracking-tight tabular-nums">9,900</span>
          <span className="text-xl sm:text-2xl font-medium ml-1">円</span>
        </div>
        <div className="mt-2 text-sm text-slate-500">税込 / 1顧問先あたり</div>
        <div className="mt-4 inline-block text-xs text-slate-500 border-t border-slate-200 pt-3 px-6">
          年度更新（労働保険料申告書）＋ 算定基礎届　一式
        </div>
      </div>
    </div>
  );
}
