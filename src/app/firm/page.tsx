import NendosanteiFormSME from '@/components/NendosanteiFormSME';

// 一旦非表示扱い（URL直リン限定、サイトからリンクなし）
// 中小企業向けデザインで 9,900円 プランを表示
export const metadata = {
  title: '年度更新・算定基礎届ご依頼フォーム | スポット社労士くん',
  robots: { index: false, follow: false },
};

export default function FirmPage() {
  return <NendosanteiFormSME plan="accountant" />;
}
