import Papa from 'papaparse';
import type { ContactRow } from './types';

export interface ParsedCsvRow {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
}

export function parseContactsCsv(file: File): Promise<ParsedCsvRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data
          .map((r) => ({
            companyName: (r['紹介会社名'] || r['会社名'] || '').toString().trim(),
            contactName: (r['ご担当者名'] || r['担当者名'] || '').toString().trim(),
            phone: (r['お電話番号'] || r['電話番号'] || r['TEL'] || '').toString().trim(),
            email: (r['連絡先メールアドレス'] || r['メールアドレス'] || r['Email'] || '').toString().trim(),
          }))
          .filter((r) => r.companyName || r.contactName || r.phone || r.email)
          .slice(0, 50);
        resolve(rows);
      },
      error: (err) => reject(err),
    });
  });
}

export function buildContactRowFromParsed(parsed: ParsedCsvRow, rowIndex: number): ContactRow {
  return {
    rowIndex,
    companyName: parsed.companyName,
    contactName: parsed.contactName,
    phone: parsed.phone,
    email: parsed.email,
    needsNendoKoshin: true,
    needsSantei: true,
    santeiFile: null,
    rohoFile: null,
  };
}
