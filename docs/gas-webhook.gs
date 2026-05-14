/**
 * nendosantei-form 受注を Google Sheets に蓄積する Web App
 *
 * 設置手順:
 * 1. 新規 Google スプレッドシートを作成
 * 2. 拡張機能 → Apps Script
 * 3. このコード全文を貼り付け
 * 4. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *    - 説明: nendosantei-form-webhook
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 全員
 * 5. デプロイ後の「ウェブアプリ URL」をコピー
 * 6. それを Vercel env `GAS_WEBHOOK_URL` に登録
 */

const SHEET_NAME = '受注';

const HEADERS = [
  '受付日時',
  '受付ID',
  'プラン',
  '提出方法',
  '会計事務所名',
  '申込担当者',
  '申込メール',
  '申込電話',
  '顧問先#',
  '顧問先様会社名',
  '会社名（カナ）',
  '従業員数',
  'ご担当者様名',
  'お電話番号',
  'メールアドレス',
  'freee招待',
  '年度更新',
  '算定基礎届',
  '小計',
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }

    const dt = new Date(data.createdAt);
    const contacts = data.contacts || [];

    if (contacts.length === 0) {
      sheet.appendRow([
        dt,
        data.applicationId,
        data.planLabel,
        data.submissionMethod,
        data.applicantOfficeName,
        data.applicantName,
        data.applicantEmail,
        data.applicantPhone,
        '', '', '', '', '', '', '', '', '', '', 0,
      ]);
    } else {
      contacts.forEach((c) => {
        sheet.appendRow([
          dt,
          data.applicationId,
          data.planLabel,
          data.submissionMethod,
          data.applicantOfficeName,
          data.applicantName,
          data.applicantEmail,
          data.applicantPhone,
          c.rowIndex,
          c.companyName,
          c.companyNameKana,
          c.employeeCount,
          c.contactName,
          c.phone,
          c.email,
          c.freeeInvited ? '○' : '',
          c.needsNendoKoshin ? '○' : '',
          c.needsSantei ? '○' : '',
          c.subtotal,
        ]);
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, contactsCount: contacts.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('nendosantei-form webhook is alive')
    .setMimeType(ContentService.MimeType.TEXT);
}
