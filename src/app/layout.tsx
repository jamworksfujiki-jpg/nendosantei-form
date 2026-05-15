import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '年度更新・算定基礎届 ご依頼フォーム | スポット社労士くん',
  description:
    'スポット社労士くんが「年度更新・算定基礎届」を代行受注します。フォームから最大50件までまとめてお申込みいただけます。',
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
