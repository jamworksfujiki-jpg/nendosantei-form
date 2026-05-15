'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import FreeeInviteGuide from '@/components/FreeeInviteGuide';

export default function ThanksPage() {
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    const embedded = typeof window !== 'undefined' && window.top !== window.self;
    setInIframe(embedded);
    // 親ウィンドウにスクロール依頼（iframe 内のとき）
    try { window.parent?.postMessage('nendosantei:scroll-to-top', '*'); } catch {}
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-10 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl mb-4" aria-hidden>
            ✓
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            お申込みを受け付けました
          </h1>
          <p className="text-gray-700 leading-relaxed">
            この度は「年度更新・算定基礎届」のご依頼をいただき、誠にありがとうございます。
          </p>
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
            ご担当者様のメールアドレス宛に、申込内容の確認メールをお送りしました。<br />
            内容を確認次第、担当（油井）より <strong>2営業日以内</strong> にご連絡いたします。
          </p>
        </div>

        <div className="mt-6 rounded-xl border-2 border-[#F0A93B] bg-[#FFF8EC] p-5 sm:p-6 flex items-center gap-4">
          <Image
            src="/warning-icon.png"
            alt="注意"
            width={64}
            height={64}
            className="shrink-0 w-12 h-12 sm:w-16 sm:h-16"
            unoptimized
          />
          <p className="text-base sm:text-lg font-bold text-[#B6711A] leading-snug">
            迷惑メールフォルダーも必ずご確認ください。
          </p>
        </div>

        <FreeeInviteGuide />

        {/* iframe 内では「フォームに戻る」ボタンとフッター非表示 */}
        {!inIframe && (
          <div className="mt-8 text-center">
            <Link href="/" className="btn-secondary inline-flex items-center">
              ← フォームに戻る
            </Link>
          </div>
        )}
      </main>
      {!inIframe && <Footer />}
    </div>
  );
}
