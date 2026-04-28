import * as XLSX from 'xlsx';
import type { ContactRow } from './types';

export interface ParsedContactRow {
  companyName: string;
  companyNameKana: string;
  employeeCount: string;
  contactName: string;
  phone: string;
  email: string;
  freeeInvited: boolean;
}

const TRUE_TOKENS = ['○', '◯', '◎', '✓', '✔', 'はい', 'yes', 'y', '済', '招待済', '済み', 'true', '1'];

function parseFreeeInvited(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === 'number') return v !== 0;
  if (typeof v !== 'string') return false;
  const norm = v.trim().toLowerCase();
  if (!norm) return false;
  return TRUE_TOKENS.some((t) => norm === t.toLowerCase() || norm.includes(t.toLowerCase()));
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return '';
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

export async function parseContactsXlsx(file: File): Promise<ParsedContactRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });

  return rows
    .map<ParsedContactRow>((r) => ({
      companyName: toStr(pick(r, ['顧問先様会社名(個人の場合屋号)', '顧問先様会社名（個人の場合屋号）', '顧問先様会社名', '会社名', '紹介会社名'])),
      companyNameKana: toStr(pick(r, ['顧問先様会社名（カナ）', '顧問先様会社名(カナ)', '会社名カナ', 'カナ', 'フリガナ'])),
      employeeCount: toStr(pick(r, ['従業員様（役員含む）※単位無し', '従業員様(役員含む)※単位無し', '従業員数', '従業員様（役員含む）'])),
      contactName: toStr(pick(r, ['顧問先様ご担当者様名', 'ご担当者様名', 'ご担当者名', '担当者名'])),
      phone: toStr(pick(r, ['顧問先様お電話番号', 'お電話番号', '電話番号', 'TEL'])),
      email: toStr(pick(r, ['顧問先様メールアドレス', 'メールアドレス', 'Email', 'email'])),
      freeeInvited: parseFreeeInvited(
        pick(r, [
          '（freee人事労務）スポット社労士くんをご招待されましたか？',
          '(freee人事労務)スポット社労士くんをご招待されましたか？',
          'freee招待',
          'freee人事労務 招待',
        ]),
      ),
    }))
    .filter(
      (r) => r.companyName || r.contactName || r.phone || r.email || r.companyNameKana || r.employeeCount,
    )
    .slice(0, 50);
}

export function buildContactRowFromParsed(parsed: ParsedContactRow, rowIndex: number): ContactRow {
  return {
    rowIndex,
    companyName: parsed.companyName,
    companyNameKana: parsed.companyNameKana,
    employeeCount: parsed.employeeCount,
    contactName: parsed.contactName,
    phone: parsed.phone,
    email: parsed.email,
    freeeInvited: parsed.freeeInvited,
    needsNendoKoshin: true,
    needsSantei: true,
    santeiFile: null,
    rohoFile: null,
  };
}
