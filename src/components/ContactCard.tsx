'use client';

import type { ContactRow } from '@/lib/types';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface Props {
  contact: ContactRow;
  index: number;
  total: number;
  onUpdate: (rowIndex: number, patch: Partial<ContactRow>) => void;
  onRemove: (rowIndex: number) => void;
  errors?: Partial<Record<keyof ContactRow, string>>;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / (1024 * 1024)).toFixed(2)}MB`;
}

function FileField({
  label,
  file,
  onChange,
  required,
  fieldId,
  error,
}: {
  label: string;
  file: File | null | undefined;
  onChange: (f: File | null) => void;
  required: boolean;
  fieldId: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="btn-secondary inline-flex items-center cursor-pointer">
          <input
            id={fieldId}
            type="file"
            accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg"
            className="sr-only"
            aria-invalid={!!error}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && !ALLOWED_TYPES.includes(f.type) && !/\.(pdf|xlsx?|png|jpe?g)$/i.test(f.name)) {
                alert(`対応形式は PDF / Excel / PNG / JPEG です（${f.type || '不明'}）`);
                e.target.value = '';
                return;
              }
              if (f && f.size > MAX_FILE_BYTES) {
                alert(`ファイルサイズが上限（5MB）を超えています：${formatBytes(f.size)}`);
                e.target.value = '';
                return;
              }
              onChange(f);
            }}
          />
          <span>{file ? '別のファイルに変更' : 'ファイルを選択'}</span>
        </label>
        {file && (
          <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
            <span className="font-medium truncate max-w-[200px]" title={file.name}>{file.name}</span>
            <span className="text-xs text-gray-500">{formatBytes(file.size)}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-red-600 hover:text-red-700 font-bold text-lg leading-none px-1"
              aria-label="ファイルを削除"
            >
              ×
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export default function ContactCard({ contact, index, total, onUpdate, onRemove, errors }: Props) {
  const idBase = `c${contact.rowIndex}`;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-bold text-gray-900">
          顧問先 #{index + 1}
          <span className="ml-2 text-xs font-normal text-gray-500">({index + 1} / {total})</span>
        </h4>
        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemove(contact.rowIndex)}
            className="text-sm text-red-600 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
            aria-label={`顧問先 #${index + 1} を削除`}
          >
            × 削除
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${idBase}-company`} className="block text-sm font-medium text-gray-700 mb-1">
            紹介会社名 <span className="text-red-600">*</span>
          </label>
          <input
            id={`${idBase}-company`}
            type="text"
            className="input-base"
            value={contact.companyName}
            onChange={(e) => onUpdate(contact.rowIndex, { companyName: e.target.value })}
            placeholder="株式会社○○"
            aria-invalid={!!errors?.companyName}
            autoComplete="organization"
          />
          {errors?.companyName && <p className="text-sm text-red-600 mt-1">{errors.companyName}</p>}
        </div>
        <div>
          <label htmlFor={`${idBase}-contact`} className="block text-sm font-medium text-gray-700 mb-1">
            ご担当者名 <span className="text-red-600">*</span>
          </label>
          <input
            id={`${idBase}-contact`}
            type="text"
            className="input-base"
            value={contact.contactName}
            onChange={(e) => onUpdate(contact.rowIndex, { contactName: e.target.value })}
            placeholder="山田 太郎"
            aria-invalid={!!errors?.contactName}
            autoComplete="name"
          />
          {errors?.contactName && <p className="text-sm text-red-600 mt-1">{errors.contactName}</p>}
        </div>
        <div>
          <label htmlFor={`${idBase}-phone`} className="block text-sm font-medium text-gray-700 mb-1">
            お電話番号 <span className="text-red-600">*</span>
          </label>
          <input
            id={`${idBase}-phone`}
            type="tel"
            inputMode="tel"
            className="input-base"
            value={contact.phone}
            onChange={(e) => onUpdate(contact.rowIndex, { phone: e.target.value })}
            placeholder="03-1234-5678"
            aria-invalid={!!errors?.phone}
            autoComplete="tel"
          />
          {errors?.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor={`${idBase}-email`} className="block text-sm font-medium text-gray-700 mb-1">
            連絡先メールアドレス <span className="text-red-600">*</span>
          </label>
          <input
            id={`${idBase}-email`}
            type="email"
            inputMode="email"
            className="input-base"
            value={contact.email}
            onChange={(e) => onUpdate(contact.rowIndex, { email: e.target.value })}
            placeholder="example@example.com"
            aria-invalid={!!errors?.email}
            autoComplete="email"
          />
          {errors?.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
        <FileField
          label="算定基礎届"
          file={contact.santeiFile}
          onChange={(f) => onUpdate(contact.rowIndex, { santeiFile: f })}
          required
          fieldId={`${idBase}-santei`}
          error={errors?.santeiFile}
        />
        <FileField
          label="労働保険料申告書"
          file={contact.rohoFile}
          onChange={(f) => onUpdate(contact.rowIndex, { rohoFile: f })}
          required
          fieldId={`${idBase}-roho`}
          error={errors?.rohoFile}
        />
      </div>
    </div>
  );
}
