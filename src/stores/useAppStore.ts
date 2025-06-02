
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
  currentUserId: string | null;
  currentPeriod: string | null;
  dataFetchedForPeriod: string | null; 

  // Goals
  goals: Goal[];
  goalsLoading: boolean;
  fetchGoals: (userId: string, period: string) => Promise<void>;
  addGoalToStore: (goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'userId' | 'period'>, userId: string, period: string) => Promise<Goal | null>;
  updateGoalInStore: (goalId: string, updatedData: Partial<Omit<Goal, 'id' | 'userId' | 'period' | 'code' | 'createdAt'>>) => Promise<Goal | null>;
  deleteGoalFromStore: (goalId: string, userId: string, period: string) => Promise<void>;
  getGoalById: (goalId: string, userId: string, period: string) => Promise<Goal | null>;


  // Potential Risks
  potentialRisks: PotentialRisk[];
  potentialRisksLoading: boolean;
  fetchPotentialRisks: (userId: string, period: string) => Promise<void>;
  addPotentialRiskToStore: (data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'sequenceNumber' | 'goalId'>, goalId: string, userId: string, period: string, sequenceNumber: number) => Promise<PotentialRisk | null>;
  updatePotentialRiskInStore: (potentialRiskId: string, updatedData: Partial<Omit<PotentialRisk, 'id' | 'userId' | 'period' | 'goalId' | 'identifiedAt' | 'sequenceNumber'>>) => Promise<PotentialRisk | null>;
  deletePotentialRiskFromStore: (potentialRiskId: string, userId: string, period: string) => Promise<void>;
  getPotentialRiskById: (potentialRiskId: string, userId: string, period: string) => Promise<PotentialRisk | null>;

  // Risk Causes
  riskCauses: RiskCause[];
  riskCausesLoading: boolean;
  fetchRiskCauses: (userId: string, period: string) => Promise<void>;
  addRiskCauseToStore: (data: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'>, potentialRiskId: string, goalId: string, userId: string, period: string, sequenceNumber: number) => Promise<RiskCause | null>;
  updateRiskCauseInStore: (riskCauseId: string, updatedData: Partial<Omit<RiskCause, 'id' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'analysisUpdatedAt'>>) => Promise<RiskCause | null>;
  deleteRiskCauseFromStore: (riskCauseId: string, userId: string, period: string) => Promise<void>;
  getRiskCauseById: (riskCauseId: string, userId: string, period: string) => Promise<RiskCause | null>;

  // Control Measures
  controlMeasures: ControlMeasure[];
  controlMeasuresLoading: boolean;
  fetchControlMeasures: (userId: string, period: string, riskCauseId_optional?: string) => Promise<void>;
  addControlMeasureToStore: (data: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'controlType'>, riskCauseId: string, potentialRiskId: string, goalId: string, userId: string, period: string, controlType: ControlMeasureTypeKey) => Promise<ControlMeasure | null>;
  updateControlMeasureInStore: (controlMeasureId: string, updatedData: Partial<Omit<ControlMeasure, 'id' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'updatedAt'>>) => Promise<ControlMeasure | null>;
  deleteControlMeasureFromStore: (controlMeasureId: string) => Promise<void>;
  getControlMeasureById: (controlMeasureId: string, userId: string, period: string) => Promise<ControlMeasure | null>;

  // Monitoring Sessions
  monitoringSessions: MonitoringSession[];
  monitoringSessionsLoading: boolean;
  fetchMonitoringSessions: (userId: string, period: string) => Promise<void>;
  addMonitoringSessionToState: (sessionData: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'status'>, userId: string, period: string) => Promise<MonitoringSession | null>;
  updateMonitoringSessionStatusInState: (sessionId: string, status: MonitoringSessionStatus) => Promise<MonitoringSession | null>;
  deleteMonitoringSessionFromState: (sessionId: string, userId: string, period: string) => Promise<void>;
  getMonitoringSessionByIdFromState: (sessionId: string) => MonitoringSession | null;

  // Risk Exposures
  riskExposures: RiskExposure[];
  riskExposuresLoading: boolean;
  fetchRiskExposuresForSession: (sessionId: string, userId: string, period: string) => Promise<void>;
  upsertRiskExposureInState: (exposureData: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period'>, userId: string, period: string) => Promise<RiskExposure | null>;

  // Monitored Control Measure Data
  monitoredControlMeasuresData: MonitoredControlMeasureData[];
  monitoredControlMeasuresLoading: boolean;
  fetchMonitoredControlMeasuresForSession: (sessionId: string, userId: string, period: string) => Promise<void>;
  upsertMonitoredControlMeasureInState: (mcmData: Omit<MonitoredControlMeasureData, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period'>, userId: string, period: string) => Promise<MonitoredControlMeasureData | null>;

  // Global actions
  setAppContext: (userId: string, period: string) => void; 
  triggerGlobalDataFetch: (userId: string, period: string) => Promise<void>;
  resetAllData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUserId: null,
  currentPeriod: null,
  dataFetchedForPeriod: null,

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

  setAppContext: (userId, period) => {
    console.log(`[AppStore] setAppContext: Setting userId=${userId}, period=${period}`);
    const oldContextIdentifier = `${get().currentUserId}|${get().currentPeriod}`;
    const newContextIdentifier = `${userId}|${period}`;
    
    set({ currentUserId: userId, currentPeriod: period });

    if (oldContextIdentifier !== newContextIdentifier || get().dataFetchedForPeriod !== newContextIdentifier) {
      console.log(`[AppStore] setAppContext: Context changed OR data not fetched for ${newContextIdentifier}. Triggering global data fetch.`);
      get().triggerGlobalDataFetch(userId, period);
    } else {
      console.log(`[AppStore] setAppContext: Context same and data already fetched for ${newContextIdentifier}. Not re-fetching.`);
    }
  },

  triggerGlobalDataFetch: async (userIdToFetchFor, periodToFetchFor) => {
    const currentId = userIdToFetchFor; 
    const currentP = periodToFetchFor;

    if (!currentId || !currentP) {
      console.warn("[AppStore] triggerGlobalDataFetch: Attempted to fetch data without userId or period provided as args.");
      set({ dataFetchedForPeriod: null, goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false });
      return;
    }
    
    const uniquePeriodIdentifier = `${currentId}|${currentP}`;
    if (get().dataFetchedForPeriod === uniquePeriodIdentifier && !get().goalsLoading) { 
      console.log(`[AppStore] Data for ${uniquePeriodIdentifier} already fetched or being fetched. Skipping.`);
      return;
    }
    console.log(`[AppStore] Triggering global data fetch for ${uniquePeriodIdentifier}`);
    set({ 
      currentUserId: currentId, 
      currentPeriod: currentP,
      dataFetchedForPeriod: uniquePeriodIdentifier, 
      goalsLoading: true, 
      potentialRisksLoading: true, 
      riskCausesLoading: true, 
      controlMeasuresLoading: true,
      monitoringSessionsLoading: true, 
      riskExposuresLoading: true, 
      monitoredControlMeasuresLoading: true,
    });
    try {
      await get().fetchGoals(currentId, currentP);
      // fetchMonitoringSessions is now called after fetchGoals completes
    } catch (error) {
      console.error("[AppStore] Error during triggerGlobalDataFetch -> fetchGoals:", error);
      set({ dataFetchedForPeriod: null }); 
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
      currentUserId: null,
      currentPeriod: null,
      dataFetchedForPeriod: null,
    });
  },

  // --- Goals Actions ---
  fetchGoals: async (userId, period) => {
    console.log(`[AppStore] Fetching goals for User: ${userId}, Period: ${period}`);
    set({ goalsLoading: true });
    try {
      const result = await getGoalsFromService(userId, period);
      if (result.success && result.goals) {
        const sortedGoals = result.goals.sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals, goalsLoading: false });
        console.log(`[AppStore] Goals fetched successfully: ${sortedGoals.length} items. Triggering dependent fetches.`);
        await get().fetchPotentialRisks(userId, period); // This will chain to causes, then controls
        await get().fetchMonitoringSessions(userId, period); // Fetch monitoring sessions after goals
      } else {
        console.warn(`[AppStore] fetchGoals: Failed to fetch or no goals. Message: ${result.message}`);
        set({ goals: [], goalsLoading: false, dataFetchedForPeriod: null }); 
        set({ potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in fetchGoals:", errorMessage);
      set({ goals: [], goalsLoading: false, dataFetchedForPeriod: null });
      set({ potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false });
      throw new Error(`Gagal memuat daftar sasaran dari store: ${errorMessage}`);
    }
  },
  addGoalToStore: async (goalData, userId, period) => {
    console.log(`[AppStore] Adding goal for User: ${userId}, Period: ${period}`);
    try {
      const newGoalFromService = await addGoalToService(goalData, userId, period);
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
      await updateGoalInService(goalId, updatedData);
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
  deleteGoalFromStore: async (goalId, userId, period) => {
    console.log(`[AppStore] Deleting goal ID: ${goalId}`);
    try {
      await deleteGoalFromService(goalId, userId, period); 
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
   getGoalById: async (goalId, userId, period) => {
    const existingGoal = get().goals.find(g => g.id === goalId && g.userId === userId && g.period === period);
    if (existingGoal) return existingGoal;
    try {
      const goalFromService = await getGoalsFromService(userId, period).then(res => res.goals?.find(g => g.id === goalId));
      return goalFromService || null;
    } catch (error) {
      console.error(`[AppStore] Error in getGoalById from service for ${goalId}:`, error);
      return null;
    }
  },

  // --- Potential Risks Actions ---
  fetchPotentialRisks: async (userId, period) => {
    console.log(`[AppStore] Fetching potential risks for User: ${userId}, Period: ${period}`);
    set({ potentialRisksLoading: true });
    try {
      const currentGoals = get().goals; 
      if (currentGoals.length === 0) {
        console.log("[AppStore] No goals found, skipping potential risk fetch.");
        set({ potentialRisks: [], potentialRisksLoading: false });
        await get().fetchRiskCauses(userId, period); 
        return;
      }
      
      let allPRs: PotentialRisk[] = [];
      for (const goal of currentGoals) {
        const prs = await getPotentialRisksByGoalIdFromService(goal.id, userId, period);
        allPRs.push(...prs);
      }
      const sortedPRs = allPRs.sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`));
      set({ potentialRisks: sortedPRs, potentialRisksLoading: false });
      console.log(`[AppStore] PotentialRisks fetched: ${sortedPRs.length}. Triggering cause fetch.`);
      await get().fetchRiskCauses(userId, period);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in fetchPotentialRisks:", errorMessage);
      set({ potentialRisks: [], potentialRisksLoading: false, dataFetchedForPeriod: null });
      set({ riskCausesLoading: false, controlMeasuresLoading: false }); 
      throw new Error(`Gagal memuat potensi risiko dari store: ${errorMessage}`);
    }
  },
  addPotentialRiskToStore: async (data, goalId, userId, period, sequenceNumber) => {
    console.log(`[AppStore] Adding potential risk to Goal: ${goalId}`);
    try {
      const newPR = await addPotentialRiskToService(data, goalId, userId, period, sequenceNumber);
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
  deletePotentialRiskFromStore: async (potentialRiskId, userId, period) => {
    console.log(`[AppStore] Deleting potential risk ID: ${potentialRiskId}`);
    try {
      await deletePotentialRiskFromService(potentialRiskId, userId, period);
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
  getPotentialRiskById: async (potentialRiskId, userId, period) => {
    const existingPR = get().potentialRisks.find(pr => pr.id === potentialRiskId && pr.userId === userId && pr.period === period);
    if (existingPR) return existingPR;
    try {
      return await getPotentialRiskByIdFromService(potentialRiskId, userId, period);
    } catch (error) {
      console.error(`[AppStore] Error in getPotentialRiskById from service for ${potentialRiskId}:`, error);
      return null;
    }
  },

  // --- Risk Causes Actions ---
  fetchRiskCauses: async (userId, period) => {
    console.log(`[AppStore] Fetching risk causes for User: ${userId}, Period: ${period}`);
    set({ riskCausesLoading: true });
    try {
      const currentPRs = get().potentialRisks;
      if (currentPRs.length === 0) {
        console.log("[AppStore] No potential risks found, skipping risk cause fetch.");
        set({ riskCauses: [], riskCausesLoading: false });
        await get().fetchControlMeasures(userId, period); 
        return;
      }
      let allRCs: RiskCause[] = [];
      for (const pr of currentPRs) {
        const rcs = await getRiskCausesByPotentialRiskIdFromService(pr.id, userId, period);
        allRCs.push(...rcs);
      }
      const sortedRCs = allRCs.sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`));
      set({ riskCauses: sortedRCs, riskCausesLoading: false });
      console.log(`[AppStore] RiskCauses fetched: ${sortedRCs.length}. Triggering control measure fetch.`);
      await get().fetchControlMeasures(userId, period);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in fetchRiskCauses:", errorMessage);
      set({ riskCauses: [], riskCausesLoading: false, dataFetchedForPeriod: null });
      set({ controlMeasuresLoading: false }); 
      throw new Error(`Gagal memuat penyebab risiko dari store: ${errorMessage}`);
    }
  },
  addRiskCauseToStore: async (data, potentialRiskId, goalId, userId, period, sequenceNumber) => { 
     console.log(`[AppStore] Adding risk cause to PotentialRisk: ${potentialRiskId}`);
    try {
      const newRC = await addRiskCauseToService(data, potentialRiskId, goalId, userId, period, sequenceNumber);
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
  deleteRiskCauseFromStore: async (riskCauseId, userId, period) => {
    console.log(`[AppStore] Deleting risk cause ID: ${riskCauseId}`);
    try {
      await deleteRiskCauseFromService(riskCauseId, userId, period); 
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
  getRiskCauseById: async (riskCauseId, userId, period) => {
    const existingRC = get().riskCauses.find(rc => rc.id === riskCauseId && rc.userId === userId && rc.period === period);
    if (existingRC) return existingRC;
    try {
      return await getRiskCauseByIdFromService(riskCauseId, userId, period);
    } catch (error) {
      console.error(`[AppStore] Error in getRiskCauseById from service for ${riskCauseId}:`, error);
      return null;
    }
  },

  // --- Control Measures Actions ---
  fetchControlMeasures: async (userId, period, riskCauseId_optional?: string) => {
    console.log(`[AppStore] Fetching control measures. User: ${userId}, Period: ${period}, RC_ID (opt): ${riskCauseId_optional}`);
    set({ controlMeasuresLoading: true });
    try {
      let allCMs: ControlMeasure[] = [];
      if (riskCauseId_optional) {
        allCMs = await fetchControlMeasuresByRiskCauseIdFromService(riskCauseId_optional, userId, period);
        set(state => ({
          controlMeasures: [ 
            ...state.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId_optional),
            ...allCMs
          ].sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`)),
        }));
      } else {
        const currentRCs = get().riskCauses;
        if (currentRCs.length === 0) {
          console.log("[AppStore] No risk causes found, skipping control measure fetch.");
          set({ controlMeasures: [] });
        } else {
          for (const rc of currentRCs) {
            const cms = await fetchControlMeasuresByRiskCauseIdFromService(rc.id, userId, period);
            allCMs.push(...cms);
          }
          const sortedCMs = allCMs.sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`));
          set({ controlMeasures: sortedCMs });
        }
      }
      set({ controlMeasuresLoading: false }); // Ensure loading is false after operations
      console.log(`[AppStore] ControlMeasures fetched: ${allCMs.length}.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in fetchControlMeasures:", errorMessage);
      set({ controlMeasures: [], controlMeasuresLoading: false, dataFetchedForPeriod: null }); // Reset dataFetchedForPeriod on error
      throw new Error(`Gagal memuat tindakan pengendalian dari store: ${errorMessage}`);
    }
  },
  addControlMeasureToStore: async (data, riskCauseId, potentialRiskId, goalId, userId, period, controlType) => { 
    console.log(`[AppStore] Adding control measure to RiskCause: ${riskCauseId} with type: ${controlType}`);
    try {
      const newCM = await addControlMeasureToService(data, riskCauseId, potentialRiskId, goalId, userId, period, controlType); 
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
  deleteControlMeasureFromStore: async (controlMeasureId) => {
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
  getControlMeasureById: async (controlMeasureId, userId, period) => {
    const existingCM = get().controlMeasures.find(cm => cm.id === controlMeasureId && cm.userId === userId && cm.period === period);
    if (existingCM) return existingCM;
    try {
      return await getControlMeasureByIdFromService(controlMeasureId, userId, period);
    } catch (error) {
      console.error(`[AppStore] Error in getControlMeasureById from service for ${controlMeasureId}:`, error);
      return null;
    }
  },

  // --- Monitoring Sessions Actions ---
  fetchMonitoringSessions: async (userId, period) => {
    console.log(`[AppStore] Fetching monitoring sessions for User: ${userId}, Period: ${period}`);
    set({ monitoringSessionsLoading: true });
    try {
      const sessions = await getMonitoringSessionsFromService(userId, period);
      set({ monitoringSessions: sessions, monitoringSessionsLoading: false });
      console.log(`[AppStore] Monitoring sessions fetched: ${sessions.length}.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[AppStore] Error in fetchMonitoringSessions:", errorMessage);
      set({ monitoringSessions: [], monitoringSessionsLoading: false }); // Don't reset dataFetchedForPeriod here
      throw new Error(`Gagal memuat sesi pemantauan dari store: ${errorMessage}`);
    }
  },
  addMonitoringSessionToState: async (sessionData, userId, period) => {
    console.log(`[AppStore] Adding monitoring session for User: ${userId}, Period: ${period}`);
    try {
      const newSession = await addMonitoringSessionToService(sessionData, userId, period);
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
  updateMonitoringSessionStatusInState: async (sessionId, status) => {
    console.log(`[AppStore] Updating status for monitoring session ID: ${sessionId} to ${status}`);
    const currentUserId = get().currentUserId; 
    const currentPeriod = get().currentPeriod; 
    if (!currentUserId || !currentPeriod) {
      console.error("[AppStore] updateMonitoringSessionStatusInState: User context not available in store.");
      throw new Error("Konteks pengguna tidak tersedia di store untuk memperbarui sesi.");
    }
    try {
      await updateMonitoringSessionStatusInService(sessionId, status);
      const updatedSession = await getMonitoringSessionByIdFromService(sessionId, currentUserId, currentPeriod);
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
  deleteMonitoringSessionFromState: async (sessionId, userId, period) => {
    console.log(`[AppStore] Deleting monitoring session ID: ${sessionId}`);
    try {
      await deleteMonitoringSessionFromService(sessionId, userId, period);
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
    return get().monitoringSessions.find(s => s.id === sessionId) || null;
  },

  // --- Risk Exposures Actions ---
  fetchRiskExposuresForSession: async (sessionId, userId, period) => {
    console.log(`[AppStore] Fetching risk exposures for Session: ${sessionId}, User: ${userId}, Period: ${period}`);
    set({ riskExposuresLoading: true });
    try {
      const exposures = await getRiskExposuresBySessionFromService(sessionId, userId, period);
      set(state => ({
        riskExposures: [
          ...state.riskExposures.filter(re => re.monitoringSessionId !== sessionId),
          ...exposures
        ],
        riskExposuresLoading: false,
      }));
      console.log(`[AppStore] Risk exposures fetched for session ${sessionId}: ${exposures.length}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[AppStore] Error in fetchRiskExposuresForSession (Session: ${sessionId}):`, errorMessage);
      set({ riskExposuresLoading: false }); 
      throw new Error(`Gagal memuat data paparan risiko dari store: ${errorMessage}`);
    }
  },
  upsertRiskExposureInState: async (exposureData, userId, period) => {
     console.log(`[AppStore] Upserting risk exposure for RiskCause: ${exposureData.riskCauseId} in Session: ${exposureData.monitoringSessionId}`);
    try {
      const upsertedExposureFromService = await upsertRiskExposureToService(exposureData, userId, period);
      set(state => {
        const index = state.riskExposures.findIndex(
          re => re.monitoringSessionId === upsertedExposureFromService.monitoringSessionId && re.riskCauseId === upsertedExposureFromService.riskCauseId
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
      console.error(`[AppStore] upsertRiskExposureInState (CauseID: ${exposureData.riskCauseId}): Failed:`, errorMessage);
      throw new Error(`Gagal menyimpan paparan risiko di store: ${errorMessage}`);
    }
  },

  // --- Monitored Control Measure Data Actions ---
  fetchMonitoredControlMeasuresForSession: async (sessionId, userId, period) => {
    console.log(`[AppStore] Fetching monitored control measures for Session: ${sessionId}`);
    set({ monitoredControlMeasuresLoading: true });
    try {
      // Placeholder: Replace with actual service call
      // const mcms = await getMonitoredControlMeasuresForSessionAndCause(sessionId, null, userId, period); // null for causeId to get all for session
      // Untuk sekarang, kita asumsikan belum ada service, jadi kembalikan array kosong.
      // Nanti, ini akan diganti dengan pemanggilan service yang sesungguhnya.
      const mcms: MonitoredControlMeasureData[] = []; 
      console.log(`[AppStore] Monitored control measures fetched for session ${sessionId}: ${mcms.length} (mocked)`);
      set(state => ({
        monitoredControlMeasuresData: [
          ...state.monitoredControlMeasuresData.filter(mcmd => mcmd.monitoringSessionId !== sessionId),
          ...mcms
        ],
        monitoredControlMeasuresLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[AppStore] Error in fetchMonitoredControlMeasuresForSession (Session: ${sessionId}):`, errorMessage);
      set({ monitoredControlMeasuresLoading: false });
      // Sebaiknya tidak melempar error di sini agar UI tidak crash, cukup catat dan lanjutkan.
      // throw new Error(`Gagal memuat data pemantauan kontrol dari store: ${errorMessage}`);
    }
  },
  upsertMonitoredControlMeasureInState: async (mcmData, userId, period) => {
    console.log(`[AppStore] Upserting monitored control measure data for Control: ${mcmData.controlMeasureId}`);
    try {
      // Placeholder: Ganti dengan pemanggilan service yang sesungguhnya jika sudah ada.
      // const upsertedMCMFromService = await upsertMonitoredControlMeasureToService(mcmData, userId, period);
      
      // Mockup data jika service belum ada
      const mockId = `${mcmData.monitoringSessionId}_${mcmData.controlMeasureId}`;
      const existingMCM = get().monitoredControlMeasuresData.find(m => m.id === mockId);
      const upsertedMCM: MonitoredControlMeasureData = {
        ...mcmData,
        id: existingMCM?.id || mockId, 
        userId,
        period,
        recordedAt: existingMCM?.recordedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set(state => {
        const index = state.monitoredControlMeasuresData.findIndex(
          m => m.monitoringSessionId === upsertedMCM.monitoringSessionId && m.controlMeasureId === upsertedMCM.controlMeasureId
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
      console.error(`[AppStore] upsertMonitoredControlMeasureInState (ControlID: ${mcmData.controlMeasureId}): Failed:`, errorMessage);
      throw new Error(`Gagal menyimpan data pemantauan kontrol di store: ${errorMessage}`);
    }
  },

}));

export const triggerGlobalDataFetch = (userId: string | null, period: string | null) => {
  const store = useAppStore.getState();
  if (userId && period) {
    store.triggerGlobalDataFetch(userId, period); 
  } else {
    store.resetAllData();
  }
};
