import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '【会計事務所様へのご依頼】年度更新・算定基礎届 受付フォーム | スポット社労士くん',
  description:
    'スポット社労士くんが、会計事務所の顧問先の「年度更新・算定基礎届」を一律9,900円（税込・特別価格）で代行受注します。フォームから最大50件までまとめてお申込みいただけます。',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
