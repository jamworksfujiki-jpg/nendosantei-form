import type { ApplicationInput } from './validation';
import { getPlan } from './plans';

export const FROM_ADDRESS = 'スポット社労士くん <info@spot-s.jp>';
export const REPLY_TO = 'info@spot-s.jp';

const COMPANY_FOOTER = `━━━━━━━━━━━━━━━━━━━━
スポット社労士くん社会保険労務士法人
〒102-0075 東京都千代田区三番町3-8 泉館三番町6F
TEL: 03-6272-6183
https://spot-s.or.jp/
━━━━━━━━━━━━━━━━━━━━`;

const SUBMISSION_LABEL: Record<ApplicationInput['submissionMethod'], string> = {
  paper: '紙でご郵送（スポット社労士くん 宛）',
  email: 'メールで送信（yui@100ten.co.jp 宛）',
  form: 'フォームから入力',
};

function serviceLabel(c: { needsNendoKoshin: boolean; needsSantei: boolean }) {
  const parts: string[] = [];
  if (c.needsNendoKoshin) parts.push('年度更新');
  if (c.needsSantei) parts.push('算定基礎届');
  return parts.join('＋');
}

function computeTotals(contacts: ApplicationInput['contacts'], unitPrice: number) {
  const nendoCount = contacts.filter((c) => c.needsNendoKoshin).length;
  const santeiCount = contacts.filter((c) => c.needsSantei).length;
  const serviceCount = nendoCount + santeiCount;
  const total = serviceCount * unitPrice;
  return { nendoCount, santeiCount, serviceCount, total };
}

export function buildThanksEmail(input: ApplicationInput) {
  const unitPrice = getPlan(input.plan).priceInclTax;
  const subject = '【スポット社労士くん】年度更新・算定基礎届のご依頼を承りました';
  const totals = computeTotals(input.contacts, unitPrice);
  const contactsText = input.contacts
    .map(
      (c, i) => {
        const lines = [
          `  ${String(i + 1).padStart(2, ' ')}. ${c.companyName}` + (c.companyNameKana ? ` （${c.companyNameKana}）` : ''),
          `      担当: ${c.contactName} / ${c.phone} / ${c.email}`,
          `      従業員: ${c.employeeCount != null ? `${c.employeeCount}名` : '未入力'} / freee招待: ${c.freeeInvited ? '済' : '未'}`,
          `      → ${serviceLabel(c)}`,
        ];
        return lines.join('\n');
      },
    )
    .join('\n');

  const text = `${input.applicantName} 様

この度は「年度更新・算定基礎届」のご依頼をいただき、誠にありがとうございます。
以下の内容でお申込みを承りました。

■ ご依頼内容
  提出方法: ${SUBMISSION_LABEL[input.submissionMethod]}
  顧問先件数: ${input.contacts.length} 社
  依頼項目: 年度更新 ${totals.nendoCount} 件 ／ 算定基礎届 ${totals.santeiCount} 件
  単価: ${unitPrice.toLocaleString('ja-JP')}円（税込）/ 項目
  合計金額: ${totals.total.toLocaleString('ja-JP')} 円（税込）
  注文期限: 2026年6月15日（月）

■ ご依頼一覧
${contactsText}

■ ご担当者様情報
  会計事務所名: ${input.applicantOfficeName || '（未入力）'}
  お名前: ${input.applicantName}
  メールアドレス: ${input.applicantEmail}
  電話番号: ${input.applicantPhone}

■ 次のステップ
  内容を確認次第、担当（油井）より2営業日以内にご連絡いたします。

━━━━━━━━━━━━━━━━━━━━
■ freee人事労務 管理者招待のお願い（代行業務開始前にお済ませください）
━━━━━━━━━━━━━━━━━━━━

年度更新・算定基礎届の代行を実施するため、freee人事労務にスポット社労士くんを
管理者として招待してください。

【招待手順】
  1. freee人事労務にログイン
  2. ホーム ＞ 設定 ＞ 事業所設定 ＞ 権限管理
  3. 「従業員アカウント以外」タブを選択
  4. 「招待」ボタンをクリック
  5. 管理者として info@spot-s.jp を招待

※ 招待がお済みでない場合、代行業務を開始できませんのでご注意ください。

ご不明な点は本メールに直接ご返信ください。

${COMPANY_FOOTER}`;

  return { subject, text };
}

export function buildAdminNotifyEmail(input: ApplicationInput, applicationId: string, fileLinks: string[]) {
  const unitPrice = getPlan(input.plan).priceInclTax;
  const totals = computeTotals(input.contacts, unitPrice);
  const subject = `【新規受注】年度更新・算定基礎届 ${input.applicantOfficeName || input.applicantName} ${totals.serviceCount}項目 (${totals.total.toLocaleString('ja-JP')}円)`;
  const contactsText = input.contacts
    .map(
      (c, i) => {
        const lines = [
          `  ${String(i + 1).padStart(2, ' ')}. ${c.companyName}` + (c.companyNameKana ? ` （${c.companyNameKana}）` : ''),
          `      担当: ${c.contactName} / ${c.phone} / ${c.email}`,
          `      従業員: ${c.employeeCount != null ? `${c.employeeCount}名` : '未入力'} / freee招待: ${c.freeeInvited ? '済' : '未'}`,
          `      → ${serviceLabel(c)}`,
        ];
        return lines.join('\n');
      },
    )
    .join('\n');
  const fileLinksText = fileLinks.length > 0
    ? fileLinks.map((l) => `  - ${l}`).join('\n')
    : '  （添付なし）';

  const text = `年度更新・算定基礎届の新規受注がありました。

■ 受付ID
  ${applicationId}

■ ご依頼者
  会計事務所名: ${input.applicantOfficeName || '（未入力）'}
  お名前: ${input.applicantName}
  メール: ${input.applicantEmail}
  電話: ${input.applicantPhone}
  提出方法: ${SUBMISSION_LABEL[input.submissionMethod]}
  プラン: ${input.plan} (単価 ${unitPrice.toLocaleString('ja-JP')}円/項目)
  期限超過同意: ${input.deadlineAcknowledged ? 'はい' : '（期限内）'}

■ 集計
  顧問先: ${input.contacts.length} 社
  年度更新: ${totals.nendoCount} 件
  算定基礎届: ${totals.santeiCount} 件
  合計項目数: ${totals.serviceCount} 項目
  合計金額: ${totals.total.toLocaleString('ja-JP')} 円（税込）

■ 顧問先一覧
${contactsText}

■ 添付ファイル（30日間有効署名URL）
${fileLinksText}

${COMPANY_FOOTER}`;

  return { subject, text };
}
