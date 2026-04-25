import Image from 'next/image';

export default function PriceBadge() {
  return (
    <div className="my-8">
      <div className="relative rounded-xl border-2 border-blue-600 bg-gradient-to-br from-blue-50 via-white to-white px-6 py-9 sm:py-11 text-center shadow-sm">
        {/* リボンバッジ */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
          <div className="bg-blue-600 text-white text-sm sm:text-base font-bold tracking-[0.15em] px-6 sm:px-8 py-2.5 rounded-full shadow-md whitespace-nowrap">
            会計事務所様向け 特別価格
          </div>
        </div>

        <div className="flex items-baseline justify-center gap-2 text-red-600 mt-2">
          <span className="text-3xl sm:text-4xl font-bold leading-none">各</span>
          <span className="text-6xl sm:text-[88px] font-bold tracking-tight tabular-nums leading-none">9,900</span>
          <span className="text-2xl sm:text-3xl font-bold ml-1">円</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">税込</p>

        <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <Image
              src="/envelopes/green-envelope.avif"
              alt="緑の封筒（年度更新）"
              width={302}
              height={400}
              className="shrink-0 w-14 sm:w-16 h-auto rounded-sm"
              unoptimized
            />
            <div>
              <span className="block font-bold text-slate-900">年度更新</span>
              <span className="text-xs text-slate-500 block">労働保険料申告書／1顧問先</span>
              <span className="text-base font-bold text-red-600 tabular-nums">9,900円</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <Image
              src="/envelopes/brown-envelope.png"
              alt="茶色の封筒（算定基礎届）"
              width={1417}
              height={2111}
              className="shrink-0 w-14 sm:w-16 h-auto rounded-sm"
            />
            <div>
              <span className="block font-bold text-slate-900">算定基礎届</span>
              <span className="text-xs text-slate-500 block">1顧問先</span>
              <span className="text-base font-bold text-red-600 tabular-nums">9,900円</span>
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
