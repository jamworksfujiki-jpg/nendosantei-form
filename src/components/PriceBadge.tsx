export default function PriceBadge() {
  return (
    <div className="my-8">
      <div className="bg-gradient-to-br from-[#298ef2] to-[#1d6fc4] rounded-2xl px-6 py-8 text-center shadow-lg">
        <div className="text-white/90 text-sm font-medium tracking-wider uppercase mb-2">特別価格</div>
        <div className="text-white">
          <span className="text-5xl sm:text-6xl font-extrabold tracking-tight">9,900</span>
          <span className="text-2xl font-bold ml-1">円</span>
        </div>
        <div className="text-white/90 text-base mt-2 font-medium">税込 / 1顧問先あたり</div>
        <div className="text-white/80 text-xs mt-3">
          年度更新（労働保険料申告書）＋ 算定基礎届　一式
        </div>
      </div>
    </div>
  );
}
