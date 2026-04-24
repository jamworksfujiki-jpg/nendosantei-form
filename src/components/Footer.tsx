import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-sm text-slate-600 leading-relaxed">
        <Image
          src="/spot-logo.png"
          alt="スポット社労士くん"
          width={180}
          height={42}
          className="mb-4"
          priority={false}
        />
        <p className="font-medium text-slate-900">スポット社労士くん社会保険労務士法人</p>
        <p>〒102-0075 東京都千代田区三番町3-8 泉館三番町6F</p>
        <p>TEL: 03-6272-6183</p>
        <p className="mt-3">
          <a
            href="https://spot-s.or.jp/"
            className="text-slate-700 hover:text-slate-900 hover:underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            spot-s.or.jp
          </a>
        </p>
      </div>
    </footer>
  );
}
