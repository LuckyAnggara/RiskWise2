
export const LIKELIHOOD_LEVELS_DESC_MAP = {
  "Hampir tidak terjadi (1)": 1,
  "Jarang terjadi (2)": 2,
  "Kadang Terjadi (3)": 3, // Konsisten dengan case di page
  "Sering terjadi (4)": 4,
  "Hampir pasti terjadi (5)": 5,
} as const;
export type LikelihoodLevelDesc = keyof typeof LIKELIHOOD_LEVELS_DESC_MAP;
export const LIKELIHOOD_LEVELS_DESC = Object.keys(LIKELIHOOD_LEVELS_DESC_MAP) as LikelihoodLevelDesc[];


export const IMPACT_LEVELS_DESC_MAP = {
  "Tidak Signifikan (1)": 1,
  "Minor (2)": 2,
  "Moderat (3)": 3,
  "Signifikan (4)": 4,
  "Sangat Signifikan (5)": 5,
} as const;
export type ImpactLevelDesc = keyof typeof IMPACT_LEVELS_DESC_MAP;
export const IMPACT_LEVELS_DESC = Object.keys(IMPACT_LEVELS_DESC_MAP) as ImpactLevelDesc[];


export type CalculatedRiskLevelCategory = 'Sangat Rendah' | 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat Tinggi';
export type RiskLevelDisplay = CalculatedRiskLevelCategory | 'N/A';


export const RISK_CATEGORIES = [
  'Kebijakan',
  'Hukum',
  'Reputasi',
  'Kepatuhan',
  'Keuangan',
  'Fraud',
  'Operasional'
] as const;
export type RiskCategory = typeof RISK_CATEGORIES[number];

export const RISK_SOURCES = ['Internal', 'Eksternal'] as const;
export type RiskSource = typeof RISK_SOURCES[number];

export const CONTROL_MEASURE_TYPES = {
  'Prv': 'Preventif',
  'RM': 'Mitigasi Risiko',
  'Crr': 'Korektif'
} as const;
export type ControlMeasureTypeKey = keyof typeof CONTROL_MEASURE_TYPES;
export const CONTROL_MEASURE_TYPE_KEYS = Object.keys(CONTROL_MEASURE_TYPES) as ControlMeasureTypeKey[];


export interface Goal {
  id: string;
  name: string;
  description: string;
  code: string; // e.g., K1, P2
  userId: string; 
  period: string; 
  createdAt: string; // ISO string date
  updatedAt?: string; // ISO string date
}

export interface PotentialRisk {
  id: string;
  goalId: string;
  userId: string; 
  period: string; 
  sequenceNumber: number; // e.g., 1, 2, 3 (relative to goal)
  description: string;
  category: RiskCategory | null;
  owner: string | null;
  identifiedAt: string; // ISO string date
  updatedAt?: string; // ISO string date
}

export interface RiskCause {
  id: string;
  potentialRiskId: string;
  goalId: string; 
  userId: string; 
  period: string; 
  sequenceNumber: number; // e.g., 1, 2, 3 (relative to potentialRisk)
  description: string;
  source: RiskSource;
  keyRiskIndicator: string | null;
  riskTolerance: string | null; // Deskripsi toleransi
  riskToleranceValue?: number | null; // Nilai numerik toleransi jika ada
  likelihood: LikelihoodLevelDesc | null;
  impact: ImpactLevelDesc | null;
  createdAt: string; // ISO string date
  analysisUpdatedAt?: string; // ISO string date
}

export interface ControlMeasure {
  id: string;
  riskCauseId: string;
  potentialRiskId: string; // For context
  goalId: string; // For context
  userId: string; 
  period: string; 
  controlType: ControlMeasureTypeKey;
  sequenceNumber: number; // e.g., 1, 2, 3 (relative to riskCauseId and controlType)
  description: string;
  keyControlIndicator: string | null;
  target: string | null;
  responsiblePerson: string | null;
  deadline: string | null; // ISO string date
  budget: number | null;
  createdAt: string; // ISO string date
  updatedAt?: string; // ISO string date
}


export type UserRole = 'admin' | 'userSatker';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null; // This is the UPR Name
  photoURL: string | null;
  role: UserRole;
  uprId: string | null; // Will be same as displayName
  activePeriod: string | null;
  availablePeriods: string[] | null;
  riskAppetite: number | null;
  monitoringSettings?: {
    defaultFrequency?: MonitoringPeriodFrequency | null;
  } | null;
  createdAt: string; // ISO string date
  updatedAt?: string; // ISO string date
}

export const getControlTypeName = (typeKey: ControlMeasureTypeKey): string => {
  return CONTROL_MEASURE_TYPES[typeKey];
};

// Pemantauan dan Reviu Types
export type MonitoringPeriodFrequency = 'Bulanan' | 'Triwulanan' | 'Semesteran' | 'Tahunan';
export const MONITORING_FREQUENCIES: MonitoringPeriodFrequency[] = ['Bulanan', 'Triwulanan', 'Semesteran', 'Tahunan'];

export type MonitoringSessionStatus = 'Direncanakan' | 'Aktif' | 'Selesai';

export interface MonitoringSession {
  id: string;
  userId: string;
  period: string; // Periode aplikasi saat sesi dibuat
  name: string; // Misal: "Pemantauan Triwulan 1 2024"
  startDate: string; // ISO string date
  endDate: string; // ISO string date
  riskCauseIdsToMonitor: string[]; // ID dari RiskCause yang dipilih untuk dipantau
  status: MonitoringSessionStatus;
  createdAt: string; // ISO string date
  updatedAt?: string; // ISO string date
}

export interface RiskExposure {
  id: string; // ID dokumen Firestore
  monitoringSessionId: string;
  riskCauseId: string;
  userId: string;
  period: string; // Periode aplikasi saat sesi dibuat
  exposureValue: number | null; // "Risiko yang terjadi" (angka)
  exposureNotes: string | null;
  isToleransiExceeded?: boolean | null; // Dihitung: exposureValue > riskToleranceValue
  recordedAt: string; // ISO string date (kapan data ini diinput/direkam)
  updatedAt?: string; // ISO string date
}

// Untuk tampilan di halaman conduct
export interface MonitoredRiskCauseView extends RiskCause {
  potentialRiskDescription: string;
  goalCode: string;
  potentialRiskCode: string; // Misal: S1.PR1
  riskCauseCode: string; // Misal: S1.PR1.PC1
  riskExposure?: RiskExposure | null; 
  // akan ditambahkan properti lain dari potential risk dan goal jika perlu
}

export interface MonitoredControlMeasureData {
  controlMeasureId: string;
  realizationKCI: string | null;
  performance?: number | null; // Hasil perhitungan kinerja
  controlActivityNotes: string | null;
  supportingDocumentUrl?: string | null; // Link ke data dukung
  followUpPlan?: string | null;
  monitoringSessionId: string; // Untuk menautkan ke sesi pemantauan
  riskCauseId: string; // Untuk konteks
  userId: string;
  period: string;
  recordedAt: string;
  updatedAt?: string;
}
