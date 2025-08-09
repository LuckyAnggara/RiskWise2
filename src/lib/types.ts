
/**
 * @fileoverview Risk Management Type Definitions and Utilities
 * 
 * This file contains core type definitions, constants, and utility functions
 * for the RiskWise risk management system, including risk assessment matrices,
 * likelihood/impact scales, and risk calculation algorithms.
 */

import { Timestamp } from 'firebase/firestore';

// ===========================================
// Risk Assessment Scales
// ===========================================

/**
 * Likelihood levels mapping Indonesian descriptions to numeric values (1-5 scale)
 * Used for risk probability assessment in the risk matrix
 */
export const LIKELIHOOD_LEVELS_DESC_MAP = {
  "Hampir tidak terjadi (1)": 1,
  "Jarang terjadi (2)": 2,
  "Kadang Terjadi (3)": 3,
  "Sering terjadi (4)": 4,
  "Hampir pasti terjadi (5)": 5,
} as const;

/** Type for likelihood level descriptions */
export type LikelihoodLevelDesc = keyof typeof LIKELIHOOD_LEVELS_DESC_MAP;

/** Array of all likelihood level descriptions for UI dropdowns */
export const LIKELIHOOD_LEVELS_DESC = Object.keys(LIKELIHOOD_LEVELS_DESC_MAP) as LikelihoodLevelDesc[];

/**
 * Impact levels mapping Indonesian descriptions to numeric values (1-5 scale)
 * Used for risk consequence assessment in the risk matrix
 */
export const IMPACT_LEVELS_DESC_MAP = {
  "Tidak Signifikan (1)": 1,
  "Minor (2)": 2,
  "Moderat (3)": 3,
  "Signifikan (4)": 4,
  "Sangat Signifikan (5)": 5,
} as const;

/** Type for impact level descriptions */
export type ImpactLevelDesc = keyof typeof IMPACT_LEVELS_DESC_MAP;

/** Array of all impact level descriptions for UI dropdowns */
export const IMPACT_LEVELS_DESC = Object.keys(IMPACT_LEVELS_DESC_MAP) as ImpactLevelDesc[];

// ===========================================
// Risk Level Categories
// ===========================================

/** Risk level categories based on calculated risk scores */
export type CalculatedRiskLevelCategory = 'Sangat Rendah' | 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat Tinggi';

/** Display type for risk levels including N/A for unassessed risks */
export type RiskLevelDisplay = CalculatedRiskLevelCategory | 'N/A';

// ===========================================
// Risk Categories
// ===========================================

/**
 * Standard risk categories used in Indonesian risk management frameworks
 * Based on common organizational risk taxonomies
 */
export const RISK_CATEGORIES = [
  'Kebijakan',    // Policy
  'Hukum',        // Legal
  'Reputasi',     // Reputation
  'Kepatuhan',    // Compliance
  'Keuangan',     // Financial
  'Fraud',        // Fraud
  'Operasional'   // Operational
] as const;

/** Type for risk categories */
export type RiskCategory = typeof RISK_CATEGORIES[number];

// ===========================================
// Risk Assessment Matrix
// ===========================================

/**
 * Risk score heatmap matrix (Likelihood × Impact = Risk Score)
 * 
 * This matrix follows Indonesian risk management standards:
 * - Rows: Likelihood (1-5)
 * - Columns: Impact (1-5) 
 * - Values: Risk Score (1-25)
 * 
 * Risk levels are categorized as:
 * - 1-5: Sangat Rendah (Very Low)
 * - 6-11: Rendah (Low)
 * - 12-15: Sedang (Medium)
 * - 16-19: Tinggi (High)
 * - 20-25: Sangat Tinggi (Very High)
 */
