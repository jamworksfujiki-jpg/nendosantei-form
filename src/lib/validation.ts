import { z } from 'zod';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[\d\-+() 　]{8,20}$/;

export const ORDER_DEADLINE = new Date('2026-06-15T23:59:59+09:00');
export const FORM_HARD_DEADLINE_DEFAULT = new Date('2026-07-10T23:59:59+09:00');
export const PRICE_PER_SERVICE = 9900;

export function isAfterDeadline(now: Date = new Date()): boolean {
  return now.getTime() > ORDER_DEADLINE.getTime();
}

export function isFormStopped(now: Date = new Date()): boolean {
  const envValue = process.env.NEXT_PUBLIC_FORM_HARD_DEADLINE;
  const limit = envValue ? new Date(envValue) : FORM_HARD_DEADLINE_DEFAULT;
  if (isNaN(limit.getTime())) return false;
  return now.getTime() > limit.getTime();
}

export const uploadedFileSchema = z.object({
  kind: z.enum(['santei', 'roho']),
  storagePath: z.string().min(1).max(500),
  originalFilename: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024),
  mimeType: z.string().max(120).optional(),
});

export const contactSchema = z
  .object({
    rowIndex: z.number().int().min(1).max(50),
    companyName: z.string().trim().min(1, '紹介会社名を入力してください').max(200),
    contactName: z.string().trim().min(1, 'ご担当者名を入力してください').max(100),
    phone: z.string().trim().regex(PHONE_REGEX, '電話番号の形式が正しくありません'),
    email: z.string().trim().regex(EMAIL_REGEX, 'メールアドレスの形式が正しくありません').max(255),
    needsNendoKoshin: z.boolean(),
    needsSantei: z.boolean(),
    files: z.array(uploadedFileSchema).optional().default([]),
  })
  .refine((c) => c.needsNendoKoshin || c.needsSantei, {
    message: '年度更新または算定基礎届のいずれかを選択してください',
    path: ['needsNendoKoshin'],
  });

export const applicationSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(64).optional(),
  submissionMethod: z.enum(['paper', 'email', 'form']),
  applicantOfficeName: z.string().trim().max(200).optional().default(''),
  applicantName: z.string().trim().min(1, 'ご担当者名を入力してください').max(100),
  applicantEmail: z.string().trim().regex(EMAIL_REGEX, 'メールアドレスの形式が正しくありません'),
  applicantPhone: z.string().trim().regex(PHONE_REGEX, '電話番号の形式が正しくありません'),
  deadlineAcknowledged: z.boolean(),
  privacyAgreed: z.literal(true, {
    errorMap: () => ({ message: '個人情報の取り扱いに同意してください' }),
  }),
  contacts: z.array(contactSchema).min(1).max(50),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
