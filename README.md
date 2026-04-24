# nendosantei-form

スポット社労士くん「年度更新・算定基礎届」会計事務所向け受注フォーム。

- **本番URL**: https://nendosantei-form.vercel.app/
- **公開先**: https://spot-s.or.jp/nendosanteikaikeiform （WP固定ページからiframe埋め込み）
- **管理画面**: https://nendosantei-form.vercel.app/admin

## スタック

- Next.js 15.5.14 (App Router) + React 19
- Tailwind CSS 4
- Supabase (DB + Storage)
- Resend (メール送信、From: `info@spot-s.jp`)
- Vercel (Team: e-GOV SPOTPORTAL)

## 開発

```bash
npm install
cp .env.local.example .env.local   # 値を埋める
npm run dev   # http://localhost:3000
npm run build && npm run lint
```

## デプロイ・運用

[DEPLOY.md](./DEPLOY.md) を参照。
