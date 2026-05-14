import NendosanteiForm from '@/components/NendosanteiForm';

// 一旦非表示扱い（URL直リン限定、サイトからリンクなし）
export const metadata = {
  title: '会計事務所様向け 年度更新・算定基礎届ご依頼フォーム | スポット社労士くん',
  robots: { index: false, follow: false },
};

export default function FirmPage() {
  return <NendosanteiForm plan="accountant" />;
}
