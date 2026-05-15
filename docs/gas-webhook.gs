/**
 * nendosantei-form 受注を Google Sheets に蓄積する Web App
 *
 * 設置手順（重要：SPREADSHEET_ID を直接指定する方式）:
 * 1. 既存のスプレッドシートを開く（または新規作成）
 * 2. URL から ID をコピー（例: docs.google.com/spreadsheets/d/【ココ】/edit）
 * 3. 下の SPREADSHEET_ID 定数に貼り付け
 * 4. 拡張機能 → Apps Script
 * 5. このコード全文を貼り付け → 保存 (Ctrl+S)
 * 6. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *    - 説明: nendosantei-form-webhook
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 全員
 * 7. デプロイ後の「ウェブアプリ URL」をコピー
 * 8. それを Vercel env `GAS_WEBHOOK_URL` に登録
 * 9. コード更新時は「デプロイを管理 → 鉛筆アイコン → 新バージョン → デプロイ」で再デプロイ必要
 */

const SPREADSHEET_ID = '16crC5G0R0vEnPGKmRjo4zhigoF_Yf-LU0m2ojyihy3w';
const SHEET_NAME = '受注';

const HEADERS = [
  '受付日時', '受付ID', 'プラン', '提出方法',
  '会計事務所名', '申込担当者', '申込メール', '申込電話',
  '顧問先#', '顧問先様会社名', '会社名（カナ）', '従業員数',
  'ご担当者様名', 'お電話番号', 'メールアドレス',
  'freee招待', '年度更新', '算定基礎届', '小計',
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
        dt, data.applicationId, data.planLabel, data.submissionMethod,
        data.applicantOfficeName, data.applicantName, data.applicantEmail, data.applicantPhone,
        '', '', '', '', '', '', '', '', '', '', 0,
      ]);
    } else {
      contacts.forEach(function(c) {
        sheet.appendRow([
          dt, data.applicationId, data.planLabel, data.submissionMethod,
          data.applicantOfficeName, data.applicantName, data.applicantEmail, data.applicantPhone,
          c.rowIndex, c.companyName, c.companyNameKana, c.employeeCount,
          c.contactName, c.phone, c.email,
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
    .createTextOutput('alive bound to ' + SPREADSHEET_ID)
    .setMimeType(ContentService.MimeType.TEXT);
}
