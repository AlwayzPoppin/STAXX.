
export enum TransactionCategory {
  INCOME = 'INCOME',
  MILEAGE = 'MILEAGE',
  PLATFORM_FEES = 'PLATFORM_FEES',
  BUSINESS_EQUIPMENT = 'BUSINESS_EQUIPMENT',
  HOME_OFFICE = 'HOME_OFFICE',
  COMMUNICATIONS = 'COMMUNICATIONS',
  MARKETING = 'MARKETING',
  W2_WITHHOLDING = 'W2_WITHHOLDING',
  OTHER = 'OTHER'
}

export type WorkerType = 'GIG' | 'W2';

export enum FilingStep {
  PROFILE = 'PROFILE',
  DOCUMENTS = 'DOCUMENTS',
  INCOME = 'INCOME',
  EXPENSES = 'EXPENSES',
  DEDUCTIONS = 'DEDUCTIONS',
  SUMMARY = 'SUMMARY',
  COMPLETE = 'COMPLETE'
}

export interface LegalDocument {
  id: string;
  type: 'W2' | '1099' | 'ID' | 'OTHER';
  fileName: string;
  uploadDate: string;
  status: 'VERIFIED' | 'PENDING' | 'ERROR';
  extractedData?: any;
}

export interface UserProfile {
  name: string;
  email: string;
  workerType: WorkerType;
  filingStatus?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phoneNumber?: string;
  dob?: string;
  ssn?: string; // Encrypted/Masked in UI
  avatar?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: TransactionCategory;
  isDeductible: boolean;
  confidence: number;
  aiNotes?: string;
  platform?: string;
}

export interface TaxSummary {
  totalGrossIncome: number;
  totalBusinessExpenses: number;
  totalWithholding?: number;
  netProfit: number;
  estimatedTaxLiability: number;
  projectedRefund?: number;
  effectiveTaxRate?: number;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  sources?: any[];
}