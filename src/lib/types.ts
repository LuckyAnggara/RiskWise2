
export const LIKELIHOOD_LEVELS_DESC_MAP = {
  "Hampir tidak terjadi (1)": 1,
  "Jarang terjadi (2)": 2,
  "Kadang Terjadi (3)": 3,
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

export const RISK_SCORE_HEATMAP: Record<number, Record<number, number>> = {
  1: { 1: 1,  2: 3,  3: 5,  4: 8,  5: 20 },
  2: { 1: 2,  2: 7,  3: 11, 4: 13, 5: 21 },
  3: { 1: 4,  2: 10, 3: 14, 4: 17, 5: 22 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
};

export const getCalculatedRiskLevel = (likelihood: LikelihoodLevelDesc | null, impact: ImpactLevelDesc | null): { level: CalculatedRiskLevelCategory | 'N/A'; score: number | null } => {
  if (!likelihood || !impact) return { level: 'N/A', score: null };

  const likelihoodValue = LIKELIHOOD_LEVELS_DESC_MAP[likelihood];
  const impactValue = IMPACT_LEVELS_DESC_MAP[impact];

  if (likelihoodValue === undefined || impactValue === undefined) {
    return { level: 'N/A', score: null };
  }

  const score = RISK_SCORE_HEATMAP[likelihoodValue]?.[impactValue] ?? null;

  if (score === null) {
    return { level: 'N/A', score };
  }

  let level: CalculatedRiskLevelCategory;
  if (score >= 20 && score <= 25) level = 'Sangat Tinggi';
  else if (score >= 16 && score <= 19) level = 'Tinggi';
  else if (score >= 12 && score <= 15) level = 'Sedang';
  else if (score >= 6 && score <= 11) level = 'Rendah';
  else if (score >= 1 && score <= 5) level = 'Sangat Rendah';
  else {
    return { level: 'N/A', score };
  }
  return { level, score };
};

export const getRiskLevelColor = (level: CalculatedRiskLevelCategory | 'N/A') => {
  switch (level?.toLowerCase()) {
    case 'sangat tinggi': return 'bg-red-600 hover:bg-red-700 text-white';
    case 'tinggi': return 'bg-orange-500 hover:bg-orange-600 text-white';
    case 'sedang': return 'bg-yellow-400 hover:bg-yellow-500 text-black dark:bg-yellow-500 dark:text-black';
    case 'rendah': return 'bg-blue-500 hover:bg-blue-600 text-white';
    case 'sangat rendah': return 'bg-green-500 hover:bg-green-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

export const getControlGuidance = (riskLevel: CalculatedRiskLevelCategory | 'N/A'): string => {
  switch (riskLevel) {
    case 'Sangat Tinggi':
    case 'Tinggi':
      return "Disarankan: Preventif (Prv), Mitigasi Risiko (RM), dan Korektif (Crr).";
    case 'Sedang':
      return "Disarankan: Preventif (Prv) dan Mitigasi Risiko (RM).";
    case 'Rendah':
    case 'Sangat Rendah':
      return "Disarankan: Preventif (Prv).";
    default:
      return "Tentukan tingkat risiko penyebab terlebih dahulu untuk mendapatkan panduan pengendalian.";
  }
};

export const RISK_SOURCES = ['Internal', 'Eksternal'] as const;
export type RiskSource = typeof RISK_SOURCES[number];

export const CONTROL_MEASURE_TYPES = {
  'Prv': 'Preventif',
  'RM': 'Mitigasi Risiko',
  'Crr': 'Korektif'
} as const;
export type ControlMeasureTypeKey = keyof typeof CONTROL_MEASURE_TYPES;
export const CONTROL_MEASURE_TYPE_KEYS = Object.keys(CONTROL_MEASURE_TYPES) as ControlMeasureTypeKey[];

export interface UPR {
  id: string; // Firestore document ID
  name: string; // e.g., "Inspektorat Jenderal Kementerian X"
  code: string; // e.g., "ITJEN"
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  // adminUserIds and memberUserIds are removed as user assignment will be on AppUser.uprId
}

export interface Goal {
  id: string;
  uprId: string;
  name: string;
  description: string;
  code: string;
  userId: string;
  period: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PotentialRisk {
  id: string;
  uprId: string;
  goalId: string;
  userId: string;
  period: string;
  sequenceNumber: number;
  description: string;
  category: RiskCategory | null;
  owner: string | null;
  identifiedAt: string;
  updatedAt?: string;
}

export interface RiskCause {
  id: string;
  uprId: string;
  potentialRiskId: string;
  goalId: string;
  userId: string;
  period: string;
  sequenceNumber: number;
  description: string;
  source: RiskSource;
  keyRiskIndicator: string | null;
  riskTolerance: string | null;
  likelihood: LikelihoodLevelDesc | null;
  impact: ImpactLevelDesc | null;
  createdAt: string;
  analysisUpdatedAt?: string;
  potentialRiskCode?: string;
  riskCauseCode?: string;
}

export interface ControlMeasure {
  id: string;
  uprId: string;
  riskCauseId: string;
  potentialRiskId: string;
  goalId: string;
  userId: string;
  period: string;
  controlType: ControlMeasureTypeKey;
  sequenceNumber: number;
  description: string;
  keyControlIndicator: string | null;
  target: string | null;
  responsiblePerson: string | null;
  deadline: string | null;
  budget: number | null;
  createdAt: string;
  updatedAt?: string;
}


export const USER_ROLES = ['admin', 'auditor', 'userSatker'] as const;
export type UserRole = typeof USER_ROLES[number];

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  uprId: string | null;
  activePeriod: string | null;
  availablePeriods: string[] | null;
  riskAppetite?: number | null;
  monitoringSettings?: {
    defaultFrequency?: MonitoringPeriodFrequency | null;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export const getControlTypeName = (typeKey: ControlMeasureTypeKey | null | undefined): string => {
  if (!typeKey) return 'N/A';
  return CONTROL_MEASURE_TYPES[typeKey] || 'Tidak Diketahui';
};

export type MonitoringPeriodFrequency = 'Bulanan' | 'Triwulanan' | 'Semesteran' | 'Tahunan';
export const MONITORING_FREQUENCIES: MonitoringPeriodFrequency[] = ['Bulanan', 'Triwulanan', 'Semesteran', 'Tahunan'];

export type MonitoringSessionStatus = 'Direncanakan' | 'Aktif' | 'Selesai';

export interface MonitoringSession {
  id: string;
  uprId: string;
  userId: string;
  period: string;
  name: string;
  startDate: string;
  endDate: string;
  riskCauseIdsToMonitor: string[];
  status: MonitoringSessionStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface RiskExposure {
  id: string;
  uprId: string;
  monitoringSessionId: string;
  riskCauseId: string;
  userId: string;
  period: string;
  exposureValue: number | null;
  exposureNotes: string | null;
  isToleranceNegative?: boolean | null;
  recordedAt: string;
  updatedAt?: string;
}

export interface MonitoredRiskCauseView extends RiskCause {
  potentialRiskDescription: string;
  goalCode: string;
  potentialRiskCode: string;
  riskCauseCode: string;
  riskExposure?: RiskExposure | null;
}

export interface MonitoredControlMeasureData {
  id: string;
  uprId: string;
  monitoringSessionId: string;
  riskCauseId: string;
  controlMeasureId: string;
  userId: string;
  period: string;
  realizationKCI: string | null;
  isTargetNegative: boolean | null;
  controlPerformance: number | null;
  controlActivityNarrative: string | null;
  supportingDocumentUrl: string | null;
  recordedAt: string;
  updatedAt?: string;
}

export interface FlatReportItem {
  uprCode?: string;
  uprName?: string;
  goalCode?: string;
  goalName?: string;
  goalDescription?: string;

  potentialRiskCode?: string;
  potentialRiskSequenceNumber?: number;
  potentialRiskDescription?: string;
  potentialRiskCategory?: RiskCategory | null;
  potentialRiskOwner?: string | null;

  riskCauseCode?: string;
  riskCauseSequenceNumber?: number;
  riskCauseDescription?: string;
  riskCauseSource?: RiskSource;
  riskCauseKRI?: string | null;
  riskCauseTolerance?: string | null;
  riskCauseLikelihood?: LikelihoodLevelDesc | null;
  riskCauseImpact?: ImpactLevelDesc | null;
  riskCauseLevel?: CalculatedRiskLevelCategory | 'N/A';
  riskCauseScore?: number | null;

  controlMeasureCode?: string;
  controlMeasureSequenceNumber?: number;
  controlMeasureDescription?: string;
  controlMeasureType?: ControlMeasureTypeKey | null;
  controlMeasureTypeName?: string | null;
  controlMeasureKCI?: string | null;
  controlMeasureTarget?: string | null;
  controlMeasurePIC?: string | null;
  controlMeasureDeadline?: string | null;
  controlMeasureBudget?: number | null;
}

    