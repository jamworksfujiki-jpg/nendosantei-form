import NendosanteiFormSME from '@/components/NendosanteiFormSME';

export const metadata = {
  title: '中小企業様向け 年度更新・算定基礎届ご依頼フォーム | スポット社労士くん',
};

export default function SmeStandardPage() {
  return <NendosanteiFormSME plan="standard" />;
}
