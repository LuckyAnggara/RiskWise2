
"use client";

import { create } from 'zustand';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, AppUser, MonitoringSession, RiskExposure, MonitoredControlMeasureData, ControlMeasureTypeKey, MonitoringSessionStatus } from '@/lib/types'; // Added ControlMeasureTypeKey
import { 
  addGoal as addGoalToService, 
  getGoals as getGoalsFromService, 
  updateGoal as updateGoalInService, 
  deleteGoal as deleteGoalFromService 
} from '@/services/goalService';
import {
  addPotentialRisk as addPotentialRiskToService,
  getPotentialRisksByGoalId as getPotentialRisksByGoalIdFromService,
  updatePotentialRisk as updatePotentialRiskInService,
  deletePotentialRiskAndSubCollections as deletePotentialRiskFromService,
  getPotentialRiskById as getPotentialRiskByIdFromService,
} from '@/services/potentialRiskService';
import {
  addRiskCause as addRiskCauseToService,
  getRiskCausesByPotentialRiskId as getRiskCausesByPotentialRiskIdFromService,
  updateRiskCause as updateRiskCauseInService,
  deleteRiskCauseAndSubCollections as deleteRiskCauseFromService,
  getRiskCauseById as getRiskCauseByIdFromService,
} from '@/services/riskCauseService';
import {
  addControlMeasure as addControlMeasureToService,
  getControlMeasuresByRiskCauseId as fetchControlMeasuresByRiskCauseIdFromService,
  updateControlMeasure as updateControlMeasureInService,
  deleteControlMeasure as deleteControlMeasureFromService,
  getControlMeasureById as getControlMeasureByIdFromService,
} from '@/services/controlMeasureService';
import {
  addMonitoringSession as addMonitoringSessionToService,
  getMonitoringSessions as getMonitoringSessionsFromService,
  updateMonitoringSessionStatus as updateMonitoringSessionStatusInService,
  getMonitoringSessionById as getMonitoringSessionByIdFromService,
  deleteMonitoringSession as deleteMonitoringSessionFromService, 
} from '@/services/monitoringService';
import {
  upsertRiskExposure as upsertRiskExposureToService,
  getRiskExposuresBySession as getRiskExposuresBySessionFromService,
} from '@/services/riskExposureService';
// Placeholder for MonitoredControlMeasureData service functions
// import { upsertMonitoredControlMeasure, getMonitoredControlMeasuresForSessionAndCause } from '@/services/monitoredControlMeasureService';


interface AppState {
  // User context
  activeUprId: string | null; // Changed from currentUserId
  activePeriod: string | null; // Renamed from currentPeriod for clarity
  dataFetchedForUprPeriod: string | null; // Tracks if data for current UPR & Period is fetched

