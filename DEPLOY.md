# nendosantei-form デプロイ・運用メモ

## 公開URL

| 用途 | URL |
|---|---|
| 本番（Vercel直） | https://nendosantei-form.vercel.app/ |
| 本番（spot-s.or.jp埋め込み） | https://spot-s.or.jp/nendosanteikaikeiform （※下記のWP固定ページ作成後） |
| 管理画面 | https://nendosantei-form.vercel.app/admin （PW: spot1192） |

## アーキテクチャ

```
[ ユーザー ]
    │ ブラウザ
    ▼
[ spot-s.or.jp/nendosanteikaikeiform ]  ← WordPress 固定ページ（iframe）
    │ iframe src
    ▼
[ nendosantei-form.vercel.app ]  ← Next.js（Vercel: e-GOV SPOTPORTAL）
    │
    ├─→ Supabase（プロジェクト sslrangrwlawqhnxynno）
    │   ├─ applications / application_contacts / application_files / email_logs
    │   └─ Storage バケット application-files（private）
    │
    └─→ Resend（From: info@spot-s.jp）
        ├─ サンクスメール → 申込者
        └─ 内部通知 → info@spot-s.jp（CC: jamworksfujiki@gmail.com）
```

## WordPress 固定ページ作成手順（ユーザー側で実施）

1. **WP管理画面にログイン**
   - 管理URL: `https://spot-s.or.jp/wp-admin/`（または LoliPop 経由のログインURL）

2. **新規固定ページを作成**
   - 左メニュー「固定ページ」→「新規追加」
   - **タイトル**: `年度更新・算定基礎届 ご依頼フォーム`
   - **パーマリンク（スラッグ）**: `nendosanteikaikeiform`
     - 公開後にURLバーで `https://spot-s.or.jp/?page_id=XX` のように出る場合は、
       「URLスラッグ」欄に `nendosanteikaikeiform` と入力してください

3. **本文に「カスタムHTML」ブロックを追加し、以下を貼り付け**

```html
<style>
  .nendosantei-iframe-wrap {
    width: 100%;
    margin: 0 auto;
    max-width: 980px;
  }
  .nendosantei-iframe-wrap iframe {
    width: 100%;
    height: 1900px;
    border: 0;
    display: block;
    background: #f9fafb;
  }
  @media (max-width: 768px) {
    .nendosantei-iframe-wrap iframe { height: 2600px; }
  }
</style>
<div class="nendosantei-iframe-wrap">
  <iframe
    src="https://nendosantei-form.vercel.app/"
    title="年度更新・算定基礎届 ご依頼フォーム"
    loading="lazy"
    allow="clipboard-write"></iframe>
</div>
```

4. **公開** → `https://spot-s.or.jp/nendosanteikaikeiform` にアクセスしてフォームが表示されればOK

### iframe の高さが足りない／余白が出る場合
- 上記 CSS の `height: 1900px;` を増減して調整してください（PC / モバイルそれぞれ）
- 顧問先カードを多く追加すると伸びるため、初期状態に合わせれば十分

## Vercel デプロイ（Claudeが実施済み）

```bash
# 初回のみ
cd c:/Users/fujik/vscode/nendosantei-form
git init
git config user.email "fujiki@jamworks.jp"
git config user.name "YOSHINORIFUJIKI"
git add -A && git commit -m "Initial commit"
npx vercel link --scope e-gov-spotportal --project nendosantei-form
# 環境変数登録（一度だけ）
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
# ... 他の env 変数も同様
# デプロイ
npx vercel deploy --prod --scope e-gov-spotportal
```

### 環境変数（本番）
| Key | Value |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | https://sslrangrwlawqhnxynno.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | （Supabase Dashboard 参照） |
| SUPABASE_SERVICE_ROLE_KEY | （同上） |
| RESEND_API_KEY | re_FbmC9GPZ_5LZwbFkU7pgponSZDonMgH17 |
| ADMIN_NOTIFY_EMAIL | info@spot-s.jp |
| ADMIN_NOTIFY_CC | jamworksfujiki@gmail.com |
| ADMIN_PASSWORD | spot1192 |
| NEXT_PUBLIC_SITE_URL | https://nendosantei-form.vercel.app |

## Supabase

- **プロジェクト**: `nendosantei-form`（ref: `sslrangrwlawqhnxynno`、ap-northeast-1）
- **Org**: jamworksfujiki-jpg's Org
- **Dashboard**: https://supabase.com/dashboard/project/sslrangrwlawqhnxynno
- **Storage バケット**: `application-files`（private、5MB上限、PDF/Excel/PNG/JPEG）
- **テーブル**: applications / application_contacts / application_files / email_logs
- **RLS**: anon は全テーブル不可、API ルート（service_role）のみ書き込み可

## Resend

- **From アドレス**: `info@spot-s.jp`
- **ドメイン認証**: spot-s.jp は seminar-form で利用済み（DNS認証済み）
- **テスト方法**: 自分の Gmail を applicantEmail に入力 → 送信 → サンクスメール受信を確認

## 受注一覧の確認

1. https://nendosantei-form.vercel.app/admin にアクセス
2. パスワード `spot1192` を入力
3. 受注一覧が表示される

## 注意事項

- ✅ **本番 spot-s 系の Firebase / Vercel / DB には触らない**（独立したVercelプロジェクト・Supabaseで運用）
- ✅ **info@spot-s.jp と jamworksfujiki@gmail.com の両方に内部通知**が届く
- ✅ **6/15以降に送信した場合のみ、期限超過の同意チェックが必須**になる
- ✅ **ファイル（算定基礎届・労保申告書）は各顧問先につき必須**
- ✅ **CSV一括UPで最大50件まで読み込み可能**（ファイルは別途各カードで添付）