export const RISK_SCORE_HEATMAP: Record<number, Record<number, number>> = {
  1: { 1: 1,  2: 3,  3: 5,  4: 8,  5: 20 },
  2: { 1: 2,  2: 7,  3: 11, 4: 13, 5: 21 },
  3: { 1: 4,  2: 10, 3: 14, 4: 17, 5: 22 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
};

/**
 * Calculate risk level and score based on likelihood and impact assessments
 * 
 * @param likelihood - The assessed likelihood level description
 * @param impact - The assessed impact level description
 * @returns Object containing calculated risk level category and numeric score
 * 
 * @example
 * ```typescript
 * const result = getCalculatedRiskLevel("Sering terjadi (4)", "Signifikan (4)");
 * console.log(result); // { level: "Tinggi", score: 19 }
 * ```
 */
export const getCalculatedRiskLevel = (
  likelihood: LikelihoodLevelDesc | null, 
  impact: ImpactLevelDesc | null
): { level: CalculatedRiskLevelCategory | 'N/A'; score: number | null } => {
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

/**
 * Get Tailwind CSS classes for risk level color coding
 * 
 * @param level - The calculated risk level category
 * @returns Tailwind CSS classes for background, hover, and text colors
 * 
 * @example
 * ```typescript
 * const colorClasses = getRiskLevelColor("Tinggi");
 * // Returns: "bg-orange-500 hover:bg-orange-600 text-white"
 * ```
 */
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

/**
 * Get control measure guidance based on risk level
 * 
 * Provides recommendations for types of controls to implement based on
 * the assessed risk level following Indonesian risk management best practices.
 * 
 * @param riskLevel - The calculated risk level category
 * @returns Guidance text in Indonesian for recommended control types
 * 
 * @example
 * ```typescript
 * const guidance = getControlGuidance("Tinggi");
 * // Returns: "Disarankan: Preventif (Prv), Mitigasi Risiko (RM), dan Korektif (Crr)."
 * ```
 */
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

// ===========================================
// Risk Management Configuration
// ===========================================

/** Risk sources indicating origin of the risk */
export const RISK_SOURCES = ['Internal', 'Eksternal'] as const;
export type RiskSource = typeof RISK_SOURCES[number];

/**
 * Control measure types mapping abbreviations to full Indonesian descriptions
 * Used in control measure categorization and reporting
 */
export const CONTROL_MEASURE_TYPES = {
  'Prv': 'Preventif',
  'RM': 'Mitigasi Risiko',
  'Crr': 'Korektif'
} as const;

export type ControlMeasureTypeKey = keyof typeof CONTROL_MEASURE_TYPES;
export const CONTROL_MEASURE_TYPE_KEYS = Object.keys(CONTROL_MEASURE_TYPES) as ControlMeasureTypeKey[];

// ===========================================
// Core Data Models
// ===========================================

/**
 * UPR (Unit Pengelola Risiko) - Risk Management Unit
 * 
 * Represents an organizational unit responsible for risk management.
 * Each UPR has its own risk appetite and manages risks independently.
 */
export interface UPR {
  /** Unique identifier */
  id: string; 
  /** Display name of the unit */
  name: string; 
  /** Short code for the unit */
  code: string; 
  /** Optional description of the unit's responsibilities */
  description?: string | null;
  /** Risk appetite level (1-25 scale, matches risk scoring) */
  riskAppetite?: number | null;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt?: string;
}

/**
 * Goal (Sasaran) - Strategic Goal or Objective
 * 
 * Represents a strategic goal or objective that the organization
 * aims to achieve. Goals are the foundation for risk identification.
 */
export interface Goal {
  /** Unique identifier */
  id: string;
  /** Reference to the UPR managing this goal */
  uprId: string;
  /** Goal title/name */
  name: string;
  /** Detailed description of the goal */
  description: string;
  /** Short code for the goal */
  code: string;
  /** User who created this goal */
  userId: string;
  /** Assessment period this goal belongs to */
  period: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt?: string;
}

/**
 * PotentialRisk (Potensi Risiko) - Identified Risk
 * 
 * Represents a potential risk that could impact goal achievement.
 * Each potential risk is associated with a specific goal and can have
 * multiple underlying causes.
 */
export interface PotentialRisk {
  /** Unique identifier */
  id: string;
  /** Reference to the UPR */
  uprId: string;
  /** Reference to the associated goal */
  goalId: string;
  /** User who identified this risk */
  userId: string;
  /** Assessment period */
  period: string;
  /** Sequential number within the goal */
  sequenceNumber: number;
  /** Description of the potential risk */
  description: string;
  /** Risk category classification */
  category: RiskCategory | null;
  /** Person responsible for managing this risk */
  owner: string | null;
  /** When the risk was first identified */
  identifiedAt: string;
  /** Last update timestamp */
  updatedAt?: string;
}

/**
 * RiskCause (Penyebab Risiko) - Risk Cause
 * 
 * Represents a specific cause of a potential risk. This is where
 * likelihood and impact assessments are performed, and risk scores
 * are calculated.
 */
export interface RiskCause {
  /** Unique identifier */
  id: string;
  /** Reference to the UPR */
  uprId: string;
  /** Reference to the parent potential risk */
  potentialRiskId: string;
  /** Reference to the goal */
  goalId: string;
  /** User who created this cause */
  userId: string;
  /** Assessment period */
  period: string;
  /** Sequential number within the potential risk */
  sequenceNumber: number;
  /** Description of the risk cause */
  description: string;
  /** Source of the risk (internal/external) */
  source: RiskSource;
  /** Key Risk Indicator for monitoring */
  keyRiskIndicator: string | null;
  /** Risk tolerance threshold */
  riskTolerance: string | null;
  /** Assessed likelihood level */
  likelihood: LikelihoodLevelDesc | null;
  /** Assessed impact level */
  impact: ImpactLevelDesc | null;
  /** Creation timestamp */
  createdAt: string;
  /** When risk analysis was last updated */
  analysisUpdatedAt?: string;
  /** Auto-generated potential risk code */
  potentialRiskCode?: string;
  /** Auto-generated risk cause code */
  riskCauseCode?: string;
}

/**
 * ControlMeasure (Tindakan Pengendalian) - Control Measure
 * 
 * Represents a control measure designed to mitigate a specific risk cause.
 * Control measures can be preventive, risk mitigation, or corrective.
 */
export interface ControlMeasure {
  /** Unique identifier */
  id: string;
  /** Reference to the UPR */
  uprId: string;
  /** Reference to the risk cause being controlled */
  riskCauseId: string;
  /** Reference to the potential risk */
  potentialRiskId: string;
  /** Reference to the goal */
  goalId: string;
  /** User who created this control */
  userId: string;
  /** Assessment period */
  period: string;
  /** Type of control (Preventive, Risk Mitigation, Corrective) */
  controlType: ControlMeasureTypeKey;
  /** Sequential number within the risk cause */
  sequenceNumber: number;
  /** Description of the control measure */
  description: string;
  /** Key Control Indicator for monitoring effectiveness */
  keyControlIndicator: string | null;
  /** Target value or outcome */
  target: string | null;
  /** Person responsible for implementing the control */
  responsiblePerson: string | null;
  /** Implementation deadline */
  deadline: string | null;
  /** Budget allocated for this control */
  budget: number | null;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt?: string;
}


// ===========================================
// User Management
// ===========================================

/** Available user roles in the system */
export const USER_ROLES = ['admin', 'auditor', 'userSatker'] as const;
export type UserRole = typeof USER_ROLES[number];

/**
 * AppUser - Application User Profile
 * 
 * Represents a user in the RiskWise system with role-based access
 * and organizational context (UPR and period assignments).
 */
export interface AppUser {
  /** Firebase Auth UID */
  uid: string;
  /** User email address */
  email: string | null;
  /** Display name */
  displayName: string | null;
  /** Profile photo URL */
  photoURL: string | null;
  /** User role (admin, auditor, userSatker) */
  role: UserRole;
  /** Assigned UPR ID (organizational unit) */
  uprId: string | null;
  /** Currently active assessment period */
  activePeriod: string | null;
  /** List of available periods for this user */
  availablePeriods: string[] | null;
  /** Monitoring preferences and settings */
  monitoringSettings?: {
    /** Default frequency for monitoring sessions */
    defaultFrequency?: MonitoringPeriodFrequency | null;
  } | null;
  /** Account creation timestamp */
  createdAt: string;
  /** Last profile update timestamp */
  updatedAt?: string;
}

/**
 * Get human-readable name for control measure type
 * 
 * @param typeKey - Control measure type key
 * @returns Full Indonesian description of the control type
 */
export const getControlTypeName = (typeKey: ControlMeasureTypeKey | null | undefined): string => {
  if (!typeKey) return 'N/A';
  return CONTROL_MEASURE_TYPES[typeKey] || 'Tidak Diketahui';
};

// ===========================================
// Monitoring & Assessment
// ===========================================

/** Available monitoring frequencies */
export type MonitoringPeriodFrequency = 'Bulanan' | 'Triwulanan' | 'Semesteran' | 'Tahunan';
export const MONITORING_FREQUENCIES: MonitoringPeriodFrequency[] = ['Bulanan', 'Triwulanan', 'Semesteran', 'Tahunan'];

/** Status options for monitoring sessions */
export type MonitoringSessionStatus = 'Direncanakan' | 'Aktif' | 'Selesai';

/**
 * MonitoringSession - Risk Monitoring Session
 * 
 * Represents a monitoring session where risk exposures and control
 * effectiveness are assessed over a specific time period.
 */
export interface MonitoringSession {
  /** Unique identifier */
  id: string;
  /** Reference to the UPR */
  uprId: string;
  /** User conducting the monitoring */
  userId: string;
  /** Assessment period */
  period: string;
  /** Session name/title */
  name: string;
  /** Monitoring start date */
  startDate: string;
  /** Monitoring end date */
  endDate: string;
  /** List of risk cause IDs to monitor in this session */
  riskCauseIdsToMonitor: string[];
  /** Current status of the monitoring session */
  status: MonitoringSessionStatus;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt?: string;
}

/**
 * RiskExposure - Risk Exposure Assessment
 * 
 * Represents the assessed exposure level of a risk cause during
 * a monitoring session, compared against tolerance thresholds.
 */
export interface RiskExposure {
  /** Unique identifier */
  id: string;
  /** Reference to the UPR */
  uprId: string;
  /** Reference to the monitoring session */
  monitoringSessionId: string;
  /** Reference to the risk cause being monitored */
  riskCauseId: string;
  /** User who recorded the exposure */
  userId: string;
  /** Assessment period */
  period: string;
  /** Assessed exposure value */
  exposureValue: number | null;
  /** Notes about the exposure assessment */
  exposureNotes: string | null;
  /** Whether exposure exceeds tolerance (negative = exceeds) */
  isToleranceNegative?: boolean | null;
  /** When the exposure was recorded */
  recordedAt: string;
  /** Last update timestamp */
  updatedAt?: string;
}

/**
 * MonitoredRiskCauseView - Enhanced Risk Cause for Monitoring
 * 
 * Extended view of RiskCause with additional fields for monitoring
 * context including parent risk and goal information.
 */
export interface MonitoredRiskCauseView extends RiskCause {
  /** Description of the parent potential risk */
  potentialRiskDescription: string;
  /** Code of the parent goal */
  goalCode: string;
  /** Auto-generated potential risk code */
  potentialRiskCode: string;
  /** Auto-generated risk cause code */
  riskCauseCode: string;
  /** Associated risk exposure data (if any) */
  riskExposure?: RiskExposure | null;
}

/**
 * MonitoredControlMeasureData - Control Performance Assessment
 * 
 * Represents the performance assessment of a control measure during
 * a monitoring session, including KCI realization and effectiveness.
 */
export interface MonitoredControlMeasureData {
  /** Unique identifier */
  id: string;
  /** Reference to the UPR */
  uprId: string;
  /** Reference to the monitoring session */
  monitoringSessionId: string;
  /** Reference to the risk cause */
  riskCauseId: string;
  /** Reference to the control measure */
  controlMeasureId: string;
  /** User who recorded the data */
  userId: string;
  /** Assessment period */
  period: string;
  /** Realized Key Control Indicator value */
  realizationKCI: string | null;
  /** Whether target was not met (negative = not met) */
  isTargetNegative: boolean | null;
  /** Control performance percentage */
  controlPerformance: number | null;
  /** Narrative description of control activities */
  controlActivityNarrative: string | null;
  /** URL to supporting documentation */
  supportingDocumentUrl: string | null;
  /** When the data was recorded */
  recordedAt: string;
  /** Last update timestamp */
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

    
