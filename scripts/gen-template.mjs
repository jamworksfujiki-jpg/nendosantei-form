// 顧問先一括入力用 Excel テンプレートを生成する
// 既存の構造（カラム順・ヘッダー文言）は維持。
// G列「（freee人事労務）スポット社労士くんをご招待されましたか？」を
// 「招待済 / 未招待」のドロップダウンリストに固定する（自由入力で表記揺れが起きないよう）。
//
// 実行: node scripts/gen-template.mjs
// 出力先: public/templates/nendosantei-template.xlsx

import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'public', 'templates', 'nendosantei-template.xlsx');

const HEADERS = [
  '顧問先様会社名(個人の場合屋号)',
  '顧問先様会社名（カナ）',
  '従業員様（役員含む）※単位無し',
  '顧問先様ご担当者様名',
  '顧問先様お電話番号',
  '顧問先様メールアドレス',
  '（freee人事労務）スポット社労士くんをご招待されましたか？',
];

const SAMPLE_ROW = [
  '株式会社サンプル',
  'カブシキガイシャサンプル',
  5,
  '山田太郎',
  '090-1234-5678',
  'sample@example.com',
  '招待済',
];

const NOTES_COL_I = [
  // I3 から下方向に注記を入れる（既存と同じ位置）
  { row: 4, text: '※freee人事労務　招待方法' },
  { row: 5, text: '●freee人事労務の管理者招待方法（info@spot-s.jp）' },
];

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'スポット社労士くん';
  wb.created = new Date();
  const ws = wb.addWorksheet('定例手続き依頼用顧問先リスト');

  // 列幅
  ws.columns = [
    { width: 26 },
    { width: 26 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 28 },
    { width: 38 },
    { width: 4 },
    { width: 50 },
  ];

  // ヘッダー
  HEADERS.forEach((h, i) => {
    const cell = ws.getRow(1).getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  ws.getRow(1).height = 36;

  // サンプル行（淡色で「例：」とわかるように）
  SAMPLE_ROW.forEach((v, i) => {
    const cell = ws.getRow(2).getCell(i + 1);
    cell.value = v;
    cell.font = { color: { argb: 'FF94A3B8' }, italic: true };
    cell.alignment = { vertical: 'middle' };
  });

  // データ入力規則 (G列: freee招待) を 50 行ぶん設定
  // 値: 招待済 / 未招待 のリスト固定
  for (let r = 2; r <= 51; r++) {
    ws.getCell(`G${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"招待済,未招待"'],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: '入力エラー',
      error: 'リストから「招待済」または「未招待」を選択してください',
      promptTitle: 'freee人事労務 招待状況',
      prompt: '「招待済」または「未招待」をリストから選択',
      showInputMessage: true,
    };
  }

  // 従業員数列(C列)も数値のみに
  for (let r = 2; r <= 51; r++) {
    ws.getCell(`C${r}`).dataValidation = {
      type: 'whole',
      operator: 'between',
      allowBlank: true,
      formulae: [0, 10000],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: '入力エラー',
      error: '0〜10000 の整数を入力してください',
    };
  }

  // メモ欄(I列)
  for (const n of NOTES_COL_I) {
    const c = ws.getCell(`I${n.row}`);
    c.value = n.text;
    c.font = { color: { argb: 'FF475569' }, size: 11 };
  }

  // ヘッダー固定
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  await wb.xlsx.writeFile(OUTPUT);
  console.log(`generated: ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
