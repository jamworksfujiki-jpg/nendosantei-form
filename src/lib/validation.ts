import { z } from 'zod';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[\d\-+() 　]{8,20}$/;

export const ORDER_DEADLINE = new Date('2026-06-15T23:59:59+09:00');

export function isAfterDeadline(now: Date = new Date()): boolean {
  return now.getTime() > ORDER_DEADLINE.getTime();
}

export const contactSchema = z.object({
  rowIndex: z.number().int().min(1).max(50),
  companyName: z.string().trim().min(1, '紹介会社名を入力してください').max(200),
  contactName: z.string().trim().min(1, 'ご担当者名を入力してください').max(100),
  phone: z.string().trim().regex(PHONE_REGEX, '電話番号の形式が正しくありません'),
  email: z.string().trim().regex(EMAIL_REGEX, 'メールアドレスの形式が正しくありません').max(255),
});

export const applicationSchema = z.object({
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
