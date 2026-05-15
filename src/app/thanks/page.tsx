'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import FreeeInviteGuide from '@/components/FreeeInviteGuide';

export default function ThanksPage() {
  useEffect(() => {
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

        <FreeeInviteGuide />

        <div className="mt-8 text-center">
          <Link href="/" className="btn-secondary inline-flex items-center">
            ← フォームに戻る
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
