
"use client";

import { create } from 'zustand';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, AppUser, MonitoringSession, RiskExposure, MonitoredControlMeasureData, ControlMeasureTypeKey, MonitoringSessionStatus } from '@/lib/types'; 
import { 
  addGoal as addGoalToService, 
  getGoals as getGoalsFromService, 
  updateGoal as updateGoalInService, 
  deleteGoal as deleteGoalFromService,
  getGoalById as getGoalByIdFromService, 
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
import { 
  upsertMonitoredControlMeasure as upsertMonitoredControlMeasureToService, 
  getMonitoredControlMeasuresBySession as getMonitoredControlMeasuresBySessionFromService 
} from '@/services/monitoredControlMeasureService';


interface AppState {
  activeUprId: string | null; 
  activePeriod: string | null; 
  activeUserId: string | null; 
  dataFetchedForUprPeriod: string | null; 

  goals: Goal[];
  goalsLoading: boolean;
  fetchGoals: (uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>;
  addGoalToStore: (goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'userId' | 'period' | 'uprId'>) => Promise<Goal | null>;
  updateGoalInStore: (goalId: string, updatedData: Partial<Omit<Goal, 'id' | 'userId' | 'period' | 'code' | 'createdAt' | 'uprId'>>) => Promise<Goal | null>;
  deleteGoalFromStore: (goalId: string) => Promise<void>;
  getGoalById: (goalId: string, uprIdToQuery: string, periodToQuery: string) => Promise<Goal | null>;

  potentialRisks: PotentialRisk[];
  potentialRisksLoading: boolean;
  fetchPotentialRisks: (uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>;
  addPotentialRiskToStore: (data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'sequenceNumber' | 'goalId' | 'uprId'>, goalId: string, sequenceNumber: number) => Promise<PotentialRisk | null>;
  updatePotentialRiskInStore: (potentialRiskId: string, updatedData: Partial<Omit<PotentialRisk, 'id' | 'userId' | 'period' | 'goalId' | 'identifiedAt' | 'sequenceNumber' | 'uprId'>>) => Promise<PotentialRisk | null>;
  deletePotentialRiskFromStore: (potentialRiskId: string) => Promise<void>;
  getPotentialRiskById: (potentialRiskId: string, uprIdToQuery: string, periodToQuery: string) => Promise<PotentialRisk | null>;

  riskCauses: RiskCause[];
  riskCausesLoading: boolean;
  fetchRiskCauses: (uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>;
  addRiskCauseToStore: (data: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'uprId'>, potentialRiskId: string, goalId: string, sequenceNumber: number) => Promise<RiskCause | null>;
  updateRiskCauseInStore: (riskCauseId: string, updatedData: Partial<Omit<RiskCause, 'id' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'analysisUpdatedAt' | 'uprId'>>) => Promise<RiskCause | null>;
  deleteRiskCauseFromStore: (riskCauseId: string) => Promise<void>;
  getRiskCauseById: (riskCauseId: string, uprIdToQuery: string, periodToQuery: string) => Promise<RiskCause | null>;

  controlMeasures: ControlMeasure[];
  controlMeasuresLoading: boolean;
  fetchControlMeasures: (uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string, riskCauseId_optional?: string) => Promise<void>;
  addControlMeasureToStore: (data: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'controlType' | 'uprId'>, riskCauseId: string, potentialRiskId: string, goalId: string, controlType: ControlMeasureTypeKey) => Promise<ControlMeasure | null>;
  updateControlMeasureInStore: (controlMeasureId: string, updatedData: Partial<Omit<ControlMeasure, 'id' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'updatedAt' | 'uprId'>>) => Promise<ControlMeasure | null>;
  deleteControlMeasureFromStore: (controlMeasureId: string) => Promise<void>;
  getControlMeasureById: (controlMeasureId: string, uprIdToQuery: string, periodToQuery: string) => Promise<ControlMeasure | null>;
  
  monitoringSessions: MonitoringSession[];
  monitoringSessionsLoading: boolean;
  fetchMonitoringSessions: (uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>;
  addMonitoringSessionToState: (sessionData: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'status' | 'uprId'>) => Promise<MonitoringSession | null>;
  updateMonitoringSessionStatusInState: (sessionId: string, status: MonitoringSessionStatus) => Promise<MonitoringSession | null>;
  deleteMonitoringSessionFromState: (sessionId: string) => Promise<void>;
  getMonitoringSessionByIdFromState: (sessionId: string, uprIdForContext: string, periodForContext: string) => MonitoringSession | null;

  riskExposures: RiskExposure[];
  riskExposuresLoading: boolean;
  fetchRiskExposuresForSession: (sessionId: string, uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>;
  upsertRiskExposureInState: (exposureData: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period' | 'uprId'>) => Promise<RiskExposure | null>;

  monitoredControlMeasuresData: MonitoredControlMeasureData[];
  monitoredControlMeasuresLoading: boolean;
  fetchMonitoredControlMeasuresForSession: (sessionId: string, uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>;
  upsertMonitoredControlMeasureInState: (mcmData: Omit<MonitoredControlMeasureData, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period'| 'uprId'>) => Promise<MonitoredControlMeasureData | null>;

  setAppContext: (uprId: string, period: string, actualUserId: string) => void; 
  triggerGlobalDataFetch: (uprIdToFetchFor: string, periodToFetchFor: string, actualUserIdInitiating: string) => Promise<void>;
  resetAllData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeUprId: null,
  activePeriod: null,
  activeUserId: null,
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

  setAppContext: (uprIdToSet, periodToSet, actualUserId) => {
    console.log(`[AppStore] setAppContext: Setting UPR=${uprIdToSet}, Period=${periodToSet}, User=${actualUserId}`);
    const oldContextIdentifier = get().dataFetchedForUprPeriod;
    const newContextIdentifier = `${uprIdToSet}|${periodToSet}`;
    
    set({ activeUprId: uprIdToSet, activePeriod: periodToSet, activeUserId: actualUserId });

    if (oldContextIdentifier !== newContextIdentifier) {
      console.log(`[AppStore] setAppContext: Context changed or data not fetched for ${newContextIdentifier}. Triggering global data fetch.`);
      get().resetAllData(); 
      get().triggerGlobalDataFetch(uprIdToSet, periodToSet, actualUserId);
    } else {
      console.log(`[AppStore] setAppContext: Context same and data already fetched for ${newContextIdentifier}. Not re-fetching.`);
    }
  },

  triggerGlobalDataFetch: async (uprIdToFetchFor, periodToFetchFor, actualUserIdInitiating) => {
    if (!uprIdToFetchFor || !periodToFetchFor || !actualUserIdInitiating) {
      console.warn("[AppStore] triggerGlobalDataFetch: Missing UPR ID, Period, or User ID.");
      set({ dataFetchedForUprPeriod: null, goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false });
      return;
    }
    
    const uniqueUprPeriodIdentifier = `${uprIdToFetchFor}|${periodToFetchFor}`;
    console.log(`[AppStore] triggerGlobalDataFetch for ${uniqueUprPeriodIdentifier} by User: ${actualUserIdInitiating}. Store activeUprId: ${get().activeUprId}`);
    
    set({ 
      activeUprId: uprIdToFetchFor, 
      activePeriod: periodToFetchFor,
      activeUserId: actualUserIdInitiating,
      dataFetchedForUprPeriod: uniqueUprPeriodIdentifier, 
      goalsLoading: true, 
      potentialRisksLoading: true, 
      riskCausesLoading: true, 
      controlMeasuresLoading: true,
      monitoringSessionsLoading: true, 
    });
    try {
      await get().fetchGoals(uprIdToFetchFor, periodToFetchFor, actualUserIdInitiating);
      console.log(`[AppStore] Global data fetch sequence initiated for ${uniqueUprPeriodIdentifier}. Subsequent fetches will follow.`);
    } catch (error) {
      console.error("[AppStore] Error during triggerGlobalDataFetch initial sequence:", error);
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
      goals: [], goalsLoading: false,
      potentialRisks: [], potentialRisksLoading: false,
      riskCauses: [], riskCausesLoading: false,
      controlMeasures: [], controlMeasuresLoading: false,
      monitoringSessions: [], monitoringSessionsLoading: false,
      riskExposures: [], riskExposuresLoading: false,
      monitoredControlMeasuresData: [], monitoredControlMeasuresLoading: false,
      dataFetchedForUprPeriod: null,
    });
  },

  fetchGoals: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchGoals: Context mismatch. Store: ${state.activeUprId}|${state.activePeriod}, Requested: ${uprIdForDataQuery}|${periodForDataQuery}. Aborting.`);
      set({ goalsLoading: false });
      return;
    }
    console.log(`[AppStore] Fetching goals for UPR: ${uprIdForDataQuery}, Period: ${periodForDataQuery}. Initiated by User: ${actualUserIdInitiating}`);
    set({ goalsLoading: true });
    try {
      const result = await getGoalsFromService(uprIdForDataQuery, periodForDataQuery);
      if (result.success && result.goals) {
        const filteredGoals = result.goals.filter(g => g.uprId === uprIdForDataQuery && g.period === periodForDataQuery);
        const sortedGoals = filteredGoals.sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals, goalsLoading: false });
        console.log(`[AppStore] Goals fetched for ${uprIdForDataQuery}|${periodForDataQuery}: ${sortedGoals.length}. Triggering PR & MS fetch.`);
        await get().fetchPotentialRisks(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating);
        await get().fetchMonitoringSessions(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating);
      } else {
        console.warn(`[AppStore] fetchGoals: Failed or no goals for ${uprIdForDataQuery}|${periodForDataQuery}. Message: ${result.message}`);
        set({ goals: [], goalsLoading: false });
        set({ potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false });
      }
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchGoals:", errorMessage);
        set({ goals: [], goalsLoading: false, dataFetchedForUprPeriod: null });
        set({ potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false });
        throw new Error(`Gagal memuat daftar sasaran dari store: ${errorMessage}`);
    }
  },
  addGoalToStore: async (goalData) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak aktif di store untuk menambah sasaran.");
    console.log(`[AppStore] Adding goal. Store Context: UPR ID=${activeUprId}, Period=${activePeriod}, Creator User ID=${activeUserId}`);
    try {
      const newGoalFromService = await addGoalToService(goalData, activeUprId, activePeriod, activeUserId);
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
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak aktif di store untuk memperbarui sasaran.");
    console.log(`[AppStore] Updating goal ID: ${goalId}. Store Context: UPR ID=${activeUprId}, Period=${activePeriod}`);
    try {
      await updateGoalInService(goalId, updatedData);
      let goalToUpdate = get().goals.find(g => g.id === goalId && g.uprId === activeUprId && g.period === activePeriod);
      if (goalToUpdate) {
        const updatedGoal = { ...goalToUpdate, ...updatedData, userId: activeUserId, updatedAt: new Date().toISOString() };
        set(state => ({
            goals: state.goals.map(g => g.id === goalId ? updatedGoal : g).sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }))
        }));
        await get().fetchPotentialRisks(activeUprId, activePeriod, activeUserId); // Re-fetch PRs as goal details might affect them.
        return updatedGoal;
      }
      return null;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updateGoalInStore:", errorMessage);
        throw new Error(`Gagal memperbarui sasaran di store: ${errorMessage}`);
    }
  },
  deleteGoalFromStore: async (goalId) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak aktif di store untuk menghapus sasaran.");
    console.log(`[AppStore] Deleting goal ID: ${goalId} from UPR: ${activeUprId}, Period: ${activePeriod}`);
    try {
      await deleteGoalFromService(goalId, activeUprId, activePeriod);
      set(state => ({
        goals: state.goals.filter(g => g.id !== goalId),
        potentialRisks: state.potentialRisks.filter(pr => !(pr.goalId === goalId && pr.uprId === activeUprId && pr.period === activePeriod)),
        riskCauses: state.riskCauses.filter(rc => !(rc.goalId === goalId && rc.uprId === activeUprId && rc.period === activePeriod)),
        controlMeasures: state.controlMeasures.filter(cm => !(cm.goalId === goalId && cm.uprId === activeUprId && cm.period === activePeriod)),
      }));
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deleteGoalFromStore:", errorMessage);
        throw new Error(`Gagal menghapus sasaran dari store: ${errorMessage}`);
    }
  },
  getGoalById: async (goalId, uprIdToQuery, periodToQuery) => {
    const existingGoal = get().goals.find(g => g.id === goalId && g.uprId === uprIdToQuery && g.period === periodToQuery);
    if (existingGoal) return existingGoal;
    try {
      const goalFromService = await getGoalByIdFromService(goalId, uprIdToQuery, periodToQuery);
      if(goalFromService) set(state => ({ goals: Array.from(new Set([...state.goals, goalFromService])).sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' })) }));
      return goalFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getGoalById from service for ${goalId}:`, error);
        return null;
    }
  },

  fetchPotentialRisks: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchPotentialRisks: Context mismatch. Aborting.`);
      set({ potentialRisksLoading: false });
      return;
    }
    console.log(`[AppStore] Fetching PRs for UPR: ${uprIdForDataQuery}, Period: ${periodForDataQuery}. Initiated by: ${actualUserIdInitiating}`);
    set({ potentialRisksLoading: true });
    try {
      const currentGoals = get().goals.filter(g => g.uprId === uprIdForDataQuery && g.period === periodForDataQuery);
      if (currentGoals.length === 0 && !get().goalsLoading) {
        console.log("[AppStore] No goals for current UPR/Period or goals still loading, skipping PR fetch.");
        set({ potentialRisks: [], potentialRisksLoading: false });
        await get().fetchRiskCauses(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating);
        return;
      }
      let allPRs: PotentialRisk[] = [];
      for (const goal of currentGoals) {
          const prs = await getPotentialRisksByGoalIdFromService(goal.id, uprIdForDataQuery, periodForDataQuery); // Removed actualUserIdInitiating from here
          allPRs.push(...prs.filter(pr => pr.uprId === uprIdForDataQuery && pr.period === periodForDataQuery));
      }
      const sortedPRs = allPRs.sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`));
      set({ potentialRisks: sortedPRs, potentialRisksLoading: false });
      console.log(`[AppStore] PRs fetched for ${uprIdForDataQuery}|${periodForDataQuery}: ${sortedPRs.length}. Triggering RC fetch.`);
      await get().fetchRiskCauses(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating);
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchPotentialRisks:", errorMessage);
        set({ potentialRisks: [], potentialRisksLoading: false, dataFetchedForUprPeriod: null });
        set({ riskCausesLoading: false, controlMeasuresLoading: false }); 
        throw new Error(`Gagal memuat potensi risiko dari store: ${errorMessage}`);
    }
  },
  addPotentialRiskToStore: async (data, goalId, sequenceNumber) => { 
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menambah potensi risiko.");
    console.log(`[AppStore] Adding PR to Goal: ${goalId}, UPR: ${activeUprId}. Creator: ${activeUserId}`);
    try {
      const newPR = await addPotentialRiskToService(data, goalId, activeUprId, activePeriod, activeUserId, sequenceNumber);
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
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk memperbarui potensi risiko.");
    console.log(`[AppStore] Updating PR ID: ${potentialRiskId} for UPR: ${activeUprId}. Editor: ${activeUserId}`);
    try {
      const prToUpdate = get().potentialRisks.find(pr => pr.id === potentialRiskId && pr.uprId === activeUprId && pr.period === activePeriod);
      if (!prToUpdate) throw new Error("Potensi Risiko tidak ditemukan di store untuk konteks saat ini.");
      
      await updatePotentialRiskInService(potentialRiskId, updatedData);
      const updatedPR = { ...prToUpdate, ...updatedData, userId: activeUserId, updatedAt: new Date().toISOString() };
      set(state => ({
        potentialRisks: state.potentialRisks.map(pr => pr.id === potentialRiskId ? updatedPR : pr).sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`))
      }));
      await get().fetchRiskCauses(activeUprId, activePeriod, activeUserId); // Re-fetch RCs
      return updatedPR;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updatePotentialRiskInStore:", errorMessage);
        throw new Error(`Gagal memperbarui potensi risiko di store: ${errorMessage}`);
    }
  },
  deletePotentialRiskFromStore: async (potentialRiskId) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menghapus potensi risiko.");
    console.log(`[AppStore] Deleting PR ID: ${potentialRiskId} from UPR: ${activeUprId}. User: ${activeUserId}`);
    try {
      await deletePotentialRiskFromService(potentialRiskId, activeUprId, activePeriod);
      set(state => ({
        potentialRisks: state.potentialRisks.filter(pr => pr.id !== potentialRiskId),
        riskCauses: state.riskCauses.filter(rc => !(rc.potentialRiskId === potentialRiskId && rc.uprId === activeUprId && rc.period === activePeriod)), 
        controlMeasures: state.controlMeasures.filter(cm => !(cm.potentialRiskId === potentialRiskId && cm.uprId === activeUprId && cm.period === activePeriod)), 
      }));
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deletePotentialRiskFromStore:", errorMessage);
        throw new Error(`Gagal menghapus potensi risiko dari store: ${errorMessage}`);
    }
  },
  getPotentialRiskById: async (potentialRiskId, uprIdToQuery, periodToQuery) => {
    const existingPR = get().potentialRisks.find(pr => pr.id === potentialRiskId && pr.uprId === uprIdToQuery && pr.period === periodToQuery);
    if (existingPR) return existingPR;
    try {
      const prFromService = await getPotentialRiskByIdFromService(potentialRiskId, uprIdToQuery, periodToQuery);
      if(prFromService) set(state => ({ potentialRisks: Array.from(new Set([...state.potentialRisks, prFromService])).sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`)) }));
      return prFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getPotentialRiskById from service for ${potentialRiskId}:`, error);
        return null;
    }
  },

  fetchRiskCauses: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchRiskCauses: Context mismatch. Aborting.`);
      set({ riskCausesLoading: false });
      return;
    }
    console.log(`[AppStore] Fetching RCs for UPR: ${uprIdForDataQuery}, Period: ${periodForDataQuery}. Initiated by: ${actualUserIdInitiating}`);
    set({ riskCausesLoading: true });
    try {
      const currentPRs = get().potentialRisks.filter(pr => pr.uprId === uprIdForDataQuery && pr.period === periodForDataQuery);
      if (currentPRs.length === 0 && !get().potentialRisksLoading) {
        console.log("[AppStore] No PRs for current UPR/Period or PRs still loading, skipping RC fetch.");
        set({ riskCauses: [], riskCausesLoading: false });
        await get().fetchControlMeasures(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating);
        return;
      }
      let allRCs: RiskCause[] = [];
      for (const pr of currentPRs) {
          const rcs = await getRiskCausesByPotentialRiskIdFromService(pr.id, uprIdForDataQuery, periodForDataQuery); // Removed actualUserIdInitiating
          allRCs.push(...rcs.filter(rc => rc.uprId === uprIdForDataQuery && rc.period === periodForDataQuery));
      }
      const sortedRCs = allRCs.sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`));
      set({ riskCauses: sortedRCs, riskCausesLoading: false });
      console.log(`[AppStore] RCs fetched for ${uprIdForDataQuery}|${periodForDataQuery}: ${sortedRCs.length}. Triggering CM fetch.`);
      await get().fetchControlMeasures(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating);
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchRiskCauses:", errorMessage);
        set({ riskCauses: [], riskCausesLoading: false, dataFetchedForUprPeriod: null });
        set({ controlMeasuresLoading: false }); 
        throw new Error(`Gagal memuat penyebab risiko dari store: ${errorMessage}`);
    }
  },
  addRiskCauseToStore: async (data, potentialRiskId, goalId, sequenceNumber) => { 
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menambah penyebab risiko.");
    console.log(`[AppStore] Adding RC to PR: ${potentialRiskId}, UPR: ${activeUprId}. Creator: ${activeUserId}`);
    try {
      const newRC = await addRiskCauseToService(data, potentialRiskId, goalId, activeUprId, activePeriod, activeUserId, sequenceNumber);
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
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk memperbarui penyebab risiko.");
    console.log(`[AppStore] Updating RC ID: ${riskCauseId} for UPR: ${activeUprId}. Editor: ${activeUserId}`);
    try {
      const rcToUpdate = get().riskCauses.find(rc => rc.id === riskCauseId && rc.uprId === activeUprId && rc.period === activePeriod);
      if (!rcToUpdate) throw new Error("Penyebab Risiko tidak ditemukan di store untuk konteks saat ini.");

      await updateRiskCauseInService(riskCauseId, updatedData);
      const updatedRC = { ...rcToUpdate, ...updatedData, userId: activeUserId, analysisUpdatedAt: new Date().toISOString() };
      set(state => ({
        riskCauses: state.riskCauses.map(rc => rc.id === riskCauseId ? updatedRC : rc).sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`))
      }));
      await get().fetchControlMeasures(activeUprId, activePeriod, activeUserId, riskCauseId); // Re-fetch CMs for this RC
      return updatedRC;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updateRiskCauseInStore:", errorMessage);
        throw new Error(`Gagal memperbarui penyebab risiko di store: ${errorMessage}`);
    }
  },
  deleteRiskCauseFromStore: async (riskCauseId) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menghapus penyebab risiko.");
    console.log(`[AppStore] Deleting RC ID: ${riskCauseId} from UPR: ${activeUprId}. User: ${activeUserId}`);
    try {
      await deleteRiskCauseFromService(riskCauseId, activeUprId, activePeriod);
      set(state => ({
        riskCauses: state.riskCauses.filter(rc => rc.id !== riskCauseId),
        controlMeasures: state.controlMeasures.filter(cm => !(cm.riskCauseId === riskCauseId && cm.uprId === activeUprId && cm.period === activePeriod)), 
      }));
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deleteRiskCauseFromStore:", errorMessage);
        throw new Error(`Gagal menghapus penyebab risiko dari store: ${errorMessage}`);
    }
  },
  getRiskCauseById: async (riskCauseId, uprIdToQuery, periodToQuery) => {
    const existingRC = get().riskCauses.find(rc => rc.id === riskCauseId && rc.uprId === uprIdToQuery && rc.period === periodToQuery);
    if (existingRC) return existingRC;
    try {
      const rcFromService = await getRiskCauseByIdFromService(riskCauseId, uprIdToQuery, periodToQuery);
      if(rcFromService) set(state => ({ riskCauses: Array.from(new Set([...state.riskCauses, rcFromService])).sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`)) }));
      return rcFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getRiskCauseById from service for ${riskCauseId}:`, error);
        return null;
    }
  },

  fetchControlMeasures: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating, riskCauseId_optional?: string) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchControlMeasures: Context mismatch. Aborting.`);
      set({ controlMeasuresLoading: false });
      return;
    }
    console.log(`[AppStore] Fetching CMs for UPR: ${uprIdForDataQuery}, Period: ${periodForDataQuery}, RC(opt): ${riskCauseId_optional}. Initiated by: ${actualUserIdInitiating}`);
    set({ controlMeasuresLoading: true });
    try {
      let allCMs: ControlMeasure[] = [];
      if (riskCauseId_optional) { 
        allCMs = await fetchControlMeasuresByRiskCauseIdFromService(riskCauseId_optional, uprIdForDataQuery, periodForDataQuery); // Removed actualUserIdInitiating
        set(current => ({
          controlMeasures: [ 
            ...current.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId_optional || cm.uprId !== uprIdForDataQuery || cm.period !== periodForDataQuery),
            ...allCMs.filter(cm => cm.uprId === uprIdForDataQuery && cm.period === periodForDataQuery)
          ].sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`)),
        }));
      } else { 
        const currentRCs = get().riskCauses.filter(rc => rc.uprId === uprIdForDataQuery && rc.period === periodForDataQuery);
        if (currentRCs.length === 0 && !get().riskCausesLoading) {
          console.log("[AppStore] No RCs for current UPR/Period or RCs still loading, skipping CM fetch for all.");
          set({ controlMeasures: [] });
        } else {
          for (const rc of currentRCs) {
              const cms = await fetchControlMeasuresByRiskCauseIdFromService(rc.id, uprIdForDataQuery, periodForDataQuery); // Removed actualUserIdInitiating
              allCMs.push(...cms.filter(cm => cm.uprId === uprIdForDataQuery && cm.period === periodForDataQuery));
          }
          const sortedCMs = allCMs.sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`));
          set({ controlMeasures: sortedCMs });
        }
      }
      set({ controlMeasuresLoading: false });
      console.log(`[AppStore] CMs fetched for ${uprIdForDataQuery}|${periodForDataQuery}: ${allCMs.length}. Global data fetch complete.`);
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchControlMeasures:", errorMessage);
        set({ controlMeasures: [], controlMeasuresLoading: false, dataFetchedForUprPeriod: null }); 
        throw new Error(`Gagal memuat tindakan pengendalian dari store: ${errorMessage}`);
    }
  },
  addControlMeasureToStore: async (data, riskCauseId, potentialRiskId, goalId, controlType) => { 
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menambah pengendalian.");
    console.log(`[AppStore] Adding CM to RC: ${riskCauseId}, UPR: ${activeUprId}, Type: ${controlType}. Creator: ${activeUserId}`);
    try {
      const newCM = await addControlMeasureToService(data, riskCauseId, potentialRiskId, goalId, activeUprId, activePeriod, activeUserId, controlType); 
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
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk memperbarui pengendalian.");
    console.log(`[AppStore] Updating CM ID: ${controlMeasureId} for UPR: ${activeUprId}. Editor: ${activeUserId}`);
    try {
      const cmToUpdate = get().controlMeasures.find(cm => cm.id === controlMeasureId && cm.uprId === activeUprId && cm.period === activePeriod);
      if (!cmToUpdate) throw new Error("Pengendalian tidak ditemukan di store untuk konteks saat ini.");

      await updateControlMeasureInService(controlMeasureId, updatedData);
      const updatedCM = { ...cmToUpdate, ...updatedData, userId: activeUserId, updatedAt: new Date().toISOString() };
      set(state => ({
        controlMeasures: state.controlMeasures.map(cm => cm.id === controlMeasureId ? updatedCM : cm).sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`))
      }));
      return updatedCM;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updateControlMeasureInStore:", errorMessage);
        throw new Error(`Gagal memperbarui tindakan pengendalian di store: ${errorMessage}`);
    }
  },
  deleteControlMeasureFromStore: async (controlMeasureId) => { 
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menghapus pengendalian.");
    console.log(`[AppStore] Deleting CM ID: ${controlMeasureId} from UPR: ${activeUprId}. User: ${activeUserId}`);
    try {
      const cmToDelete = get().controlMeasures.find(cm => cm.id === controlMeasureId && cm.uprId === activeUprId && cm.period === activePeriod);
      if (!cmToDelete) throw new Error("Pengendalian tidak ditemukan di store untuk dihapus.");
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
  getControlMeasureById: async (controlMeasureId, uprIdToQuery, periodToQuery) => {
    const existingCM = get().controlMeasures.find(cm => cm.id === controlMeasureId && cm.uprId === uprIdToQuery && cm.period === periodToQuery);
    if (existingCM) return existingCM;
    try {
      const cmFromService = await getControlMeasureByIdFromService(controlMeasureId, uprIdToQuery, periodToQuery);
      if(cmFromService) set(state => ({ controlMeasures: Array.from(new Set([...state.controlMeasures, cmFromService])).sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`)) }));
      return cmFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getControlMeasureById from service for ${controlMeasureId}:`, error);
        return null;
    }
  },
  
  fetchMonitoringSessions: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchMonitoringSessions: Context mismatch. Aborting.`);
      set({ monitoringSessionsLoading: false });
      return;
    }
    console.log(`[AppStore] Fetching MSs for UPR: ${uprIdForDataQuery}, Period: ${periodForDataQuery}. Initiated by: ${actualUserIdInitiating}`);
    set({ monitoringSessionsLoading: true });
    try {
      const sessions = await getMonitoringSessionsFromService(uprIdForDataQuery, periodForDataQuery); // actualUserIdInitiating not needed for query here
      set({ monitoringSessions: sessions.filter(s => s.uprId === uprIdForDataQuery && s.period === periodForDataQuery), monitoringSessionsLoading: false });
      console.log(`[AppStore] MSs fetched for ${uprIdForDataQuery}|${periodForDataQuery}: ${sessions.length}.`);
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchMonitoringSessions:", errorMessage);
        set({ monitoringSessions: [], monitoringSessionsLoading: false });
        throw new Error(`Gagal memuat sesi pemantauan dari store: ${errorMessage}`);
    }
  },
  addMonitoringSessionToState: async (sessionData) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menambah sesi pemantauan.");
    console.log(`[AppStore] Adding MS. UPR: ${activeUprId}. Creator: ${activeUserId}`);
    try {
      const newSession = await addMonitoringSessionToService(sessionData, activeUprId, activePeriod, activeUserId);
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
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk memperbarui status sesi.");
    console.log(`[AppStore] Updating status for session ID: ${sessionId} to ${status}. UPR: ${activeUprId}. User: ${activeUserId}`);
    try {
      await updateMonitoringSessionStatusInService(sessionId, status); 
      const updatedSession = await getMonitoringSessionByIdFromService(sessionId, activeUprId, activePeriod); 
      if(updatedSession){
        set(state => ({
          monitoringSessions: state.monitoringSessions.map(s => s.id === sessionId ? { ...updatedSession, userId: activeUserId } : s)
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
  deleteMonitoringSessionFromState: async (sessionId) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menghapus sesi.");
    console.log(`[AppStore] Deleting session ID: ${sessionId} from UPR: ${activeUprId}. User: ${activeUserId}`);
    try {
      await deleteMonitoringSessionFromService(sessionId, activeUprId, activePeriod);
      set(state => ({
        monitoringSessions: state.monitoringSessions.filter(s => s.id !== sessionId),
        riskExposures: state.riskExposures.filter(re => !(re.monitoringSessionId === sessionId && re.uprId === activeUprId && re.period === activePeriod)), 
        monitoredControlMeasuresData: state.monitoredControlMeasuresData.filter(mcmd => !(mcmd.monitoringSessionId === sessionId && mcmd.uprId === activeUprId && mcmd.period === activePeriod)),
      }));
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deleteMonitoringSessionFromState:", errorMessage);
        throw new Error(`Gagal menghapus sesi pemantauan dari store: ${errorMessage}`);
    }
  },
  getMonitoringSessionByIdFromState: (sessionId, uprIdForContext, periodForContext) => {
    return get().monitoringSessions.find(s => s.id === sessionId && s.uprId === uprIdForContext && s.period === periodForContext) || null;
  },

  fetchRiskExposuresForSession: async (sessionId, uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchRiskExposuresForSession: Context mismatch. Aborting.`);
      set({ riskExposuresLoading: false });
      return;
    }
    console.log(`[AppStore] Fetching REs for Session: ${sessionId}, UPR: ${uprIdForDataQuery}. Initiated by: ${actualUserIdInitiating}`);
    set({ riskExposuresLoading: true });
    try {
      const exposures = await getRiskExposuresBySessionFromService(sessionId, uprIdForDataQuery, periodForDataQuery); // actualUserIdInitiating not needed for query
      set(state => ({
        riskExposures: [
          ...state.riskExposures.filter(re => re.monitoringSessionId !== sessionId || re.uprId !== uprIdForDataQuery || re.period !== periodForDataQuery),
          ...exposures.filter(re => re.uprId === uprIdForDataQuery && re.period === periodForDataQuery)
        ],
        riskExposuresLoading: false,
      }));
      console.log(`[AppStore] REs fetched for session ${sessionId} (UPR ${uprIdForDataQuery}): ${exposures.length}`);
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AppStore] Error in fetchRiskExposuresForSession (Session: ${sessionId}, UPR: ${uprIdForDataQuery}):`, errorMessage);
        set({ riskExposuresLoading: false }); 
        throw new Error(`Gagal memuat data paparan risiko dari store: ${errorMessage}`);
    }
  },
  upsertRiskExposureInState: async (exposureData) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menyimpan paparan risiko.");
    console.log(`[AppStore] Upserting RE for RC: ${exposureData.riskCauseId}, Session: ${exposureData.monitoringSessionId}, UPR: ${activeUprId}. Creator: ${activeUserId}`);
    try {
      const upsertedExposure = await upsertRiskExposureToService(exposureData, activeUprId, activePeriod, activeUserId);
      set(state => {
        const index = state.riskExposures.findIndex(
          re => re.monitoringSessionId === upsertedExposure.monitoringSessionId && re.riskCauseId === upsertedExposure.riskCauseId && re.uprId === activeUprId && re.period === activePeriod
        );
        if (index !== -1) {
          const updatedExposures = [...state.riskExposures];
          updatedExposures[index] = upsertedExposure;
          return { riskExposures: updatedExposures };
        }
        return { riskExposures: [...state.riskExposures, upsertedExposure] };
      });
      return upsertedExposure;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AppStore] upsertRiskExposureInState (CauseID: ${exposureData.riskCauseId}, UPR: ${activeUprId}): Failed:`, errorMessage);
        throw new Error(`Gagal menyimpan paparan risiko di store: ${errorMessage}`);
    }
  },

  fetchMonitoredControlMeasuresForSession: async (sessionId, uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchMonitoredCMs: Context mismatch. Aborting.`);
      set({ monitoredControlMeasuresLoading: false });
      return;
    }
    console.log(`[AppStore] Fetching Monitored CMs for Session: ${sessionId}, UPR: ${uprIdForDataQuery}. Initiated by: ${actualUserIdInitiating}`);
    set({ monitoredControlMeasuresLoading: true });
    try {
      const mcms = await getMonitoredControlMeasuresBySessionFromService(sessionId, uprIdForDataQuery, periodForDataQuery); // actualUserIdInitiating not needed for query
      set(state => ({
        monitoredControlMeasuresData: [
          ...state.monitoredControlMeasuresData.filter(mcmd => mcmd.monitoringSessionId !== sessionId || mcmd.uprId !== uprIdForDataQuery || mcmd.period !== periodForDataQuery),
          ...mcms.filter(mcmd => mcmd.uprId === uprIdForDataQuery && mcmd.period === periodForDataQuery)
        ],
        monitoredControlMeasuresLoading: false,
      }));
      console.log(`[AppStore] Monitored CMs fetched for session ${sessionId} (UPR ${uprIdForDataQuery}): ${mcms.length}`);
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AppStore] Error in fetchMonitoredCMs (Session: ${sessionId}, UPR: ${uprIdForDataQuery}):`, errorMessage);
        set({ monitoredControlMeasuresLoading: false });
        throw new Error(`Gagal memuat data pemantauan kontrol dari store: ${errorMessage}`);
    }
  },
  upsertMonitoredControlMeasureInState: async (mcmData) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menyimpan data pemantauan kontrol.");
    console.log(`[AppStore] Upserting Monitored CM data for Control: ${mcmData.controlMeasureId}, UPR: ${activeUprId}. Creator: ${activeUserId}`);
    try {
      const upsertedMCM = await upsertMonitoredControlMeasureToService(mcmData, activeUprId, activePeriod, activeUserId);
      set(state => {
        const index = state.monitoredControlMeasuresData.findIndex(
          m => m.monitoringSessionId === upsertedMCM.monitoringSessionId && 
               m.controlMeasureId === upsertedMCM.controlMeasureId && 
               m.riskCauseId === upsertedMCM.riskCauseId && 
               m.uprId === activeUprId && m.period === activePeriod
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
        console.error(`[AppStore] upsertMonitoredCMInState (ControlID: ${mcmData.controlMeasureId}, UPR: ${activeUprId}): Failed:`, errorMessage);
        throw new Error(`Gagal menyimpan data pemantauan kontrol di store: ${errorMessage}`);
    }
  },
}));

export const triggerGlobalDataFetchForStore = (uprId: string | null, period: string | null, actualUserId: string | null) => {
  const store = useAppStore.getState();
  if (uprId && period && actualUserId) {
    store.setAppContext(uprId, period, actualUserId); 
  } else {
    console.warn("[triggerGlobalDataFetchForStore] Context is incomplete (uprId, period, or actualUserId missing). Resetting store.");
    store.resetAllData(); 
  }
};
