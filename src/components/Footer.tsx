export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 text-sm text-gray-600 leading-relaxed">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#298ef2] text-white flex items-center justify-center font-bold text-lg">
            S
          </div>
          <div className="font-semibold text-gray-900 text-base">スポット社労士くん</div>
        </div>
        <p className="font-medium text-gray-900">スポット社労士くん社会保険労務士法人</p>
        <p>〒102-0075 東京都千代田区三番町3-8 泉館三番町6F</p>
        <p>TEL: 03-6272-6183</p>
        <p className="mt-3">
          <a href="https://spot-s.or.jp/" className="text-[#298ef2] hover:underline" target="_blank" rel="noopener noreferrer">
            https://spot-s.or.jp/
          </a>
        </p>
      </div>
    </footer>
  );
}