  // Goals
  goals: Goal[];
  goalsLoading: boolean;
  fetchGoals: (uprId: string, period: string, actualUserId: string) => Promise<void>;
  addGoalToStore: (goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'userId' | 'period' | 'uprId'>, uprId: string, period: string, actualUserId: string) => Promise<Goal | null>;
  updateGoalInStore: (goalId: string, updatedData: Partial<Omit<Goal, 'id' | 'userId' | 'period' | 'code' | 'createdAt' | 'uprId'>>) => Promise<Goal | null>;
  deleteGoalFromStore: (goalId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  getGoalById: (goalId: string, uprId: string, period: string) => Promise<Goal | null>;

  // Potential Risks
  potentialRisks: PotentialRisk[];
  potentialRisksLoading: boolean;
  fetchPotentialRisks: (uprId: string, period: string, actualUserId: string) => Promise<void>;
  addPotentialRiskToStore: (data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'sequenceNumber' | 'goalId' | 'uprId'>, goalId: string, uprId: string, period: string, actualUserId: string, sequenceNumber: number) => Promise<PotentialRisk | null>;
  updatePotentialRiskInStore: (potentialRiskId: string, updatedData: Partial<Omit<PotentialRisk, 'id' | 'userId' | 'period' | 'goalId' | 'identifiedAt' | 'sequenceNumber' | 'uprId'>>) => Promise<PotentialRisk | null>;
  deletePotentialRiskFromStore: (potentialRiskId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  getPotentialRiskById: (potentialRiskId: string, uprId: string, period: string) => Promise<PotentialRisk | null>;

  // Risk Causes
  riskCauses: RiskCause[];
  riskCausesLoading: boolean;
  fetchRiskCauses: (uprId: string, period: string, actualUserId: string) => Promise<void>;
  addRiskCauseToStore: (data: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'uprId'>, potentialRiskId: string, goalId: string, uprId: string, period: string, actualUserId: string, sequenceNumber: number) => Promise<RiskCause | null>;
  updateRiskCauseInStore: (riskCauseId: string, updatedData: Partial<Omit<RiskCause, 'id' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'analysisUpdatedAt' | 'uprId'>>) => Promise<RiskCause | null>;
  deleteRiskCauseFromStore: (riskCauseId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  getRiskCauseById: (riskCauseId: string, uprId: string, period: string) => Promise<RiskCause | null>;

  // Control Measures
  controlMeasures: ControlMeasure[];
  controlMeasuresLoading: boolean;
  fetchControlMeasures: (uprId: string, period: string, actualUserId: string, riskCauseId_optional?: string) => Promise<void>;
  addControlMeasureToStore: (data: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'controlType' | 'uprId'>, riskCauseId: string, potentialRiskId: string, goalId: string, uprId: string, period: string, actualUserId: string, controlType: ControlMeasureTypeKey) => Promise<ControlMeasure | null>;
  updateControlMeasureInStore: (controlMeasureId: string, updatedData: Partial<Omit<ControlMeasure, 'id' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'updatedAt' | 'uprId'>>) => Promise<ControlMeasure | null>;
  deleteControlMeasureFromStore: (controlMeasureId: string) => Promise<void>;
  getControlMeasureById: (controlMeasureId: string, uprId: string, period: string) => Promise<ControlMeasure | null>;
  
  // Monitoring Sessions
  monitoringSessions: MonitoringSession[];
  monitoringSessionsLoading: boolean;
  fetchMonitoringSessions: (uprId: string, period: string, actualUserId: string) => Promise<void>;
  addMonitoringSessionToState: (sessionData: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'status' | 'uprId'>, uprId: string, period: string, actualUserId: string) => Promise<MonitoringSession | null>;
  updateMonitoringSessionStatusInState: (sessionId: string, status: MonitoringSessionStatus, uprId: string, period: string, actualUserId: string) => Promise<MonitoringSession | null>;
  deleteMonitoringSessionFromState: (sessionId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  getMonitoringSessionByIdFromState: (sessionId: string) => MonitoringSession | null;

  // Risk Exposures
  riskExposures: RiskExposure[];
  riskExposuresLoading: boolean;
  fetchRiskExposuresForSession: (sessionId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  upsertRiskExposureInState: (exposureData: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period' | 'uprId'>, uprId: string, period: string, actualUserId: string) => Promise<RiskExposure | null>;

  // Monitored Control Measure Data
  monitoredControlMeasuresData: MonitoredControlMeasureData[];
  monitoredControlMeasuresLoading: boolean;
  fetchMonitoredControlMeasuresForSession: (sessionId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  upsertMonitoredControlMeasureInState: (mcmData: Omit<MonitoredControlMeasureData, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period'| 'uprId'>, uprId: string, period: string, actualUserId: string) => Promise<MonitoredControlMeasureData | null>;

  // Global actions
  setAppContext: (uprId: string, period: string, actualUserId: string) => void; 
  triggerGlobalDataFetch: (uprId: string, period: string, actualUserId: string) => Promise<void>;
  resetAllData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeUprId: null,
  activePeriod: null,
  dataFetchedForUprPeriod: null,

  goals: [],
  goalsLoading: false,
  potentialRisks: [],
  potentialRisksLoading: false,
  riskCauses: [],
  riskCausesLoading: false,
  controlMeasures: [],
  controlMeasuresLoading: false,
  monitoringSessions: [],
  monitoringSessionsLoading: false,
  riskExposures: [],
  riskExposuresLoading: false,
  monitoredControlMeasuresData: [],
  monitoredControlMeasuresLoading: false,

  setAppContext: (uprId, period, actualUserId) => {
    console.log(`[AppStore] setAppContext: Setting uprId=${uprId}, period=${period}, actualUserId=${actualUserId}`);
    const oldContextIdentifier = `${get().activeUprId}|${get().activePeriod}`;
    const newContextIdentifier = `${uprId}|${period}`;
    
    set({ activeUprId: uprId, activePeriod: period });

    if (oldContextIdentifier !== newContextIdentifier || get().dataFetchedForUprPeriod !== newContextIdentifier) {
      console.log(`[AppStore] setAppContext: Context changed OR data not fetched for ${newContextIdentifier}. Triggering global data fetch.`);
      get().triggerGlobalDataFetch(uprId, period, actualUserId);
    } else {
      console.log(`[AppStore] setAppContext: Context same and data already fetched for ${newContextIdentifier}. Not re-fetching.`);
    }
  },

  triggerGlobalDataFetch: async (uprIdToFetchFor, periodToFetchFor, actualUserIdToUse) => {
    if (!uprIdToFetchFor || !periodToFetchFor || !actualUserIdToUse) {
      console.warn("[AppStore] triggerGlobalDataFetch: Attempted to fetch data without uprId, period, or actualUserId.");
      set({ dataFetchedForUprPeriod: null, goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false });
      return;
    }
    
    const uniqueUprPeriodIdentifier = `${uprIdToFetchFor}|${periodToFetchFor}`;
    
    console.log(`[AppStore] Triggering global data fetch for ${uniqueUprPeriodIdentifier} by user ${actualUserIdToUse}`);
    set({ 
      activeUprId: uprIdToFetchFor, 
      activePeriod: periodToFetchFor,
      dataFetchedForUprPeriod: uniqueUprPeriodIdentifier, 
      goalsLoading: true, 
      potentialRisksLoading: true, 
      riskCausesLoading: true, 
      controlMeasuresLoading: true,
      monitoringSessionsLoading: true, 
      riskExposuresLoading: true, 
      monitoredControlMeasuresLoading: true,
    });
    try {
      await get().fetchGoals(uprIdToFetchFor, periodToFetchFor, actualUserIdToUse); 
      console.log(`[AppStore] Global data fetch sequence initiated for ${uniqueUprPeriodIdentifier}.`);
    } catch (error) {
      console.error("[AppStore] Error during triggerGlobalDataFetch main sequence:", error);
      set({ dataFetchedForUprPeriod: null }); 
    }
  },

  resetAllData: () => {
    console.log("[AppStore] Resetting all data and loading states.");
    set({
      goals: [],
      goalsLoading: false,
      potentialRisks: [],
      potentialRisksLoading: false,
      riskCauses: [],
      riskCausesLoading: false,
      controlMeasures: [],
      controlMeasuresLoading: false,
      monitoringSessions: [],
      monitoringSessionsLoading: false,
      riskExposures: [],
      riskExposuresLoading: false,
      monitoredControlMeasuresData: [],
      monitoredControlMeasuresLoading: false,
      activeUprId: null,
      activePeriod: null,
      dataFetchedForUprPeriod: null,
    });
  },

  // --- Goals Actions ---
  fetchGoals: async (uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching goals for UPR: ${uprId}, Period: ${period}`);
    set({ goalsLoading: true });
    try {
      // Service function `getGoalsFromService` will need to be updated to accept `uprId`
      const result = await getGoalsFromService(uprId, period);
      if (result.success && result.goals) {
        const sortedGoals = result.goals.sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals, goalsLoading: false });
        console.log(`[AppStore] Goals fetched successfully: ${sortedGoals.length} items. Triggering dependent fetches for UPR: ${uprId}.`);
        await get().fetchPotentialRisks(uprId, period, actualUserId);
        await get().fetchMonitoringSessions(uprId, period, actualUserId); 
      } else {
        console.warn(`[AppStore] fetchGoals: Failed to fetch or no goals for UPR ${uprId}. Message: ${result.message}`);
        set({ goals: [], goalsLoading: false, dataFetchedForUprPeriod: null }); 
        set({ 
          potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false,
          monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false 
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in fetchGoals:", errorMessage);
      set({ goals: [], goalsLoading: false, dataFetchedForUprPeriod: null });
      set({ 
        potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false,
        monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false 
      });
      throw new Error(`Gagal memuat daftar sasaran dari store: ${errorMessage}`);
    }
  },
  addGoalToStore: async (goalData, uprId, period, actualUserId) => {
    console.log(`[AppStore] Adding goal for UPR: ${uprId}, Period: ${period}`);
    try {
      // Service function `addGoalToService` will need `uprId` and `actualUserId`
      const newGoalFromService = await addGoalToService(goalData, uprId, period, actualUserId); // Pass actualUserId
      set(state => ({
        goals: [...state.goals, newGoalFromService].sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }))
      }));
      return newGoalFromService;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in addGoalToStore:", errorMessage);
      throw new Error(`Gagal menambahkan sasaran di store: ${errorMessage}`);
    }
  },
  updateGoalInStore: async (goalId, updatedData) => {
    console.log(`[AppStore] Updating goal ID: ${goalId}`);
    try {
      await updateGoalInService(goalId, updatedData); // Service assumes context or it's passed in updatedData if uprId can change
      set(state => ({
        goals: state.goals.map(g => 
          g.id === goalId ? { ...g, ...updatedData, updatedAt: new Date().toISOString() } : g
        ).sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }))
      }));
      const updatedGoal = get().goals.find(g => g.id === goalId);
      return updatedGoal || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in updateGoalInStore:", errorMessage);
      throw new Error(`Gagal memperbarui sasaran di store: ${errorMessage}`);
    }
  },
  deleteGoalFromStore: async (goalId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Deleting goal ID: ${goalId}`);
    try {
      // Service function `deleteGoalFromService` will need `uprId`, `period`, and `actualUserId`
      await deleteGoalFromService(goalId, uprId, period, actualUserId); 
      set(state => ({
        goals: state.goals.filter(g => g.id !== goalId),
        potentialRisks: state.potentialRisks.filter(pr => pr.goalId !== goalId),
        riskCauses: state.riskCauses.filter(rc => rc.goalId !== goalId),
        controlMeasures: state.controlMeasures.filter(cm => cm.goalId !== goalId),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in deleteGoalFromStore:", errorMessage);
      throw new Error(`Gagal menghapus sasaran dari store: ${errorMessage}`);
    }
  },
   getGoalById: async (goalId, uprId, period) => {
    const existingGoal = get().goals.find(g => g.id === goalId && g.uprId === uprId && g.period === period);
    if (existingGoal) return existingGoal;
    try {
      // `getGoalsFromService` now takes uprId, period
      const goalsResult = await getGoalsFromService(uprId, period);
      if (goalsResult.success && goalsResult.goals) {
          const goalFromService = goalsResult.goals.find(g => g.id === goalId);
          if(goalFromService) set(state => ({ goals: Array.from(new Set([...state.goals, goalFromService]))}));
          return goalFromService || null;
      }
      return null;
    } catch (error) {
      console.error(`[AppStore] Error in getGoalById from service for ${goalId}:`, error);
      return null;
    }
  },

  // --- Potential Risks Actions ---
  fetchPotentialRisks: async (uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching potential risks for UPR: ${uprId}, Period: ${period}`);
    set({ potentialRisksLoading: true });
    try {
      const currentGoals = get().goals.filter(g => g.uprId === uprId && g.period === period);
      if (currentGoals.length === 0 && !get().goalsLoading) {
        console.log("[AppStore] No goals found for current UPR/Period or goals still loading, skipping PR fetch.");
        set({ potentialRisks: [], potentialRisksLoading: false });
        await get().fetchRiskCauses(uprId, period, actualUserId);
        return;
      }
      
      let allPRs: PotentialRisk[] = [];
      for (const goal of currentGoals) {
          // Service `getPotentialRisksByGoalIdFromService` needs uprId, period, actualUserId for context
          const prs = await getPotentialRisksByGoalIdFromService(goal.id, uprId, period, actualUserId);
          allPRs.push(...prs);
      }
      const sortedPRs = allPRs.sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`));
      set({ potentialRisks: sortedPRs, potentialRisksLoading: false });
      console.log(`[AppStore] PotentialRisks fetched for UPR ${uprId}: ${sortedPRs.length}. Triggering cause fetch.`);
      await get().fetchRiskCauses(uprId, period, actualUserId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in fetchPotentialRisks:", errorMessage);
      set({ potentialRisks: [], potentialRisksLoading: false, dataFetchedForUprPeriod: null });
      set({ riskCausesLoading: false, controlMeasuresLoading: false }); 
      throw new Error(`Gagal memuat potensi risiko dari store: ${errorMessage}`);
    }
  },
  addPotentialRiskToStore: async (data, goalId, uprId, period, actualUserId, sequenceNumber) => {
    console.log(`[AppStore] Adding potential risk to Goal: ${goalId} in UPR: ${uprId}`);
    try {
      // Service `addPotentialRiskToService` needs uprId, period, actualUserId
      const newPR = await addPotentialRiskToService(data, goalId, uprId, period, actualUserId, sequenceNumber);
      set(state => ({
        potentialRisks: [...state.potentialRisks, newPR].sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`))
      }));
      return newPR;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in addPotentialRiskToStore:", errorMessage);
      throw new Error(`Gagal menambahkan potensi risiko di store: ${errorMessage}`);
    }
  },
  updatePotentialRiskInStore: async (potentialRiskId, updatedData) => {
    console.log(`[AppStore] Updating potential risk ID: ${potentialRiskId}`);
    try {
      // Service `updatePotentialRiskInService` might need uprId, period if it modifies those, or for validation
      await updatePotentialRiskInService(potentialRiskId, updatedData);
      set(state => {
        const newPotentialRisks = state.potentialRisks.map(pr =>
          pr.id === potentialRiskId ? { ...pr, ...updatedData, updatedAt: new Date().toISOString() } : pr
        ).sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`));
        return { potentialRisks: newPotentialRisks };
      });
      const updatedPR = get().potentialRisks.find(pr => pr.id === potentialRiskId);
      return updatedPR || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in updatePotentialRiskInStore:", errorMessage);
      throw new Error(`Gagal memperbarui potensi risiko di store: ${errorMessage}`);
    }
  },
  deletePotentialRiskFromStore: async (potentialRiskId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Deleting potential risk ID: ${potentialRiskId} from UPR: ${uprId}`);
    try {
      // Service `deletePotentialRiskFromService` needs uprId, period, actualUserId
      await deletePotentialRiskFromService(potentialRiskId, uprId, period, actualUserId);
      set(state => ({
        potentialRisks: state.potentialRisks.filter(pr => pr.id !== potentialRiskId),
        riskCauses: state.riskCauses.filter(rc => rc.potentialRiskId !== potentialRiskId), 
        controlMeasures: state.controlMeasures.filter(cm => cm.potentialRiskId !== potentialRiskId), 
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in deletePotentialRiskFromStore:", errorMessage);
      throw new Error(`Gagal menghapus potensi risiko dari store: ${errorMessage}`);
    }
  },
  getPotentialRiskById: async (potentialRiskId, uprId, period) => {
    const existingPR = get().potentialRisks.find(pr => pr.id === potentialRiskId && pr.uprId === uprId && pr.period === period);
    if (existingPR) return existingPR;
    try {
      // Service `getPotentialRiskByIdFromService` needs uprId, period
      return await getPotentialRiskByIdFromService(potentialRiskId, uprId, period);
    } catch (error) {
      console.error(`[AppStore] Error in getPotentialRiskById from service for ${potentialRiskId}:`, error);
      return null;
    }
  },

  // --- Risk Causes Actions ---
  fetchRiskCauses: async (uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching risk causes for UPR: ${uprId}, Period: ${period}`);
    set({ riskCausesLoading: true });
    try {
      const currentPRs = get().potentialRisks.filter(pr => pr.uprId === uprId && pr.period === period);
      if (currentPRs.length === 0 && !get().potentialRisksLoading) {
        console.log("[AppStore] No potential risks for current UPR/Period or PRs still loading, skipping RC fetch.");
        set({ riskCauses: [], riskCausesLoading: false });
        await get().fetchControlMeasures(uprId, period, actualUserId); 
        return;
      }
      let allRCs: RiskCause[] = [];
      for (const pr of currentPRs) {
          // Service `getRiskCausesByPotentialRiskIdFromService` needs uprId, period, actualUserId
          const rcs = await getRiskCausesByPotentialRiskIdFromService(pr.id, uprId, period, actualUserId);
          allRCs.push(...rcs);
      }
      const sortedRCs = allRCs.sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`));
      set({ riskCauses: sortedRCs, riskCausesLoading: false });
      console.log(`[AppStore] RiskCauses fetched for UPR ${uprId}: ${sortedRCs.length}. Triggering control measure fetch.`);
      await get().fetchControlMeasures(uprId, period, actualUserId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in fetchRiskCauses:", errorMessage);
      set({ riskCauses: [], riskCausesLoading: false, dataFetchedForUprPeriod: null });
      set({ controlMeasuresLoading: false }); 
      throw new Error(`Gagal memuat penyebab risiko dari store: ${errorMessage}`);
    }
  },
  addRiskCauseToStore: async (data, potentialRiskId, goalId, uprId, period, actualUserId, sequenceNumber) => { 
     console.log(`[AppStore] Adding risk cause to PotentialRisk: ${potentialRiskId} in UPR: ${uprId}`);
    try {
      // Service `addRiskCauseToService` needs uprId, period, actualUserId
      const newRC = await addRiskCauseToService(data, potentialRiskId, goalId, uprId, period, actualUserId, sequenceNumber);
      set(state => ({
        riskCauses: [...state.riskCauses, newRC].sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`))
      }));
      return newRC;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in addRiskCauseToStore:", errorMessage);
      throw new Error(`Gagal menambahkan penyebab risiko di store: ${errorMessage}`);
    }
  },
  updateRiskCauseInStore: async (riskCauseId, updatedData) => {
    console.log(`[AppStore] Updating risk cause ID: ${riskCauseId}`);
    try {
      // Service `updateRiskCauseInService` might need uprId, period context
      await updateRiskCauseInService(riskCauseId, updatedData);
      set(state => {
        const newRiskCauses = state.riskCauses.map(rc =>
          rc.id === riskCauseId ? { ...rc, ...updatedData, analysisUpdatedAt: new Date().toISOString() } : rc
        ).sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`));
        return { riskCauses: newRiskCauses };
      });
      const updatedRC = get().riskCauses.find(rc => rc.id === riskCauseId);
      return updatedRC || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in updateRiskCauseInStore:", errorMessage);
      throw new Error(`Gagal memperbarui penyebab risiko di store: ${errorMessage}`);
    }
  },
  deleteRiskCauseFromStore: async (riskCauseId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Deleting risk cause ID: ${riskCauseId} from UPR: ${uprId}`);
    try {
      // Service `deleteRiskCauseFromService` needs uprId, period, actualUserId
      await deleteRiskCauseFromService(riskCauseId, uprId, period, actualUserId); 
      set(state => ({
        riskCauses: state.riskCauses.filter(rc => rc.id !== riskCauseId),
        controlMeasures: state.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId), 
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in deleteRiskCauseFromStore:", errorMessage);
      throw new Error(`Gagal menghapus penyebab risiko dari store: ${errorMessage}`);
    }
  },
  getRiskCauseById: async (riskCauseId, uprId, period) => {
    const existingRC = get().riskCauses.find(rc => rc.id === riskCauseId && rc.uprId === uprId && rc.period === period);
    if (existingRC) return existingRC;
    try {
      // Service `getRiskCauseByIdFromService` needs uprId, period
      return await getRiskCauseByIdFromService(riskCauseId, uprId, period);
    } catch (error) {
      console.error(`[AppStore] Error in getRiskCauseById from service for ${riskCauseId}:`, error);
      return null;
    }
  },

  // --- Control Measures Actions ---
  fetchControlMeasures: async (uprId, period, actualUserId, riskCauseId_optional?: string) => {
    console.log(`[AppStore] Fetching control measures. UPR: ${uprId}, Period: ${period}, RC_ID (opt): ${riskCauseId_optional}`);
    set({ controlMeasuresLoading: true });
    try {
      let allCMs: ControlMeasure[] = [];
      if (riskCauseId_optional) { 
        // Service `fetchControlMeasuresByRiskCauseIdFromService` needs uprId, period, actualUserId
        allCMs = await fetchControlMeasuresByRiskCauseIdFromService(riskCauseId_optional, uprId, period, actualUserId);
        set(state => ({
          controlMeasures: [ 
            ...state.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId_optional),
            ...allCMs 
          ].sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`)),
        }));
      } else { 
        const currentRCs = get().riskCauses.filter(rc => rc.uprId === uprId && rc.period === period);
        if (currentRCs.length === 0 && !get().riskCausesLoading) {
          console.log("[AppStore] No risk causes for current UPR/Period or RCs still loading, skipping CM fetch for all.");
          set({ controlMeasures: [] });
        } else {
          for (const rc of currentRCs) {
              // Service `fetchControlMeasuresByRiskCauseIdFromService` needs uprId, period, actualUserId
              const cms = await fetchControlMeasuresByRiskCauseIdFromService(rc.id, uprId, period, actualUserId);
              allCMs.push(...cms);
          }
          const sortedCMs = allCMs.sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`));
          set({ controlMeasures: sortedCMs });
        }
      }
      set({ controlMeasuresLoading: false });
      console.log(`[AppStore] ControlMeasures fetched for UPR ${uprId}: ${allCMs.length}. Global data fetch for ${uprId}|${period} should now be complete.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in fetchControlMeasures:", errorMessage);
      set({ controlMeasures: [], controlMeasuresLoading: false, dataFetchedForUprPeriod: null }); 
      throw new Error(`Gagal memuat tindakan pengendalian dari store: ${errorMessage}`);
    }
  },
  addControlMeasureToStore: async (data, riskCauseId, potentialRiskId, goalId, uprId, period, actualUserId, controlType) => { 
    console.log(`[AppStore] Adding control measure to RiskCause: ${riskCauseId} in UPR: ${uprId} with type: ${controlType}`);
    try {
      // Service `addControlMeasureToService` needs uprId, period, actualUserId
      const newCM = await addControlMeasureToService(data, riskCauseId, potentialRiskId, goalId, uprId, period, actualUserId, controlType); 
      set(state => ({
        controlMeasures: [...state.controlMeasures, newCM].sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`))
      }));
      return newCM;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in addControlMeasureToStore:", errorMessage);
      throw new Error(`Gagal menambahkan tindakan pengendalian di store: ${errorMessage}`);
    }
  },
  updateControlMeasureInStore: async (controlMeasureId, updatedData) => {
     console.log(`[AppStore] Updating control measure ID: ${controlMeasureId}`);
    try {
      // Service `updateControlMeasureInService` may need context if uprId/period can change
      await updateControlMeasureInService(controlMeasureId, updatedData);
      set(state => {
        const newControlMeasures = state.controlMeasures.map(cm => 
            cm.id === controlMeasureId ? { ...cm, ...updatedData, updatedAt: new Date().toISOString() } : cm
          ).sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`));
        return { controlMeasures: newControlMeasures };
      });
      const updatedCM = get().controlMeasures.find(cm => cm.id === controlMeasureId);
      return updatedCM || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in updateControlMeasureInStore:", errorMessage);
      throw new Error(`Gagal memperbarui tindakan pengendalian di store: ${errorMessage}`);
    }
  },
  deleteControlMeasureFromStore: async (controlMeasureId) => { // Assumes CMs are globally unique by ID, or context is implicit
    console.log(`[AppStore] Deleting control measure ID: ${controlMeasureId}`);
    try {
      await deleteControlMeasureFromService(controlMeasureId);
      set(state => ({
        controlMeasures: state.controlMeasures.filter(cm => cm.id !== controlMeasureId)
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in deleteControlMeasureFromStore:", errorMessage);
      throw new Error(`Gagal menghapus tindakan pengendalian dari store: ${errorMessage}`);
    }
  },
  getControlMeasureById: async (controlMeasureId, uprId, period) => {
    const existingCM = get().controlMeasures.find(cm => cm.id === controlMeasureId && cm.uprId === uprId && cm.period === period);
    if (existingCM) return existingCM;
    try {
      // Service `getControlMeasureByIdFromService` needs uprId, period
      return await getControlMeasureByIdFromService(controlMeasureId, uprId, period);
    } catch (error) {
      console.error(`[AppStore] Error in getControlMeasureById from service for ${controlMeasureId}:`, error);
      return null;
    }
  },
  
  // --- Monitoring Sessions Actions ---
  fetchMonitoringSessions: async (uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching monitoring sessions for UPR: ${uprId}, Period: ${period}`);
    set({ monitoringSessionsLoading: true });
    try {
      // Service `getMonitoringSessionsFromService` needs uprId, period, actualUserId (creator)
      const sessions = await getMonitoringSessionsFromService(uprId, period, actualUserId);
      set({ monitoringSessions: sessions, monitoringSessionsLoading: false });
      console.log(`[AppStore] Monitoring sessions fetched for UPR ${uprId}: ${sessions.length}.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in fetchMonitoringSessions:", errorMessage);
      set({ monitoringSessions: [], monitoringSessionsLoading: false });
      throw new Error(`Gagal memuat sesi pemantauan dari store: ${errorMessage}`);
    }
  },
  addMonitoringSessionToState: async (sessionData, uprId, period, actualUserId) => {
    console.log(`[AppStore] Adding monitoring session for UPR: ${uprId}, Period: ${period}`);
    try {
      // Service `addMonitoringSessionToService` needs uprId, period, actualUserId
      const newSession = await addMonitoringSessionToService(sessionData, uprId, period, actualUserId);
      set(state => ({
        monitoringSessions: [...state.monitoringSessions, newSession].sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
      }));
      return newSession;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in addMonitoringSessionToState:", errorMessage);
      throw new Error(`Gagal menambahkan sesi pemantauan di store: ${errorMessage}`);
    }
  },
  updateMonitoringSessionStatusInState: async (sessionId, status, uprId, period, actualUserId) => {
    console.log(`[AppStore] Updating status for monitoring session ID: ${sessionId} to ${status}`);
    try {
      // Service `updateMonitoringSessionStatusInService` might not need full context if sessionId is globally unique
      await updateMonitoringSessionStatusInService(sessionId, status);
      const updatedSession = await getMonitoringSessionByIdFromService(sessionId, uprId, period, actualUserId);
      if(updatedSession){
        set(state => ({
          monitoringSessions: state.monitoringSessions.map(s => s.id === sessionId ? updatedSession : s)
        }));
        return updatedSession;
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in updateMonitoringSessionStatusInState:", errorMessage);
      throw new Error(`Gagal memperbarui status sesi pemantauan di store: ${errorMessage}`);
    }
  },
  deleteMonitoringSessionFromState: async (sessionId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Deleting monitoring session ID: ${sessionId} from UPR: ${uprId}`);
    try {
      // Service `deleteMonitoringSessionFromService` needs uprId, period, actualUserId
      await deleteMonitoringSessionFromService(sessionId, uprId, period, actualUserId);
      set(state => ({
        monitoringSessions: state.monitoringSessions.filter(s => s.id !== sessionId),
        riskExposures: state.riskExposures.filter(re => re.monitoringSessionId !== sessionId), 
        monitoredControlMeasuresData: state.monitoredControlMeasuresData.filter(mcmd => mcmd.monitoringSessionId !== sessionId),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in deleteMonitoringSessionFromState:", errorMessage);
      throw new Error(`Gagal menghapus sesi pemantauan dari store: ${errorMessage}`);
    }
  },
  getMonitoringSessionByIdFromState: (sessionId) => {
    // This might need to be more robust if sessions aren't guaranteed to be in store
    // Or ensure fetchMonitoringSessions is always called for the relevant UPR/Period
    return get().monitoringSessions.find(s => s.id === sessionId) || null;
  },

  // --- Risk Exposures Actions ---
  fetchRiskExposuresForSession: async (sessionId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching risk exposures for Session: ${sessionId}, UPR: ${uprId}, Period: ${period}`);
    set({ riskExposuresLoading: true });
    try {
      // Service `getRiskExposuresBySessionFromService` needs uprId, period, actualUserId
      const exposures = await getRiskExposuresBySessionFromService(sessionId, uprId, period, actualUserId);
      set(state => ({
        riskExposures: [
          ...state.riskExposures.filter(re => re.monitoringSessionId !== sessionId),
          ...exposures
        ],
        riskExposuresLoading: false,
      }));
      console.log(`[AppStore] Risk exposures fetched for session ${sessionId} (UPR ${uprId}): ${exposures.length}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[AppStore] Error in fetchRiskExposuresForSession (Session: ${sessionId}, UPR: ${uprId}):`, errorMessage);
      set({ riskExposuresLoading: false }); 
      throw new Error(`Gagal memuat data paparan risiko dari store: ${errorMessage}`);
    }
  },
  upsertRiskExposureInState: async (exposureData, uprId, period, actualUserId) => {
     console.log(`[AppStore] Upserting risk exposure for RiskCause: ${exposureData.riskCauseId} in Session: ${exposureData.monitoringSessionId}, UPR: ${uprId}`);
    try {
      // Service `upsertRiskExposureToService` needs uprId, period, actualUserId
      const upsertedExposureFromService = await upsertRiskExposureToService(exposureData, uprId, period, actualUserId);
      set(state => {
        const index = state.riskExposures.findIndex(
          re => re.monitoringSessionId === upsertedExposureFromService.monitoringSessionId && re.riskCauseId === upsertedExposureFromService.riskCauseId && re.uprId === uprId
        );
        if (index !== -1) {
          const updatedExposures = [...state.riskExposures];
          updatedExposures[index] = upsertedExposureFromService;
          return { riskExposures: updatedExposures };
        }
        return { riskExposures: [...state.riskExposures, upsertedExposureFromService] };
      });
      return upsertedExposureFromService;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[AppStore] upsertRiskExposureInState (CauseID: ${exposureData.riskCauseId}, UPR: ${uprId}): Failed:`, errorMessage);
      throw new Error(`Gagal menyimpan paparan risiko di store: ${errorMessage}`);
    }
  },

  // --- Monitored Control Measure Data Actions ---
  fetchMonitoredControlMeasuresForSession: async (sessionId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching monitored control measures for Session: ${sessionId}, UPR: ${uprId}`);
    set({ monitoredControlMeasuresLoading: true });
    try {
      // Placeholder: Replace with actual service call for MonitoredControlMeasureData
      // const mcms = await getMonitoredControlMeasuresDataForSession(sessionId, uprId, period, actualUserId); 
      const mcms: MonitoredControlMeasureData[] = []; 
      console.log(`[AppStore] Monitored control measures fetched for session ${sessionId} (UPR ${uprId}): ${mcms.length} (mocked)`);
      set(state => ({
        monitoredControlMeasuresData: [
          ...state.monitoredControlMeasuresData.filter(mcmd => mcmd.monitoringSessionId !== sessionId || mcmd.uprId !== uprId),
          ...mcms
        ],
        monitoredControlMeasuresLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[AppStore] Error in fetchMonitoredControlMeasuresForSession (Session: ${sessionId}, UPR: ${uprId}):`, errorMessage);
      set({ monitoredControlMeasuresLoading: false });
    }
  },
  upsertMonitoredControlMeasureInState: async (mcmData, uprId, period, actualUserId) => {
    console.log(`[AppStore] Upserting monitored control measure data for Control: ${mcmData.controlMeasureId} in UPR: ${uprId}`);
    try {
      // Placeholder: Replace with actual service call
      // const upsertedMCMFromService = await upsertMonitoredControlMeasureToService(mcmData, uprId, period, actualUserId);
      const mockId = `${mcmData.monitoringSessionId}_${mcmData.controlMeasureId}`;
      const existingMCM = get().monitoredControlMeasuresData.find(m => m.id === mockId && m.uprId === uprId);
      const upsertedMCM: MonitoredControlMeasureData = {
        ...mcmData,
        id: existingMCM?.id || mockId, 
        uprId, // ensure uprId is set
        userId: actualUserId,
        period,
        recordedAt: existingMCM?.recordedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set(state => {
        const index = state.monitoredControlMeasuresData.findIndex(
          m => m.monitoringSessionId === upsertedMCM.monitoringSessionId && m.controlMeasureId === upsertedMCM.controlMeasureId && m.uprId === uprId
        );
        if (index !== -1) {
          const updatedMCMs = [...state.monitoredControlMeasuresData];
          updatedMCMs[index] = upsertedMCM;
          return { monitoredControlMeasuresData: updatedMCMs };
        }
        return { monitoredControlMeasuresData: [...state.monitoredControlMeasuresData, upsertedMCM] };
      });
      return upsertedMCM;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[AppStore] upsertMonitoredControlMeasureInState (ControlID: ${mcmData.controlMeasureId}, UPR: ${uprId}): Failed:`, errorMessage);
      throw new Error(`Gagal menyimpan data pemantauan kontrol di store: ${errorMessage}`);
    }
  },

}));

// Helper function to trigger global data fetch if context changes or is not yet fetched
// This will be called from AppLayout or similar top-level component when auth context is ready
export const triggerGlobalDataFetchForStore = (uprId: string | null, period: string | null, actualUserId: string | null) => {
  const store = useAppStore.getState();
  if (uprId && period && actualUserId) {
    store.setAppContext(uprId, period, actualUserId); // This now also triggers fetch if needed
  } else {
    store.resetAllData(); // Reset if context is incomplete
  }
};
