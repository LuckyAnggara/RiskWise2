
"use client";

import { create } from 'zustand';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, AppUser, MonitoringSession, RiskExposure, MonitoredControlMeasureData, ControlMeasureTypeKey, MonitoringSessionStatus } from '@/lib/types'; 
import { 
  addGoal as addGoalToService, 
  getGoals as getGoalsFromService, 
  updateGoal as updateGoalInService, 
  deleteGoal as deleteGoalFromService,
  getGoalById as getGoalByIdFromService, // Added
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
// import { upsertMonitoredControlMeasure, getMonitoredControlMeasuresForSessionAndCause } from '@/services/monitoredControlMeasureService'; // Placeholder

interface AppState {
  activeUprId: string | null; 
  activePeriod: string | null; 
  dataFetchedForUprPeriod: string | null; 

  goals: Goal[];
  goalsLoading: boolean;
  fetchGoals: (uprId: string, period: string, actualUserId: string) => Promise<void>;
  addGoalToStore: (goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'userId' | 'period' | 'uprId'>, uprId: string, period: string, actualUserId: string) => Promise<Goal | null>;
  updateGoalInStore: (goalId: string, updatedData: Partial<Omit<Goal, 'id' | 'userId' | 'period' | 'code' | 'createdAt' | 'uprId'>>) => Promise<Goal | null>;
  deleteGoalFromStore: (goalId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  getGoalById: (goalId: string, uprId: string, period: string) => Promise<Goal | null>;

  potentialRisks: PotentialRisk[];
  potentialRisksLoading: boolean;
  fetchPotentialRisks: (uprId: string, period: string, actualUserId: string) => Promise<void>;
  addPotentialRiskToStore: (data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'sequenceNumber' | 'goalId' | 'uprId'>, goalId: string, uprId: string, period: string, actualUserId: string, sequenceNumber: number) => Promise<PotentialRisk | null>;
  updatePotentialRiskInStore: (potentialRiskId: string, updatedData: Partial<Omit<PotentialRisk, 'id' | 'userId' | 'period' | 'goalId' | 'identifiedAt' | 'sequenceNumber' | 'uprId'>>) => Promise<PotentialRisk | null>;
  deletePotentialRiskFromStore: (potentialRiskId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  getPotentialRiskById: (potentialRiskId: string, uprId: string, period: string) => Promise<PotentialRisk | null>;

  riskCauses: RiskCause[];
  riskCausesLoading: boolean;
  fetchRiskCauses: (uprId: string, period: string, actualUserId: string) => Promise<void>;
  addRiskCauseToStore: (data: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'uprId'>, potentialRiskId: string, goalId: string, uprId: string, period: string, actualUserId: string, sequenceNumber: number) => Promise<RiskCause | null>;
  updateRiskCauseInStore: (riskCauseId: string, updatedData: Partial<Omit<RiskCause, 'id' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'analysisUpdatedAt' | 'uprId'>>) => Promise<RiskCause | null>;
  deleteRiskCauseFromStore: (riskCauseId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  getRiskCauseById: (riskCauseId: string, uprId: string, period: string) => Promise<RiskCause | null>;

  controlMeasures: ControlMeasure[];
  controlMeasuresLoading: boolean;
  fetchControlMeasures: (uprId: string, period: string, actualUserId: string, riskCauseId_optional?: string) => Promise<void>;
  addControlMeasureToStore: (data: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'controlType' | 'uprId'>, riskCauseId: string, potentialRiskId: string, goalId: string, uprId: string, period: string, actualUserId: string, controlType: ControlMeasureTypeKey) => Promise<ControlMeasure | null>;
  updateControlMeasureInStore: (controlMeasureId: string, updatedData: Partial<Omit<ControlMeasure, 'id' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'updatedAt' | 'uprId'>>) => Promise<ControlMeasure | null>;
  deleteControlMeasureFromStore: (controlMeasureId: string, uprId: string, period: string) => Promise<void>;
  getControlMeasureById: (controlMeasureId: string, uprId: string, period: string) => Promise<ControlMeasure | null>;
  
  monitoringSessions: MonitoringSession[];
  monitoringSessionsLoading: boolean;
  fetchMonitoringSessions: (uprId: string, period: string, actualUserId: string) => Promise<void>;
  addMonitoringSessionToState: (sessionData: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'status' | 'uprId'>, uprId: string, period: string, actualUserId: string) => Promise<MonitoringSession | null>;
  updateMonitoringSessionStatusInState: (sessionId: string, status: MonitoringSessionStatus, uprId: string, period: string, actualUserId: string) => Promise<MonitoringSession | null>;
  deleteMonitoringSessionFromState: (sessionId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  getMonitoringSessionByIdFromState: (sessionId: string) => MonitoringSession | null;

  riskExposures: RiskExposure[];
  riskExposuresLoading: boolean;
  fetchRiskExposuresForSession: (sessionId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  upsertRiskExposureInState: (exposureData: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period' | 'uprId'>, uprId: string, period: string, actualUserId: string) => Promise<RiskExposure | null>;

  monitoredControlMeasuresData: MonitoredControlMeasureData[];
  monitoredControlMeasuresLoading: boolean;
  fetchMonitoredControlMeasuresForSession: (sessionId: string, uprId: string, period: string, actualUserId: string) => Promise<void>;
  upsertMonitoredControlMeasureInState: (mcmData: Omit<MonitoredControlMeasureData, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period'| 'uprId'>, uprId: string, period: string, actualUserId: string) => Promise<MonitoredControlMeasureData | null>;

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
    const oldContextIdentifier = get().dataFetchedForUprPeriod; // Check against dataFetchedForUprPeriod
    const newContextIdentifier = `${uprId}|${period}`;
    
    set({ activeUprId: uprId, activePeriod: period });

    if (oldContextIdentifier !== newContextIdentifier) {
      console.log(`[AppStore] setAppContext: Context changed OR data not fetched for ${newContextIdentifier}. Triggering global data fetch.`);
      get().resetAllData(); // Reset data before fetching for new context
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
      // riskExposures and monitoredControlMeasuresData are fetched per session, so not set to true here
    });
    try {
      // Fetching sequence: Goals -> PRs -> RCs -> CMs. Monitoring sessions can be fetched in parallel or after goals.
      await get().fetchGoals(uprIdToFetchFor, periodToFetchFor, actualUserIdToUse);
      // Dependent fetches (PRs, RCs, CMs, Monitoring Sessions) are now triggered within their respective parent fetch success.
      console.log(`[AppStore] Global data fetch sequence initiated for ${uniqueUprPeriodIdentifier}. Dependent fetches will follow.`);
    } catch (error) {
      console.error("[AppStore] Error during triggerGlobalDataFetch main sequence:", error);
      // If the initial fetch (goals) fails, reset loading states and dataFetched marker
      set({ 
        dataFetchedForUprPeriod: null, 
        goalsLoading: false, 
        potentialRisksLoading: false, 
        riskCausesLoading: false, 
        controlMeasuresLoading: false,
        monitoringSessionsLoading: false,
        riskExposuresLoading: false,
        monitoredControlMeasuresLoading: false,
      }); 
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
      activeUprId: null, // Keep activeUprId and activePeriod if set by AuthContext
      activePeriod: null, // Or decide if these should also be reset
      dataFetchedForUprPeriod: null,
    });
  },

  fetchGoals: async (uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching goals for UPR: ${uprId}, Period: ${period}`);
    set({ goalsLoading: true });
    try {
      const result = await getGoalsFromService(uprId, period);
      if (result.success && result.goals) {
        const sortedGoals = result.goals.sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals, goalsLoading: false });
        console.log(`[AppStore] Goals fetched for UPR ${uprId}: ${sortedGoals.length}. Triggering PR & Monitoring Session fetch.`);
        await get().fetchPotentialRisks(uprId, period, actualUserId);
        await get().fetchMonitoringSessions(uprId, period, actualUserId); 
      } else {
        console.warn(`[AppStore] fetchGoals: Failed to fetch or no goals for UPR ${uprId}. Message: ${result.message}`);
        set({ goals: [], goalsLoading: false }); 
        set({ potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false }); // Cascade loading stop
      }
    } catch (error) { /* ... error handling as before ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchGoals:", errorMessage);
        set({ goals: [], goalsLoading: false, dataFetchedForUprPeriod: null });
        set({ potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false });
        throw new Error(`Gagal memuat daftar sasaran dari store: ${errorMessage}`);
    }
  },
  addGoalToStore: async (goalData, uprId, period, actualUserId) => {
    console.log(`[AppStore] Adding goal for UPR: ${uprId}, Period: ${period}`);
    try {
      const newGoalFromService = await addGoalToService(goalData, uprId, period, actualUserId);
      set(state => ({
        goals: [...state.goals, newGoalFromService].sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }))
      }));
      return newGoalFromService;
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in addGoalToStore:", errorMessage);
        throw new Error(`Gagal menambahkan sasaran di store: ${errorMessage}`);
    }
  },
  updateGoalInStore: async (goalId, updatedData) => {
    console.log(`[AppStore] Updating goal ID: ${goalId}`);
    try {
      await updateGoalInService(goalId, updatedData);
      let goalUprId = "";
      let goalPeriod = "";
      set(state => {
        const newGoals = state.goals.map(g => {
          if (g.id === goalId) {
            goalUprId = g.uprId; // Capture context for refetch
            goalPeriod = g.period;
            return { ...g, ...updatedData, updatedAt: new Date().toISOString() };
          }
          return g;
        }).sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }));
        return { goals: newGoals };
      });
      if (goalUprId && goalPeriod && get().activeUprId) { // Refetch PRs if context matches
         await get().fetchPotentialRisks(goalUprId, goalPeriod, get().activeUprId!); // Assume activeUprId is actualUserId for this context
      }
      const updatedGoal = get().goals.find(g => g.id === goalId);
      return updatedGoal || null;
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updateGoalInStore:", errorMessage);
        throw new Error(`Gagal memperbarui sasaran di store: ${errorMessage}`);
    }
  },
  deleteGoalFromStore: async (goalId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Deleting goal ID: ${goalId} from UPR: ${uprId}`);
    try {
      await deleteGoalFromService(goalId, uprId, period); // Pass uprId and period
      set(state => ({
        goals: state.goals.filter(g => g.id !== goalId),
        potentialRisks: state.potentialRisks.filter(pr => pr.goalId !== goalId && pr.uprId === uprId && pr.period === period),
        riskCauses: state.riskCauses.filter(rc => rc.goalId !== goalId && rc.uprId === uprId && rc.period === period),
        controlMeasures: state.controlMeasures.filter(cm => cm.goalId !== goalId && cm.uprId === uprId && cm.period === period),
      }));
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deleteGoalFromStore:", errorMessage);
        throw new Error(`Gagal menghapus sasaran dari store: ${errorMessage}`);
    }
  },
  getGoalById: async (goalId, uprId, period) => {
    const existingGoal = get().goals.find(g => g.id === goalId && g.uprId === uprId && g.period === period);
    if (existingGoal) return existingGoal;
    try {
      const goalFromService = await getGoalByIdFromService(goalId, uprId, period); // Pass uprId and period
      if(goalFromService) set(state => ({ goals: Array.from(new Set([...state.goals, goalFromService]))}));
      return goalFromService || null;
    } catch (error) { /* ... error handling ... */ 
        console.error(`[AppStore] Error in getGoalById from service for ${goalId}:`, error);
        return null;
    }
  },

  fetchPotentialRisks: async (uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching potential risks for UPR: ${uprId}, Period: ${period}`);
    set({ potentialRisksLoading: true });
    try {
      const currentGoals = get().goals.filter(g => g.uprId === uprId && g.period === period);
      if (currentGoals.length === 0 && !get().goalsLoading) {
        console.log("[AppStore] No goals for current UPR/Period or goals still loading, skipping PR fetch.");
        set({ potentialRisks: [], potentialRisksLoading: false });
        await get().fetchRiskCauses(uprId, period, actualUserId); // Proceed to fetch RCs (which will likely be empty)
        return;
      }
      
      let allPRs: PotentialRisk[] = [];
      for (const goal of currentGoals) {
          const prs = await getPotentialRisksByGoalIdFromService(goal.id, uprId, period, actualUserId);
          allPRs.push(...prs.map(pr => ({...pr, uprId, period}))); // Ensure UPR context
      }
      const sortedPRs = allPRs.sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`));
      set({ potentialRisks: sortedPRs, potentialRisksLoading: false });
      console.log(`[AppStore] PotentialRisks fetched for UPR ${uprId}: ${sortedPRs.length}. Triggering cause fetch.`);
      await get().fetchRiskCauses(uprId, period, actualUserId);
    } catch (error) { /* ... error handling ... */ 
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
      const newPR = await addPotentialRiskToService(data, goalId, uprId, period, actualUserId, sequenceNumber);
      set(state => ({
        potentialRisks: [...state.potentialRisks, newPR].sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`))
      }));
      return newPR;
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in addPotentialRiskToStore:", errorMessage);
        throw new Error(`Gagal menambahkan potensi risiko di store: ${errorMessage}`);
    }
  },
  updatePotentialRiskInStore: async (potentialRiskId, updatedData) => {
    console.log(`[AppStore] Updating potential risk ID: ${potentialRiskId}`);
    try {
      await updatePotentialRiskInService(potentialRiskId, updatedData);
      let prUprId = "";
      let prPeriod = "";
      set(state => {
        const newPotentialRisks = state.potentialRisks.map(pr =>{
          if (pr.id === potentialRiskId) {
            prUprId = pr.uprId; 
            prPeriod = pr.period;
            return { ...pr, ...updatedData, updatedAt: new Date().toISOString() };
          }
          return pr;
        }).sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`));
        return { potentialRisks: newPotentialRisks };
      });
      if(prUprId && prPeriod && get().activeUprId){ // Refetch RCs for this PR's context
         await get().fetchRiskCauses(prUprId, prPeriod, get().activeUprId!);
      }
      const updatedPR = get().potentialRisks.find(pr => pr.id === potentialRiskId);
      return updatedPR || null;
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updatePotentialRiskInStore:", errorMessage);
        throw new Error(`Gagal memperbarui potensi risiko di store: ${errorMessage}`);
    }
  },
  deletePotentialRiskFromStore: async (potentialRiskId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Deleting potential risk ID: ${potentialRiskId} from UPR: ${uprId}`);
    try {
      await deletePotentialRiskFromService(potentialRiskId, uprId, period); // Pass uprId and period
      set(state => ({
        potentialRisks: state.potentialRisks.filter(pr => pr.id !== potentialRiskId),
        riskCauses: state.riskCauses.filter(rc => rc.potentialRiskId !== potentialRiskId && rc.uprId === uprId && rc.period === period), 
        controlMeasures: state.controlMeasures.filter(cm => cm.potentialRiskId !== potentialRiskId && cm.uprId === uprId && cm.period === period), 
      }));
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deletePotentialRiskFromStore:", errorMessage);
        throw new Error(`Gagal menghapus potensi risiko dari store: ${errorMessage}`);
    }
  },
  getPotentialRiskById: async (potentialRiskId, uprId, period) => {
    const existingPR = get().potentialRisks.find(pr => pr.id === potentialRiskId && pr.uprId === uprId && pr.period === period);
    if (existingPR) return existingPR;
    try {
      return await getPotentialRiskByIdFromService(potentialRiskId, uprId, period); // Pass uprId and period
    } catch (error) { /* ... error handling ... */ 
        console.error(`[AppStore] Error in getPotentialRiskById from service for ${potentialRiskId}:`, error);
        return null;
    }
  },

  fetchRiskCauses: async (uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching risk causes for UPR: ${uprId}, Period: ${period}`);
    set({ riskCausesLoading: true });
    try {
      const currentPRs = get().potentialRisks.filter(pr => pr.uprId === uprId && pr.period === period);
      if (currentPRs.length === 0 && !get().potentialRisksLoading) {
        console.log("[AppStore] No PRs for current UPR/Period or PRs still loading, skipping RC fetch.");
        set({ riskCauses: [], riskCausesLoading: false });
        await get().fetchControlMeasures(uprId, period, actualUserId); // Proceed to fetch CMs (likely empty)
        return;
      }
      let allRCs: RiskCause[] = [];
      for (const pr of currentPRs) {
          const rcs = await getRiskCausesByPotentialRiskIdFromService(pr.id, uprId, period, actualUserId);
          allRCs.push(...rcs.map(rc => ({...rc, uprId, period}))); // Ensure UPR context
      }
      const sortedRCs = allRCs.sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`));
      set({ riskCauses: sortedRCs, riskCausesLoading: false });
      console.log(`[AppStore] RiskCauses fetched for UPR ${uprId}: ${sortedRCs.length}. Triggering CM fetch.`);
      await get().fetchControlMeasures(uprId, period, actualUserId);
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchRiskCauses:", errorMessage);
        set({ riskCauses: [], riskCausesLoading: false, dataFetchedForUprPeriod: null });
        set({ controlMeasuresLoading: false }); 
        throw new Error(`Gagal memuat penyebab risiko dari store: ${errorMessage}`);
    }
  },
  addRiskCauseToStore: async (data, potentialRiskId, goalId, uprId, period, actualUserId, sequenceNumber) => { 
    console.log(`[AppStore] Adding risk cause to PR: ${potentialRiskId} in UPR: ${uprId}`);
    try {
      const newRC = await addRiskCauseToService(data, potentialRiskId, goalId, uprId, period, actualUserId, sequenceNumber);
      set(state => ({
        riskCauses: [...state.riskCauses, newRC].sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`))
      }));
      return newRC;
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in addRiskCauseToStore:", errorMessage);
        throw new Error(`Gagal menambahkan penyebab risiko di store: ${errorMessage}`);
    }
  },
  updateRiskCauseInStore: async (riskCauseId, updatedData) => {
    console.log(`[AppStore] Updating risk cause ID: ${riskCauseId}`);
    try {
      await updateRiskCauseInService(riskCauseId, updatedData);
      let rcUprId = "";
      let rcPeriod = "";
      set(state => {
        const newRiskCauses = state.riskCauses.map(rc =>{
          if (rc.id === riskCauseId) {
             rcUprId = rc.uprId;
             rcPeriod = rc.period;
            return { ...rc, ...updatedData, analysisUpdatedAt: new Date().toISOString() };
          }
          return rc;
        }).sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`));
        return { riskCauses: newRiskCauses };
      });
      if(rcUprId && rcPeriod && get().activeUprId){ // Refetch CMs for this RC's context
         await get().fetchControlMeasures(rcUprId, rcPeriod, get().activeUprId!, riskCauseId);
      }
      const updatedRC = get().riskCauses.find(rc => rc.id === riskCauseId);
      return updatedRC || null;
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updateRiskCauseInStore:", errorMessage);
        throw new Error(`Gagal memperbarui penyebab risiko di store: ${errorMessage}`);
    }
  },
  deleteRiskCauseFromStore: async (riskCauseId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Deleting risk cause ID: ${riskCauseId} from UPR: ${uprId}`);
    try {
      await deleteRiskCauseFromService(riskCauseId, uprId, period); // Pass uprId and period
      set(state => ({
        riskCauses: state.riskCauses.filter(rc => rc.id !== riskCauseId),
        controlMeasures: state.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId && cm.uprId === uprId && cm.period === period), 
      }));
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deleteRiskCauseFromStore:", errorMessage);
        throw new Error(`Gagal menghapus penyebab risiko dari store: ${errorMessage}`);
    }
  },
  getRiskCauseById: async (riskCauseId, uprId, period) => {
    const existingRC = get().riskCauses.find(rc => rc.id === riskCauseId && rc.uprId === uprId && rc.period === period);
    if (existingRC) return existingRC;
    try {
      return await getRiskCauseByIdFromService(riskCauseId, uprId, period); // Pass uprId and period
    } catch (error) { /* ... error handling ... */ 
        console.error(`[AppStore] Error in getRiskCauseById from service for ${riskCauseId}:`, error);
        return null;
    }
  },

  fetchControlMeasures: async (uprId, period, actualUserId, riskCauseId_optional?: string) => {
    console.log(`[AppStore] Fetching CMs. UPR: ${uprId}, Period: ${period}, RC_ID(opt): ${riskCauseId_optional}`);
    set({ controlMeasuresLoading: true });
    try {
      let allCMs: ControlMeasure[] = [];
      if (riskCauseId_optional) { 
        allCMs = await fetchControlMeasuresByRiskCauseIdFromService(riskCauseId_optional, uprId, period, actualUserId);
        set(state => ({
          controlMeasures: [ 
            ...state.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId_optional || cm.uprId !== uprId || cm.period !== period), // Remove old for this specific cause
            ...allCMs.map(cm => ({...cm, uprId, period})) // Add new with correct context
          ].sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`)),
        }));
      } else { 
        const currentRCs = get().riskCauses.filter(rc => rc.uprId === uprId && rc.period === period);
        if (currentRCs.length === 0 && !get().riskCausesLoading) {
          console.log("[AppStore] No RCs for current UPR/Period or RCs still loading, skipping CM fetch for all.");
          set({ controlMeasures: [] });
        } else {
          for (const rc of currentRCs) {
              const cms = await fetchControlMeasuresByRiskCauseIdFromService(rc.id, uprId, period, actualUserId);
              allCMs.push(...cms.map(cm => ({...cm, uprId, period}))); // Ensure context
          }
          const sortedCMs = allCMs.sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`));
          set({ controlMeasures: sortedCMs });
        }
      }
      set({ controlMeasuresLoading: false });
      console.log(`[AppStore] ControlMeasures fetched for UPR ${uprId}: ${allCMs.length}. Global data fetch for ${uprId}|${period} complete.`);
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchControlMeasures:", errorMessage);
        set({ controlMeasures: [], controlMeasuresLoading: false, dataFetchedForUprPeriod: null }); 
        throw new Error(`Gagal memuat tindakan pengendalian dari store: ${errorMessage}`);
    }
  },
  addControlMeasureToStore: async (data, riskCauseId, potentialRiskId, goalId, uprId, period, actualUserId, controlType) => { 
    console.log(`[AppStore] Adding CM to RC: ${riskCauseId} in UPR: ${uprId} type: ${controlType}`);
    try {
      const newCM = await addControlMeasureToService(data, riskCauseId, potentialRiskId, goalId, uprId, period, actualUserId, controlType); 
      set(state => ({
        controlMeasures: [...state.controlMeasures, newCM].sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`))
      }));
      return newCM;
    } catch (error) { /* ... error handling ... */ 
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
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updateControlMeasureInStore:", errorMessage);
        throw new Error(`Gagal memperbarui tindakan pengendalian di store: ${errorMessage}`);
    }
  },
  deleteControlMeasureFromStore: async (controlMeasureId, uprId, period) => { 
    console.log(`[AppStore] Deleting CM ID: ${controlMeasureId} from UPR: ${uprId}, Period: ${period}`);
    try {
      // Validate if CM belongs to current UPR/Period before deleting from service
      const cmToDelete = get().controlMeasures.find(cm => cm.id === controlMeasureId);
      if (cmToDelete && cmToDelete.uprId === uprId && cmToDelete.period === period) {
        await deleteControlMeasureFromService(controlMeasureId);
        set(state => ({
          controlMeasures: state.controlMeasures.filter(cm => cm.id !== controlMeasureId)
        }));
      } else if (cmToDelete) {
        console.warn(`[AppStore] CM ${controlMeasureId} does not match context UPR/Period. Not deleting from service.`);
        set(state => ({ controlMeasures: state.controlMeasures.filter(cm => cm.id !== controlMeasureId) })); // Still remove from local store
      } else {
        console.warn(`[AppStore] CM ${controlMeasureId} not found in local store.`);
      }
    } catch (error) { /* ... error handling ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deleteControlMeasureFromStore:", errorMessage);
        throw new Error(`Gagal menghapus tindakan pengendalian dari store: ${errorMessage}`);
    }
  },
  getControlMeasureById: async (controlMeasureId, uprId, period) => {
    const existingCM = get().controlMeasures.find(cm => cm.id === controlMeasureId && cm.uprId === uprId && cm.period === period);
    if (existingCM) return existingCM;
    try {
      return await getControlMeasureByIdFromService(controlMeasureId, uprId, period); // Pass uprId and period
    } catch (error) { /* ... error handling ... */ 
        console.error(`[AppStore] Error in getControlMeasureById from service for ${controlMeasureId}:`, error);
        return null;
    }
  },
  
  fetchMonitoringSessions: async (uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching monitoring sessions for UPR: ${uprId}, Period: ${period}`);
    set({ monitoringSessionsLoading: true });
    try {
      const sessions = await getMonitoringSessionsFromService(uprId, period, actualUserId); // Pass uprId and period
      set({ monitoringSessions: sessions, monitoringSessionsLoading: false });
      console.log(`[AppStore] Monitoring sessions fetched for UPR ${uprId}: ${sessions.length}.`);
    } catch (error) { /* ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchMonitoringSessions:", errorMessage);
        set({ monitoringSessions: [], monitoringSessionsLoading: false });
        throw new Error(`Gagal memuat sesi pemantauan dari store: ${errorMessage}`);
    }
  },
  addMonitoringSessionToState: async (sessionData, uprId, period, actualUserId) => {
    console.log(`[AppStore] Adding monitoring session for UPR: ${uprId}, Period: ${period}`);
    try {
      const newSession = await addMonitoringSessionToService(sessionData, uprId, period, actualUserId); // Pass uprId and period
      set(state => ({
        monitoringSessions: [...state.monitoringSessions, newSession].sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
      }));
      return newSession;
    } catch (error) { /* ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in addMonitoringSessionToState:", errorMessage);
        throw new Error(`Gagal menambahkan sesi pemantauan di store: ${errorMessage}`);
    }
  },
  updateMonitoringSessionStatusInState: async (sessionId, status, uprId, period, actualUserId) => {
    console.log(`[AppStore] Updating status for session ID: ${sessionId} to ${status}`);
    try {
      await updateMonitoringSessionStatusInService(sessionId, status); // Context check within service
      const updatedSession = await getMonitoringSessionByIdFromService(sessionId, uprId, period); // Pass uprId and period
      if(updatedSession){
        set(state => ({
          monitoringSessions: state.monitoringSessions.map(s => s.id === sessionId ? updatedSession : s)
        }));
        return updatedSession;
      }
      return null;
    } catch (error) { /* ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updateMonitoringSessionStatusInState:", errorMessage);
        throw new Error(`Gagal memperbarui status sesi pemantauan di store: ${errorMessage}`);
    }
  },
  deleteMonitoringSessionFromState: async (sessionId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Deleting session ID: ${sessionId} from UPR: ${uprId}`);
    try {
      await deleteMonitoringSessionFromService(sessionId, uprId, period); // Pass uprId and period
      set(state => ({
        monitoringSessions: state.monitoringSessions.filter(s => s.id !== sessionId),
        riskExposures: state.riskExposures.filter(re => re.monitoringSessionId !== sessionId && re.uprId === uprId && re.period === period), 
        monitoredControlMeasuresData: state.monitoredControlMeasuresData.filter(mcmd => mcmd.monitoringSessionId !== sessionId && mcmd.uprId === uprId && mcmd.period === period),
      }));
    } catch (error) { /* ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deleteMonitoringSessionFromState:", errorMessage);
        throw new Error(`Gagal menghapus sesi pemantauan dari store: ${errorMessage}`);
    }
  },
  getMonitoringSessionByIdFromState: (sessionId) => {
    const currentUprId = get().activeUprId;
    const currentPeriod = get().activePeriod;
    return get().monitoringSessions.find(s => s.id === sessionId && s.uprId === currentUprId && s.period === currentPeriod) || null;
  },

  fetchRiskExposuresForSession: async (sessionId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching risk exposures for Session: ${sessionId}, UPR: ${uprId}, Period: ${period}`);
    set({ riskExposuresLoading: true });
    try {
      const exposures = await getRiskExposuresBySessionFromService(sessionId, uprId, period, actualUserId); // Pass uprId and period
      set(state => ({
        riskExposures: [
          ...state.riskExposures.filter(re => re.monitoringSessionId !== sessionId || re.uprId !== uprId || re.period !== period),
          ...exposures.map(ex => ({...ex, uprId, period})) // Ensure context
        ],
        riskExposuresLoading: false,
      }));
      console.log(`[AppStore] Risk exposures fetched for session ${sessionId} (UPR ${uprId}): ${exposures.length}`);
    } catch (error) { /* ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AppStore] Error in fetchRiskExposuresForSession (Session: ${sessionId}, UPR: ${uprId}):`, errorMessage);
        set({ riskExposuresLoading: false }); 
        throw new Error(`Gagal memuat data paparan risiko dari store: ${errorMessage}`);
    }
  },
  upsertRiskExposureInState: async (exposureData, uprId, period, actualUserId) => {
     console.log(`[AppStore] Upserting risk exposure for RC: ${exposureData.riskCauseId} in Session: ${exposureData.monitoringSessionId}, UPR: ${uprId}`);
    try {
      const upsertedExposureFromService = await upsertRiskExposureToService(exposureData, uprId, period, actualUserId); // Pass uprId and period
      set(state => {
        const index = state.riskExposures.findIndex(
          re => re.monitoringSessionId === upsertedExposureFromService.monitoringSessionId && re.riskCauseId === upsertedExposureFromService.riskCauseId && re.uprId === uprId && re.period === period
        );
        if (index !== -1) {
          const updatedExposures = [...state.riskExposures];
          updatedExposures[index] = upsertedExposureFromService;
          return { riskExposures: updatedExposures };
        }
        return { riskExposures: [...state.riskExposures, upsertedExposureFromService] };
      });
      return upsertedExposureFromService;
    } catch (error) { /* ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AppStore] upsertRiskExposureInState (CauseID: ${exposureData.riskCauseId}, UPR: ${uprId}): Failed:`, errorMessage);
        throw new Error(`Gagal menyimpan paparan risiko di store: ${errorMessage}`);
    }
  },

  fetchMonitoredControlMeasuresForSession: async (sessionId, uprId, period, actualUserId) => {
    console.log(`[AppStore] Fetching monitored CMs for Session: ${sessionId}, UPR: ${uprId}`);
    set({ monitoredControlMeasuresLoading: true });
    try {
      // Placeholder: Replace with actual service call
      // const mcms = await getMonitoredCMsFromService(sessionId, uprId, period, actualUserId); 
      const mcms: MonitoredControlMeasureData[] = []; // Mocked empty array
      console.log(`[AppStore] Monitored CMs fetched for session ${sessionId} (UPR ${uprId}): ${mcms.length} (mocked)`);
      set(state => ({
        monitoredControlMeasuresData: [
          ...state.monitoredControlMeasuresData.filter(mcmd => mcmd.monitoringSessionId !== sessionId || mcmd.uprId !== uprId || mcmd.period !== period),
          ...mcms.map(mcmd => ({...mcmd, uprId, period})) // Ensure context
        ],
        monitoredControlMeasuresLoading: false,
      }));
    } catch (error) { /* ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AppStore] Error in fetchMonitoredCMsForSession (Session: ${sessionId}, UPR: ${uprId}):`, errorMessage);
        set({ monitoredControlMeasuresLoading: false });
    }
  },
  upsertMonitoredControlMeasureInState: async (mcmData, uprId, period, actualUserId) => {
    console.log(`[AppStore] Upserting monitored CM data for Control: ${mcmData.controlMeasureId} in UPR: ${uprId}`);
    try {
      // Placeholder: Replace with actual service call
      // const upsertedMCMFromService = await upsertMCMToService(mcmData, uprId, period, actualUserId);
      const mockId = `${mcmData.monitoringSessionId}_${mcmData.controlMeasureId}_${mcmData.riskCauseId}`; // More unique mock ID
      const existingMCM = get().monitoredControlMeasuresData.find(m => m.id === mockId && m.uprId === uprId && m.period === period);
      const upsertedMCM: MonitoredControlMeasureData = {
        ...mcmData,
        id: existingMCM?.id || mockId, 
        uprId, 
        userId: actualUserId,
        period,
        recordedAt: existingMCM?.recordedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set(state => {
        const index = state.monitoredControlMeasuresData.findIndex(
          m => m.monitoringSessionId === upsertedMCM.monitoringSessionId && 
               m.controlMeasureId === upsertedMCM.controlMeasureId && 
               m.riskCauseId === upsertedMCM.riskCauseId && // Check riskCauseId too
               m.uprId === uprId && m.period === period
        );
        if (index !== -1) {
          const updatedMCMs = [...state.monitoredControlMeasuresData];
          updatedMCMs[index] = upsertedMCM;
          return { monitoredControlMeasuresData: updatedMCMs };
        }
        return { monitoredControlMeasuresData: [...state.monitoredControlMeasuresData, upsertedMCM] };
      });
      return upsertedMCM;
    } catch (error) { /* ... */ 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AppStore] upsertMonitoredCMInState (ControlID: ${mcmData.controlMeasureId}, UPR: ${uprId}): Failed:`, errorMessage);
        throw new Error(`Gagal menyimpan data pemantauan kontrol di store: ${errorMessage}`);
    }
  },
}));

export const triggerGlobalDataFetchForStore = (uprId: string | null, period: string | null, actualUserId: string | null) => {
  const store = useAppStore.getState();
  if (uprId && period && actualUserId) {
    store.setAppContext(uprId, period, actualUserId); 
  } else {
    console.warn("[triggerGlobalDataFetchForStore] Context is incomplete, resetting store.");
    store.resetAllData(); 
  }
};
