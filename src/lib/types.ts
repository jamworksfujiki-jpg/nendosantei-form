export type SubmissionMethod = 'paper' | 'email' | 'form';
export type FileKind = 'santei' | 'roho' | 'other';

export interface ContactRow {
  rowIndex: number;
  companyName: string;
  companyNameKana: string;
  employeeCount: string;
  contactName: string;
  phone: string;
  email: string;
  freeeInvited: boolean;
  needsNendoKoshin: boolean;
  needsSantei: boolean;
  santeiFile?: File | null;
  rohoFile?: File | null;
}

export interface ApplicationPayload {
  submissionMethod: SubmissionMethod;
  applicantOfficeName: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  deadlineAcknowledged: boolean;
  privacyAgreed: boolean;
  contacts: Omit<ContactRow, 'santeiFile' | 'rohoFile'>[];
}

export interface AdminApplicationRow {
  id: string;
  submission_method: SubmissionMethod;
  applicant_office_name: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  total_contacts: number;
  status: string;
  created_at: string;
}
