
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
  activeUserId: string | null; // UID of the logged-in user (could be auditor or UPR user)
  dataFetchedForUprPeriod: string | null; // Identifier like "uprId|period"

  goals: Goal[];
  goalsLoading: boolean;
  // Parameter ketiga di fetchGoals (dan lainnya) sekarang adalah uprIdForDataQuery, yang akan menjadi uprId yang datanya mau diambil
  fetchGoals: (uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>;
  addGoalToStore: (goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'userId' | 'period' | 'uprId'>) => Promise<Goal | null>;
  updateGoalInStore: (goalId: string, updatedData: Partial<Omit<Goal, 'id' | 'userId' | 'period' | 'code' | 'createdAt' | 'uprId'>>) => Promise<Goal | null>;
  deleteGoalFromStore: (goalId: string) => Promise<void>;
  getGoalById: (goalId: string, uprIdForContext: string, periodForContext: string) => Promise<Goal | null>;

  potentialRisks: PotentialRisk[];
  potentialRisksLoading: boolean;
  fetchPotentialRisks: (uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>;
  addPotentialRiskToStore: (data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'sequenceNumber' | 'goalId' | 'uprId'>, goalId: string, sequenceNumber: number) => Promise<PotentialRisk | null>;
  updatePotentialRiskInStore: (potentialRiskId: string, updatedData: Partial<Omit<PotentialRisk, 'id' | 'userId' | 'period' | 'goalId' | 'identifiedAt' | 'sequenceNumber' | 'uprId'>>) => Promise<PotentialRisk | null>;
  deletePotentialRiskFromStore: (potentialRiskId: string) => Promise<void>;
  getPotentialRiskById: (potentialRiskId: string, uprIdForContext: string, periodForContext: string) => Promise<PotentialRisk | null>;

  riskCauses: RiskCause[];
  riskCausesLoading: boolean;
  fetchRiskCauses: (uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>;
  addRiskCauseToStore: (data: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'uprId'>, potentialRiskId: string, goalId: string, sequenceNumber: number) => Promise<RiskCause | null>;
  updateRiskCauseInStore: (riskCauseId: string, updatedData: Partial<Omit<RiskCause, 'id' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'analysisUpdatedAt' | 'uprId'>>) => Promise<RiskCause | null>;
  deleteRiskCauseFromStore: (riskCauseId: string) => Promise<void>;
  getRiskCauseById: (riskCauseId: string, uprIdForContext: string, periodForContext: string) => Promise<RiskCause | null>;

  controlMeasures: ControlMeasure[];
  controlMeasuresLoading: boolean;
  fetchControlMeasures: (uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string, riskCauseId_optional?: string) => Promise<void>;
  addControlMeasureToStore: (data: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'controlType' | 'uprId'>, riskCauseId: string, potentialRiskId: string, goalId: string, controlType: ControlMeasureTypeKey) => Promise<ControlMeasure | null>;
  updateControlMeasureInStore: (controlMeasureId: string, updatedData: Partial<Omit<ControlMeasure, 'id' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'updatedAt' | 'uprId'>>) => Promise<ControlMeasure | null>;
  deleteControlMeasureFromStore: (controlMeasureId: string) => Promise<void>;
  getControlMeasureById: (controlMeasureId: string, uprIdForContext: string, periodForContext: string) => Promise<ControlMeasure | null>;
  
  monitoringSessions: MonitoringSession[];
  monitoringSessionsLoading: boolean;
  fetchMonitoringSessions: (uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>;
  addMonitoringSessionToState: (sessionData: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'status' | 'uprId'>) => Promise<MonitoringSession | null>;
  updateMonitoringSessionStatusInState: (sessionId: string, status: MonitoringSessionStatus) => Promise<MonitoringSession | null>;
  deleteMonitoringSessionFromState: (sessionId: string) => Promise<void>;
  getMonitoringSessionByIdFromState: (sessionId: string) => MonitoringSession | null; 

  riskExposures: RiskExposure[];
  riskExposuresLoading: boolean;
  fetchRiskExposuresForSession: (sessionId: string, uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>; 
  upsertRiskExposureInState: (exposureData: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period' | 'uprId'>) => Promise<RiskExposure | null>;

  monitoredControlMeasuresData: MonitoredControlMeasureData[];
  monitoredControlMeasuresLoading: boolean;
  fetchMonitoredControlMeasuresForSession: (sessionId: string, uprIdForDataQuery: string, periodForDataQuery: string, actualUserIdInitiating: string) => Promise<void>; 
  upsertMonitoredControlMeasureInState: (mcmData: Omit<MonitoredControlMeasureData, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period'| 'uprId'>) => Promise<MonitoredControlMeasureData | null>;

  setAppContext: (uprIdToSet: string, periodToSet: string, actualUserId: string) => void; 
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
    console.log(`[AppStore] setAppContext called. New Context: UPR ID=${uprIdToSet}, Period=${periodToSet}, Actual Logged-in User ID=${actualUserId}. Current Store Context UPR|P: ${get().activeUprId}|${get().activePeriod}, Fetched for: ${get().dataFetchedForUprPeriod}`);
    const oldContextIdentifier = get().dataFetchedForUprPeriod;
    const newContextIdentifier = `${uprIdToSet}|${periodToSet}`; // This identifies the UPR/Period data being viewed
    
    set({ activeUprId: uprIdToSet, activePeriod: periodToSet, activeUserId: actualUserId });

    if (oldContextIdentifier !== newContextIdentifier) {
      console.log(`[AppStore] setAppContext: Context changed OR data not fetched for ${newContextIdentifier}. Triggering global data fetch.`);
      get().resetAllData(); 
      // Pass uprIdToSet as the ID for whose data we want, and actualUserId as the initiator
      get().triggerGlobalDataFetch(uprIdToSet, periodToSet, actualUserId);
    } else {
      console.log(`[AppStore] setAppContext: Context same and data already marked as fetched for ${newContextIdentifier}. Not re-fetching.`);
    }
  },

  triggerGlobalDataFetch: async (uprIdToFetchFor, periodToFetchFor, actualUserIdInitiating) => {
    if (!uprIdToFetchFor || !periodToFetchFor || !actualUserIdInitiating) {
      console.warn("[AppStore] triggerGlobalDataFetch: Attempted to fetch data without uprId, period, or actualUserIdInitiating. Aborting.");
      set({ dataFetchedForUprPeriod: null, goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false });
      return;
    }
    
    const uniqueUprPeriodIdentifier = `${uprIdToFetchFor}|${periodToFetchFor}`;
    console.log(`[AppStore] triggerGlobalDataFetch: Starting for UPR Data Context ${uniqueUprPeriodIdentifier}, initiated by user ${actualUserIdInitiating}. Store active context UPR: ${uprIdToFetchFor}, P: ${periodToFetchFor}, User: ${actualUserIdInitiating}.`);
    
    set({ 
      activeUprId: uprIdToFetchFor,       // The UPR whose data we are viewing
      activePeriod: periodToFetchFor,    // The Period whose data we are viewing
      activeUserId: actualUserIdInitiating, // The user who is logged in and initiated this
      dataFetchedForUprPeriod: uniqueUprPeriodIdentifier, 
      goalsLoading: true, 
      potentialRisksLoading: true, 
      riskCausesLoading: true, 
      controlMeasuresLoading: true,
      monitoringSessionsLoading: true, 
      goals: [], potentialRisks: [], riskCauses: [], controlMeasures: [], monitoringSessions: [], riskExposures: [], monitoredControlMeasuresData: []
    });
    try {
      await get().fetchGoals(uprIdToFetchFor, periodToFetchFor, actualUserIdInitiating);
      console.log(`[AppStore] triggerGlobalDataFetch: Main data fetch sequence (goals) initiated for ${uniqueUprPeriodIdentifier}.`);
    } catch (error) {
      console.error(`[AppStore] triggerGlobalDataFetch: Error during initial goals fetch for ${uniqueUprPeriodIdentifier}:`, error);
      set({ 
        dataFetchedForUprPeriod: null, 
        goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false,
        monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false,
      }); 
    }
  },

  resetAllData: () => {
    console.log("[AppStore] resetAllData: Resetting all data arrays and loading states. Active context info (UPR/Period/User) preserved if already set.");
    set(state => ({ 
      goals: [], goalsLoading: false,
      potentialRisks: [], potentialRisksLoading: false,
      riskCauses: [], riskCausesLoading: false,
      controlMeasures: [], controlMeasuresLoading: false,
      monitoringSessions: [], monitoringSessionsLoading: false,
      riskExposures: [], riskExposuresLoading: false,
      monitoredControlMeasuresData: [], monitoredControlMeasuresLoading: false,
      dataFetchedForUprPeriod: null, 
    }));
  },

  // --- Goals ---
  fetchGoals: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery || state.activeUserId !== actualUserIdInitiating) {
      console.warn(`[AppStore] fetchGoals: Context mismatch. Store: ${state.activeUprId}|${state.activePeriod}|${state.activeUserId}, Requested for: ${uprIdForDataQuery}|${periodForDataQuery}|${actualUserIdInitiating}. Aborting fetch.`);
      set({ goalsLoading: false }); return;
    }
    console.log(`[AppStore] fetchGoals: For UPR Data: ${uprIdForDataQuery}, Period: ${periodForDataQuery}, by User: ${actualUserIdInitiating}`);
    set({ goalsLoading: true });
    try {
      // Service fetches goals for the UPR whose ID is uprIdForDataQuery
      const result = await getGoalsFromService(uprIdForDataQuery, periodForDataQuery);
      if (result.success && result.goals) {
        // Filter goals by the uprIdForDataQuery and periodForDataQuery to ensure data consistency
        // The `userId` field on Goal doc is the creator, but the data belongs to uprIdForDataQuery.
        const relevantGoals = result.goals.filter(g => g.uprId === uprIdForDataQuery && g.period === periodForDataQuery);
        const sortedGoals = relevantGoals.sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals, goalsLoading: false });
        console.log(`[AppStore] Goals fetched for UPR Data ${uprIdForDataQuery}: ${sortedGoals.length}. Triggering PR & Monitoring Session fetch.`);
        await get().fetchPotentialRisks(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating);
        await get().fetchMonitoringSessions(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating); 
      } else {
        console.warn(`[AppStore] fetchGoals: Failed to fetch or no goals for UPR Data ${uprIdForDataQuery}. Message: ${result.message}`);
        set({ goals: [], goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false });
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
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menambah sasaran.");
    console.log(`[AppStore] addGoalToStore: Context UPR=${activeUprId}, Period=${activePeriod}, Logged-in User=${activeUserId}`);
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
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk memperbarui sasaran.");
    console.log(`[AppStore] updateGoalInStore ID: ${goalId}. Context UPR=${activeUprId}, Period=${activePeriod}`);
    try {
      await updateGoalInService(goalId, updatedData); 
      let goalForContext: Goal | undefined;
      set(state => {
        const newGoals = state.goals.map(g => {
          if (g.id === goalId && g.uprId === activeUprId && g.period === activePeriod) {
            goalForContext = { ...g, ...updatedData, updatedAt: new Date().toISOString() };
            return goalForContext;
          }
          return g;
        }).sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }));
        return { goals: newGoals };
      });
      return goalForContext || null;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updateGoalInStore:", errorMessage);
        throw new Error(`Gagal memperbarui sasaran di store: ${errorMessage}`);
    }
  },
  deleteGoalFromStore: async (goalId) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menghapus sasaran.");
    console.log(`[AppStore] deleteGoalFromStore ID: ${goalId} from Context UPR: ${activeUprId}, Period: ${activePeriod}`);
    try {
      await deleteGoalFromService(goalId, activeUprId, activePeriod); 
      set(state => ({
        goals: state.goals.filter(g => !(g.id === goalId && g.uprId === activeUprId && g.period === activePeriod)),
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
  getGoalById: async (goalId, uprIdForContext, periodForContext) => {
    const { activeUprId, activePeriod } = get();
    if (!uprIdForContext || !periodForContext) return null;
    const existingGoal = get().goals.find(g => g.id === goalId && g.uprId === uprIdForContext && g.period === periodForContext);
    if (existingGoal) return existingGoal;
    try {
      const goalFromService = await getGoalByIdFromService(goalId, uprIdForContext, periodForContext);
      if(goalFromService && goalFromService.uprId === activeUprId && goalFromService.period === activePeriod) {
         set(state => ({ goals: Array.from(new Set([...state.goals, goalFromService])).sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' })) }));
      }
      return goalFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getGoalById from service for ${goalId}:`, error);
        return null;
    }
  },

  // --- PotentialRisks ---
  fetchPotentialRisks: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery || state.activeUserId !== actualUserIdInitiating) {
      console.warn(`[AppStore] fetchPotentialRisks: Context mismatch. Aborting fetch.`); set({ potentialRisksLoading: false }); return;
    }
    console.log(`[AppStore] fetchPotentialRisks: For UPR Data: ${uprIdForDataQuery}, Period: ${periodForDataQuery}, by User: ${actualUserIdInitiating}`);
    set({ potentialRisksLoading: true });
    try {
      const currentGoalsInContext = get().goals.filter(g => g.uprId === uprIdForDataQuery && g.period === periodForDataQuery);
      if (currentGoalsInContext.length === 0 && !get().goalsLoading) {
        console.log("[AppStore] No goals for current UPR data context, or goals still loading. Skipping PR fetch.");
        set({ potentialRisks: [], potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false });
        await get().fetchRiskCauses(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating); 
        return;
      }
      let allPRs: PotentialRisk[] = [];
      for (const goal of currentGoalsInContext) {
          const prs = await getPotentialRisksByGoalIdFromService(goal.id, uprIdForDataQuery, periodForDataQuery);
          allPRs.push(...prs.filter(pr => pr.uprId === uprIdForDataQuery && pr.period === periodForDataQuery)); 
      }
      const sortedPRs = allPRs.sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`));
      set({ potentialRisks: sortedPRs, potentialRisksLoading: false });
      console.log(`[AppStore] PotentialRisks fetched for UPR Data ${uprIdForDataQuery}: ${sortedPRs.length}. Triggering cause fetch.`);
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
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menambah potensi risiko.");
    console.log(`[AppStore] addPotentialRiskToStore: Context UPR=${activeUprId}, Period=${activePeriod}, User=${activeUserId}`);
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
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk memperbarui potensi risiko.");
    console.log(`[AppStore] updatePotentialRiskInStore ID: ${potentialRiskId}. Context UPR=${activeUprId}, Period=${activePeriod}`);
    try {
      await updatePotentialRiskInService(potentialRiskId, updatedData);
      let prForContext: PotentialRisk | undefined;
      set(state => {
        const newPotentialRisks = state.potentialRisks.map(pr =>{
          if (pr.id === potentialRiskId && pr.uprId === activeUprId && pr.period === activePeriod) {
            prForContext = { ...pr, ...updatedData, updatedAt: new Date().toISOString() };
            return prForContext;
          }
          return pr;
        }).sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`));
        return { potentialRisks: newPotentialRisks };
      });
      return prForContext || null;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updatePotentialRiskInStore:", errorMessage);
        throw new Error(`Gagal memperbarui potensi risiko di store: ${errorMessage}`);
    }
  },
  deletePotentialRiskFromStore: async (potentialRiskId) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menghapus potensi risiko.");
    console.log(`[AppStore] deletePotentialRiskFromStore ID: ${potentialRiskId} from Context UPR: ${activeUprId}, Period: ${activePeriod}`);
    try {
      await deletePotentialRiskFromService(potentialRiskId, activeUprId, activePeriod);
      set(state => ({
        potentialRisks: state.potentialRisks.filter(pr => !(pr.id === potentialRiskId && pr.uprId === activeUprId && pr.period === activePeriod)),
        riskCauses: state.riskCauses.filter(rc => !(rc.potentialRiskId === potentialRiskId && rc.uprId === activeUprId && rc.period === activePeriod)), 
        controlMeasures: state.controlMeasures.filter(cm => !(cm.potentialRiskId === potentialRiskId && cm.uprId === activeUprId && cm.period === activePeriod)), 
      }));
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deletePotentialRiskFromStore:", errorMessage);
        throw new Error(`Gagal menghapus potensi risiko dari store: ${errorMessage}`);
    }
  },
  getPotentialRiskById: async (potentialRiskId, uprIdForContext, periodForContext) => {
    const { activeUprId, activePeriod } = get();
    if (!uprIdForContext || !periodForContext) return null;
    const existingPR = get().potentialRisks.find(pr => pr.id === potentialRiskId && pr.uprId === uprIdForContext && pr.period === periodForContext);
    if (existingPR) return existingPR;
    try {
      const prFromService = await getPotentialRiskByIdFromService(potentialRiskId, uprIdForContext, periodForContext);
      if(prFromService && prFromService.uprId === activeUprId && prFromService.period === activePeriod) {
        set(state => ({ potentialRisks: Array.from(new Set([...state.potentialRisks, prFromService])).sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`)) }));
      }
      return prFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getPotentialRiskById from service for ${potentialRiskId}:`, error);
        return null;
    }
  },

  // --- RiskCauses ---
  fetchRiskCauses: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery || state.activeUserId !== actualUserIdInitiating) {
      console.warn(`[AppStore] fetchRiskCauses: Context mismatch. Aborting fetch.`); set({ riskCausesLoading: false }); return;
    }
    console.log(`[AppStore] fetchRiskCauses: For UPR Data: ${uprIdForDataQuery}, Period: ${periodForDataQuery}, by User: ${actualUserIdInitiating}`);
    set({ riskCausesLoading: true });
    try {
      const currentPRsInContext = get().potentialRisks.filter(pr => pr.uprId === uprIdForDataQuery && pr.period === periodForDataQuery);
      if (currentPRsInContext.length === 0 && !get().potentialRisksLoading) {
        console.log("[AppStore] No PRs for current UPR data context, or PRs still loading. Skipping RC fetch.");
        set({ riskCauses: [], riskCausesLoading: false, controlMeasuresLoading: false });
        await get().fetchControlMeasures(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating); 
        return;
      }
      let allRCs: RiskCause[] = [];
      for (const pr of currentPRsInContext) {
          const rcs = await getRiskCausesByPotentialRiskIdFromService(pr.id, uprIdForDataQuery, periodForDataQuery);
          allRCs.push(...rcs.filter(rc => rc.uprId === uprIdForDataQuery && rc.period === periodForDataQuery));
      }
      const sortedRCs = allRCs.sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`));
      set({ riskCauses: sortedRCs, riskCausesLoading: false });
      console.log(`[AppStore] RiskCauses fetched for UPR Data ${uprIdForDataQuery}: ${sortedRCs.length}. Triggering CM fetch.`);
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
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menambah penyebab risiko.");
    console.log(`[AppStore] addRiskCauseToStore: Context UPR=${activeUprId}, Period=${activePeriod}, User=${activeUserId}`);
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
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk memperbarui penyebab risiko.");
    console.log(`[AppStore] updateRiskCauseInStore ID: ${riskCauseId}. Context UPR=${activeUprId}, Period=${activePeriod}`);
    try {
      await updateRiskCauseInService(riskCauseId, updatedData);
      let rcForContext: RiskCause | undefined;
      set(state => {
        const newRiskCauses = state.riskCauses.map(rc =>{
          if (rc.id === riskCauseId && rc.uprId === activeUprId && rc.period === activePeriod) {
            rcForContext = { ...rc, ...updatedData, analysisUpdatedAt: new Date().toISOString() };
            return rcForContext;
          }
          return rc;
        }).sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`));
        return { riskCauses: newRiskCauses };
      });
      if(rcForContext && activeUserId){ 
         await get().fetchControlMeasures(rcForContext.uprId, rcForContext.period, activeUserId, riskCauseId);
      }
      return rcForContext || null;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updateRiskCauseInStore:", errorMessage);
        throw new Error(`Gagal memperbarui penyebab risiko di store: ${errorMessage}`);
    }
  },
  deleteRiskCauseFromStore: async (riskCauseId) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menghapus penyebab risiko.");
    console.log(`[AppStore] deleteRiskCauseFromStore ID: ${riskCauseId} from Context UPR: ${activeUprId}, Period: ${activePeriod}`);
    try {
      await deleteRiskCauseFromService(riskCauseId, activeUprId, activePeriod);
      set(state => ({
        riskCauses: state.riskCauses.filter(rc => !(rc.id === riskCauseId && rc.uprId === activeUprId && rc.period === activePeriod)),
        controlMeasures: state.controlMeasures.filter(cm => !(cm.riskCauseId === riskCauseId && cm.uprId === activeUprId && cm.period === activePeriod)), 
      }));
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deleteRiskCauseFromStore:", errorMessage);
        throw new Error(`Gagal menghapus penyebab risiko dari store: ${errorMessage}`);
    }
  },
  getRiskCauseById: async (riskCauseId, uprIdForContext, periodForContext) => {
    const { activeUprId, activePeriod } = get();
    if (!uprIdForContext || !periodForContext) return null;
    const existingRC = get().riskCauses.find(rc => rc.id === riskCauseId && rc.uprId === uprIdForContext && rc.period === periodForContext);
    if (existingRC) return existingRC;
    try {
      const rcFromService = await getRiskCauseByIdFromService(riskCauseId, uprIdForContext, periodForContext);
      if(rcFromService && rcFromService.uprId === activeUprId && rcFromService.period === activePeriod) {
        set(state => ({ riskCauses: Array.from(new Set([...state.riskCauses, rcFromService])).sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`)) }));
      }
      return rcFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getRiskCauseById from service for ${riskCauseId}:`, error);
        return null;
    }
  },

  // --- ControlMeasures ---
  fetchControlMeasures: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating, riskCauseId_optional?: string) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery || state.activeUserId !== actualUserIdInitiating) {
      console.warn(`[AppStore] fetchControlMeasures: Context mismatch. Aborting fetch.`); set({ controlMeasuresLoading: false }); return;
    }
    console.log(`[AppStore] fetchControlMeasures: UPR Data: ${uprIdForDataQuery}, Period: ${periodForDataQuery}, User: ${actualUserIdInitiating}, RC_ID(opt): ${riskCauseId_optional}`);
    set({ controlMeasuresLoading: true });
    try {
      let allCMs: ControlMeasure[] = [];
      if (riskCauseId_optional) { 
        allCMs = await fetchControlMeasuresByRiskCauseIdFromService(riskCauseId_optional, uprIdForDataQuery, periodForDataQuery); 
        set(current => ({
          controlMeasures: [ 
            ...current.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId_optional || cm.uprId !== uprIdForDataQuery || cm.period !== periodForDataQuery), 
            ...allCMs.filter(cm => cm.uprId === uprIdForDataQuery && cm.period === periodForDataQuery) 
          ].sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`)),
        }));
      } else { 
        const currentRCsInContext = get().riskCauses.filter(rc => rc.uprId === uprIdForDataQuery && rc.period === periodForDataQuery);
        if (currentRCsInContext.length === 0 && !get().riskCausesLoading) {
          console.log("[AppStore] No RCs for current UPR data context, or RCs still loading. Skipping CM fetch for all.");
          set({ controlMeasures: [] });
        } else {
          for (const rc of currentRCsInContext) {
              const cms = await fetchControlMeasuresByRiskCauseIdFromService(rc.id, uprIdForDataQuery, periodForDataQuery);
              allCMs.push(...cms.filter(cm => cm.uprId === uprIdForDataQuery && cm.period === periodForDataQuery));
          }
          const sortedCMs = allCMs.sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`));
          set({ controlMeasures: sortedCMs });
        }
      }
      set({ controlMeasuresLoading: false });
      console.log(`[AppStore] ControlMeasures fetched for UPR Data ${uprIdForDataQuery} (RC specific: ${!!riskCauseId_optional}): ${allCMs.length}. Global fetch sequence complete for this branch.`);
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchControlMeasures:", errorMessage);
        set({ controlMeasures: [], controlMeasuresLoading: false, dataFetchedForUprPeriod: null }); 
        throw new Error(`Gagal memuat tindakan pengendalian dari store: ${errorMessage}`);
    }
  },
  addControlMeasureToStore: async (data, riskCauseId, potentialRiskId, goalId, controlType) => { 
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menambah pengendalian.");
    console.log(`[AppStore] addControlMeasureToStore: Context UPR=${activeUprId}, Period=${activePeriod}, User=${activeUserId}`);
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
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk memperbarui pengendalian.");
    console.log(`[AppStore] updateControlMeasureInStore ID: ${controlMeasureId}. Context UPR=${activeUprId}, Period=${activePeriod}`);
    try {
      await updateControlMeasureInService(controlMeasureId, updatedData);
      let cmForContext: ControlMeasure | undefined;
      set(state => {
        const newControlMeasures = state.controlMeasures.map(cm => {
          if (cm.id === controlMeasureId && cm.uprId === activeUprId && cm.period === activePeriod) {
            cmForContext = { ...cm, ...updatedData, updatedAt: new Date().toISOString() };
            return cmForContext;
          }
          return cm;
        }).sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`));
        return { controlMeasures: newControlMeasures };
      });
      return cmForContext || null;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updateControlMeasureInStore:", errorMessage);
        throw new Error(`Gagal memperbarui tindakan pengendalian di store: ${errorMessage}`);
    }
  },
  deleteControlMeasureFromStore: async (controlMeasureId) => { 
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menghapus pengendalian.");
    console.log(`[AppStore] deleteControlMeasureFromStore ID: ${controlMeasureId} from Context UPR: ${activeUprId}, Period: ${activePeriod}`);
    try {
      const cmToDelete = get().controlMeasures.find(cm => cm.id === controlMeasureId && cm.uprId === activeUprId && cm.period === activePeriod && cm.userId === activeUserId);
      if (cmToDelete) {
        await deleteControlMeasureFromService(controlMeasureId);
        set(state => ({
          controlMeasures: state.controlMeasures.filter(cm => cm.id !== controlMeasureId)
        }));
      } else {
        console.warn(`[AppStore] ControlMeasure ${controlMeasureId} not found in current context or does not belong to user. Delete from store skipped.`);
      }
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deleteControlMeasureFromStore:", errorMessage);
        throw new Error(`Gagal menghapus tindakan pengendalian dari store: ${errorMessage}`);
    }
  },
  getControlMeasureById: async (controlMeasureId, uprIdForContext, periodForContext) => {
    const { activeUprId, activePeriod } = get();
    if (!uprIdForContext || !periodForContext) return null;
    const existingCM = get().controlMeasures.find(cm => cm.id === controlMeasureId && cm.uprId === uprIdForContext && cm.period === periodForContext);
    if (existingCM) return existingCM;
    try {
      const cmFromService = await getControlMeasureByIdFromService(controlMeasureId, uprIdForContext, periodForContext);
      if(cmFromService && cmFromService.uprId === activeUprId && cmFromService.period === activePeriod) {
        set(state => ({ controlMeasures: Array.from(new Set([...state.controlMeasures, cmFromService])).sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`)) }));
      }
      return cmFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getControlMeasureById from service for ${controlMeasureId}:`, error);
        return null;
    }
  },
  
  // --- Monitoring Sessions ---
  fetchMonitoringSessions: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery || state.activeUserId !== actualUserIdInitiating) {
      console.warn(`[AppStore] fetchMonitoringSessions: Context mismatch. Aborting fetch.`); set({ monitoringSessionsLoading: false }); return;
    }
    console.log(`[AppStore] fetchMonitoringSessions: For UPR Data: ${uprIdForDataQuery}, Period: ${periodForDataQuery}, by User: ${actualUserIdInitiating}`);
    set({ monitoringSessionsLoading: true });
    try {
      const sessions = await getMonitoringSessionsFromService(uprIdForDataQuery, periodForDataQuery);
      // Filter by the UPR whose data is being fetched, not necessarily the logged-in user if they are an auditor
      const sessionsForUpr = sessions.filter(s => s.uprId === uprIdForDataQuery && s.period === periodForDataQuery);
      set({ monitoringSessions: sessionsForUpr, monitoringSessionsLoading: false });
      console.log(`[AppStore] Monitoring sessions fetched for UPR Data ${uprIdForDataQuery}: ${sessionsForUpr.length}.`);
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchMonitoringSessions:", errorMessage);
        set({ monitoringSessions: [], monitoringSessionsLoading: false });
        throw new Error(`Gagal memuat sesi pemantauan dari store: ${errorMessage}`);
    }
  },
  addMonitoringSessionToState: async (sessionData) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menambah sesi pemantauan.");
    console.log(`[AppStore] addMonitoringSessionToState: Context UPR=${activeUprId}, Period=${activePeriod}, Logged-in User=${activeUserId}`);
    try {
      // actualUserId is the creator of the session
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
    const { activeUprId, activePeriod, activeUserId } = get(); // activeUserId is the logged-in user
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk memperbarui status sesi.");
    console.log(`[AppStore] updateMonitoringSessionStatusInState: Session ID ${sessionId} to ${status}. Context UPR=${activeUprId}, Period=${activePeriod}`);
    try {
      await updateMonitoringSessionStatusInService(sessionId, status); 
      const updatedSession = await getMonitoringSessionByIdFromService(sessionId, activeUprId, activePeriod); 
      if(updatedSession && updatedSession.uprId === activeUprId){ 
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
  deleteMonitoringSessionFromState: async (sessionId) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menghapus sesi.");
    console.log(`[AppStore] deleteMonitoringSessionFromState ID: ${sessionId} from Context UPR: ${activeUprId}, Period: ${activePeriod}`);
    try {
      await deleteMonitoringSessionFromService(sessionId, activeUprId, activePeriod); 
      set(state => ({
        monitoringSessions: state.monitoringSessions.filter(s => !(s.id === sessionId && s.uprId === activeUprId && s.period === activePeriod)),
        riskExposures: state.riskExposures.filter(re => !(re.monitoringSessionId === sessionId && re.uprId === activeUprId && re.period === activePeriod)), 
        monitoredControlMeasuresData: state.monitoredControlMeasuresData.filter(mcmd => !(mcmd.monitoringSessionId === sessionId && mcmd.uprId === activeUprId && mcmd.period === activePeriod)),
      }));
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in deleteMonitoringSessionFromState:", errorMessage);
        throw new Error(`Gagal menghapus sesi pemantauan dari store: ${errorMessage}`);
    }
  },
  getMonitoringSessionByIdFromState: (sessionId) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) return null;
    // Find based on activeUprId and activePeriod for the data context,
    // and activeUserId for the user who created/owns the session record.
    return get().monitoringSessions.find(s => s.id === sessionId && s.uprId === activeUprId && s.period === activePeriod && s.userId === activeUserId) || null;
  },

  // --- RiskExposures ---
  fetchRiskExposuresForSession: async (sessionId, uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery || state.activeUserId !== actualUserIdInitiating) {
      console.warn(`[AppStore] fetchRiskExposuresForSession: Context mismatch. Aborting fetch.`); set({ riskExposuresLoading: false }); return;
    }
    console.log(`[AppStore] fetchRiskExposuresForSession: Session: ${sessionId}, UPR Data: ${uprIdForDataQuery}, Period: ${periodForDataQuery}, by User: ${actualUserIdInitiating}`);
    set({ riskExposuresLoading: true });
    try {
      // Service gets exposures for the given session, belonging to the UPR data context
      const exposures = await getRiskExposuresBySessionFromService(sessionId, uprIdForDataQuery, periodForDataQuery);
      set(state => ({
        riskExposures: [
          ...state.riskExposures.filter(re => re.monitoringSessionId !== sessionId || re.uprId !== uprIdForDataQuery || re.period !== periodForDataQuery), 
          ...exposures.filter(re => re.uprId === uprIdForDataQuery && re.period === periodForDataQuery) 
        ],
        riskExposuresLoading: false,
      }));
      console.log(`[AppStore] Risk exposures fetched for session ${sessionId} (UPR Data ${uprIdForDataQuery}): ${exposures.length}`);
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AppStore] Error in fetchRiskExposuresForSession (Session: ${sessionId}, UPR Data: ${uprIdForDataQuery}):`, errorMessage);
        set({ riskExposuresLoading: false }); 
        throw new Error(`Gagal memuat data paparan risiko dari store: ${errorMessage}`);
    }
  },
  upsertRiskExposureInState: async (exposureData) => {
    const { activeUprId, activePeriod, activeUserId } = get(); // Logged-in user context
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menyimpan paparan risiko.");
    console.log(`[AppStore] upsertRiskExposureInState: RC: ${exposureData.riskCauseId}, Session: ${exposureData.monitoringSessionId}, Context UPR=${activeUprId}, User=${activeUserId}`);
    try {
      // The service will use activeUprId and activePeriod for the UPR data context
      const upsertedExposureFromService = await upsertRiskExposureToService(exposureData, activeUprId, activePeriod, activeUserId);
      set(state => {
        const index = state.riskExposures.findIndex(
          re => re.monitoringSessionId === upsertedExposureFromService.monitoringSessionId && 
                re.riskCauseId === upsertedExposureFromService.riskCauseId && 
                re.uprId === activeUprId && 
                re.period === activePeriod &&
                re.userId === activeUserId // Ensure we are updating the logged-in user's record for this UPR data
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
        console.error(`[AppStore] upsertRiskExposureInState (CauseID: ${exposureData.riskCauseId}, Context UPR: ${activeUprId}): Failed:`, errorMessage);
        throw new Error(`Gagal menyimpan paparan risiko di store: ${errorMessage}`);
    }
  },

  // --- MonitoredControlMeasuresData ---
  fetchMonitoredControlMeasuresForSession: async (sessionId, uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery || state.activeUserId !== actualUserIdInitiating) {
      console.warn(`[AppStore] fetchMonitoredControlMeasuresForSession: Context mismatch. Aborting fetch.`); set({ monitoredControlMeasuresLoading: false }); return;
    }
    console.log(`[AppStore] fetchMonitoredControlMeasuresForSession: Session: ${sessionId}, UPR Data: ${uprIdForDataQuery}, Period: ${periodForDataQuery}, by User: ${actualUserIdInitiating}`);
    set({ monitoredControlMeasuresLoading: true });
    try {
      const mcms = await getMonitoredControlMeasuresBySessionFromService(sessionId, uprIdForDataQuery, periodForDataQuery); 
      set(state => ({
        monitoredControlMeasuresData: [
          ...state.monitoredControlMeasuresData.filter(mcmd => mcmd.monitoringSessionId !== sessionId || mcmd.uprId !== uprIdForDataQuery || mcmd.period !== periodForDataQuery), 
          ...mcms.filter(mcmd => mcmd.uprId === uprIdForDataQuery && mcmd.period === periodForDataQuery) 
        ],
        monitoredControlMeasuresLoading: false,
      }));
      console.log(`[AppStore] Monitored CMs fetched for session ${sessionId} (UPR Data ${uprIdForDataQuery}): ${mcms.length}`);
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AppStore] Error in fetchMonitoredCMsForSession (Session: ${sessionId}, UPR Data: ${uprIdForDataQuery}):`, errorMessage);
        set({ monitoredControlMeasuresLoading: false });
        throw new Error(`Gagal memuat data pemantauan kontrol dari store: ${errorMessage}`);
    }
  },
  upsertMonitoredControlMeasureInState: async (mcmData) => {
    const { activeUprId, activePeriod, activeUserId } = get(); // Logged-in user context
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR/Periode/User) tidak aktif di store untuk menyimpan data pemantauan kontrol.");
    console.log(`[AppStore] upsertMonitoredControlMeasureInState: Control: ${mcmData.controlMeasureId}, Session: ${mcmData.monitoringSessionId}, Context UPR=${activeUprId}, User=${activeUserId}`);
    try {
      const upsertedMCMFromService = await upsertMonitoredControlMeasureToService(mcmData, activeUprId, activePeriod, activeUserId);
      set(state => {
        const index = state.monitoredControlMeasuresData.findIndex(
          m => m.monitoringSessionId === upsertedMCMFromService.monitoringSessionId && 
               m.controlMeasureId === upsertedMCMFromService.controlMeasureId && 
               m.riskCauseId === upsertedMCMFromService.riskCauseId && 
               m.uprId === activeUprId && m.period === activePeriod && m.userId === activeUserId
        );
        if (index !== -1) {
          const updatedMCMs = [...state.monitoredControlMeasuresData];
          updatedMCMs[index] = upsertedMCMFromService;
          return { monitoredControlMeasuresData: updatedMCMs };
        }
        return { monitoredControlMeasuresData: [...state.monitoredControlMeasuresData, upsertedMCMFromService] };
      });
      return upsertedMCMFromService;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AppStore] upsertMonitoredCMInState (ControlID: ${mcmData.controlMeasureId}, Context UPR: ${activeUprId}): Failed:`, errorMessage);
        throw new Error(`Gagal menyimpan data pemantauan kontrol di store: ${errorMessage}`);
    }
  },
}));

export const triggerGlobalDataFetchForStore = (uprId: string | null, period: string | null, actualUserId: string | null) => {
  const store = useAppStore.getState();
  if (uprId && period && actualUserId) {
    if (store.dataFetchedForUprPeriod !== `${uprId}|${period}` || store.activeUserId !== actualUserId) {
      console.log(`[triggerGlobalDataFetchForStore] Context different or not yet fetched. New: ${uprId}|${period} by User: ${actualUserId}. Triggering fetch.`);
      // Pass uprId as the UPR whose data we want, and actualUserId as the initiator
      store.triggerGlobalDataFetch(uprId, period, actualUserId); 
    } else {
      console.log(`[triggerGlobalDataFetchForStore] Data already fetched/fetching for context ${uprId}|${period} by User: ${actualUserId}. Skipping new fetch.`);
    }
  } else {
    console.warn("[triggerGlobalDataFetchForStore] Context is incomplete, resetting store data.");
    store.resetAllData(); 
  }
};
    

    