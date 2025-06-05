
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
  activeUserId: string | null; // UID pengguna yang login
  dataFetchedForUprPeriod: string | null; 

  goals: Goal[];
  goalsLoading: boolean;
  fetchGoals: (uprIdToFetch: string, periodToFetch: string, userIdInitiating: string) => Promise<void>;
  addGoalToStore: (goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'userId' | 'period' | 'uprId'>) => Promise<Goal | null>;
  updateGoalInStore: (goalId: string, updatedData: Partial<Omit<Goal, 'id' | 'userId' | 'period' | 'code' | 'createdAt' | 'uprId'>>) => Promise<Goal | null>;
  deleteGoalFromStore: (goalId: string) => Promise<void>;
  getGoalById: (goalId: string, uprIdToQuery: string, periodToQuery: string) => Promise<Goal | null>;

  potentialRisks: PotentialRisk[];
  potentialRisksLoading: boolean;
  fetchPotentialRisks: (uprIdToFetch: string, periodToFetch: string, userIdInitiating: string) => Promise<void>;
  addPotentialRiskToStore: (data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'sequenceNumber' | 'goalId' | 'uprId'>, goalId: string, sequenceNumber: number) => Promise<PotentialRisk | null>;
  updatePotentialRiskInStore: (potentialRiskId: string, updatedData: Partial<Omit<PotentialRisk, 'id' | 'userId' | 'period' | 'goalId' | 'identifiedAt' | 'sequenceNumber' | 'uprId'>>) => Promise<PotentialRisk | null>;
  deletePotentialRiskFromStore: (potentialRiskId: string) => Promise<void>;
  getPotentialRiskById: (potentialRiskId: string, uprIdToQuery: string, periodToQuery: string) => Promise<PotentialRisk | null>;

  riskCauses: RiskCause[];
  riskCausesLoading: boolean;
  fetchRiskCauses: (uprIdToFetch: string, periodToFetch: string, userIdInitiating: string) => Promise<void>;
  addRiskCauseToStore: (data: Omit<RiskCause, 'id' | 'createdAt' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'uprId'>, potentialRiskId: string, goalId: string, sequenceNumber: number) => Promise<RiskCause | null>;
  updateRiskCauseInStore: (riskCauseId: string, updatedData: Partial<Omit<RiskCause, 'id' | 'userId' | 'period' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'analysisUpdatedAt' | 'uprId'>>) => Promise<RiskCause | null>;
  deleteRiskCauseFromStore: (riskCauseId: string) => Promise<void>;
  getRiskCauseById: (riskCauseId: string, uprIdToQuery: string, periodToQuery: string) => Promise<RiskCause | null>;

  controlMeasures: ControlMeasure[];
  controlMeasuresLoading: boolean;
  fetchControlMeasures: (uprIdToFetch: string, periodToFetch: string, userIdInitiating: string, riskCauseId_optional?: string) => Promise<void>;
  addControlMeasureToStore: (data: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'controlType' | 'uprId'>, riskCauseId: string, potentialRiskId: string, goalId: string, controlType: ControlMeasureTypeKey) => Promise<ControlMeasure | null>;
  updateControlMeasureInStore: (controlMeasureId: string, updatedData: Partial<Omit<ControlMeasure, 'id' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'createdAt' | 'sequenceNumber' | 'updatedAt' | 'uprId'>>) => Promise<ControlMeasure | null>;
  deleteControlMeasureFromStore: (controlMeasureId: string) => Promise<void>;
  getControlMeasureById: (controlMeasureId: string, uprIdToQuery: string, periodToQuery: string) => Promise<ControlMeasure | null>;
  
  monitoringSessions: MonitoringSession[];
  monitoringSessionsLoading: boolean;
  fetchMonitoringSessions: (uprIdToFetch: string, periodToFetch: string, userIdInitiating: string) => Promise<void>;
  addMonitoringSessionToState: (sessionData: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'status' | 'uprId'>) => Promise<MonitoringSession | null>;
  updateMonitoringSessionStatusInState: (sessionId: string, status: MonitoringSessionStatus) => Promise<MonitoringSession | null>;
  deleteMonitoringSessionFromState: (sessionId: string) => Promise<void>;
  getMonitoringSessionByIdFromState: (sessionId: string, uprIdForContext: string, periodForContext: string) => MonitoringSession | null;

  riskExposures: RiskExposure[];
  riskExposuresLoading: boolean;
  fetchRiskExposuresForSession: (sessionId: string, uprIdToFetch: string, periodToFetch: string, userIdInitiating: string) => Promise<void>;
  upsertRiskExposureInState: (exposureData: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period' | 'uprId'>) => Promise<RiskExposure | null>;

  monitoredControlMeasuresData: MonitoredControlMeasureData[];
  monitoredControlMeasuresLoading: boolean;
  fetchMonitoredControlMeasuresForSession: (sessionId: string, uprIdToFetch: string, periodToFetch: string, userIdInitiating: string) => Promise<void>;
  upsertMonitoredControlMeasureInState: (mcmData: Omit<MonitoredControlMeasureData, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period'| 'uprId'>) => Promise<MonitoredControlMeasureData | null>;

  setAppContext: (uprId: string, period: string, actualUserId: string) => void; 
  triggerGlobalDataFetch: (uprIdToFetchFor: string, periodToFetchFor: string, actualUserIdInitiating: string) => Promise<void>;
  resetAllData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeUprId: null,
  activePeriod: null,
  activeUserId: null, // UID pengguna yang login
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
    const newContextIdentifier = `${uprIdToSet}|${periodToSet}`; // Konteks data adalah UPR dan Periode
    
    set({ activeUprId: uprIdToSet, activePeriod: periodToSet, activeUserId: actualUserId });

    if (oldContextIdentifier !== newContextIdentifier) {
      console.log(`[AppStore] setAppContext: Context changed or data not fetched for ${newContextIdentifier}. Triggering global data fetch.`);
      get().resetAllData(); 
      // Saat trigger global fetch, uprIdToFetchFor adalah UPR yg dipilih, actualUserIdInitiating adalah UID pengguna login
      get().triggerGlobalDataFetch(uprIdToSet, periodToSet, actualUserId);
    } else {
      console.log(`[AppStore] setAppContext: Context same and data already fetched for ${newContextIdentifier}. Not re-fetching.`);
    }
  },

  triggerGlobalDataFetch: async (uprIdToFetchFor, periodToFetchFor, actualUserIdInitiating) => {
    if (!uprIdToFetchFor || !periodToFetchFor || !actualUserIdInitiating) {
      console.warn("[AppStore] triggerGlobalDataFetch: Missing UPR ID, Period, or User ID initiating.");
      set({ dataFetchedForUprPeriod: null, goalsLoading: false, potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false });
      return;
    }
    
    const uniqueUprPeriodIdentifier = `${uprIdToFetchFor}|${periodToFetchFor}`;
    console.log(`[AppStore] triggerGlobalDataFetch for ${uniqueUprPeriodIdentifier}. Initiated by User: ${actualUserIdInitiating}. Store activeUprId: ${get().activeUprId}`);
    
    set({ 
      activeUprId: uprIdToFetchFor, // Tetap set activeUprId ke UPR yang datanya di-fetch
      activePeriod: periodToFetchFor,
      activeUserId: actualUserIdInitiating, // Set user yang login
      dataFetchedForUprPeriod: uniqueUprPeriodIdentifier, 
      goalsLoading: true, 
      potentialRisksLoading: true, 
      riskCausesLoading: true, 
      controlMeasuresLoading: true,
      monitoringSessionsLoading: true, 
    });
    try {
      // Fungsi fetch dipanggil dengan UPR dan Periode target, serta UID pengguna yang melakukan aksi
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

  // --- GOALS ---
  fetchGoals: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    // Validasi utama adalah apakah UPR dan Periode yang diminta sesuai dengan yang aktif di store
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchGoals: Context mismatch. Store: ${state.activeUprId}|${state.activePeriod}, Requested: ${uprIdForDataQuery}|${periodForDataQuery}. Aborting.`);
      set({ goalsLoading: false }); // Hentikan loading jika konteks tidak cocok
      return;
    }
    console.log(`[AppStore] Fetching goals for UPR: ${uprIdForDataQuery}, Period: ${periodForDataQuery}. Initiated by User: ${actualUserIdInitiating}`);
    set({ goalsLoading: true });
    try {
      // Service dipanggil HANYA dengan uprId dan period untuk query data
      const result = await getGoalsFromService(uprIdForDataQuery, periodForDataQuery);
      if (result.success && result.goals) {
        // Filter client-side untuk memastikan data sesuai konteks UPR dan Periode
        const filteredGoalsForContext = result.goals.filter(
          g => g.uprId === uprIdForDataQuery && g.period === periodForDataQuery
        );
        const sortedGoals = filteredGoalsForContext.sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }));
        set({ goals: sortedGoals, goalsLoading: false });
        console.log(`[AppStore] Goals fetched for ${uprIdForDataQuery}|${periodForDataQuery}: ${sortedGoals.length}. Triggering PR & MS fetch.`);
        // Panggil fetch berikutnya dengan konteks UPR & Periode yang sama, dan UID pengguna yg login
        await get().fetchPotentialRisks(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating);
        await get().fetchMonitoringSessions(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating);
      } else {
        console.warn(`[AppStore] fetchGoals: Failed or no goals for ${uprIdForDataQuery}|${periodForDataQuery}. Message: ${result.message}`);
        set({ goals: [], goalsLoading: false });
        // Hentikan loading untuk data dependen juga jika goals gagal
        set({ potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false });
      }
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchGoals:", errorMessage);
        set({ goals: [], goalsLoading: false, dataFetchedForUprPeriod: null }); // Reset dataFetched jika error
        set({ potentialRisksLoading: false, riskCausesLoading: false, controlMeasuresLoading: false, monitoringSessionsLoading: false, riskExposuresLoading: false, monitoredControlMeasuresLoading: false });
        throw new Error(`Gagal memuat daftar sasaran dari store: ${errorMessage}`);
    }
  },
  addGoalToStore: async (goalData) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || typeof activeUprId !== 'string' || activeUprId.trim() === "" ||
        !activePeriod || typeof activePeriod !== 'string' || activePeriod.trim() === "" ||
        !activeUserId || typeof activeUserId !== 'string' || activeUserId.trim() === "") {
      throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid atau tidak aktif di store untuk menambah sasaran.");
    }
    console.log(`[AppStore] Adding goal. Store Context: UPR ID=${activeUprId}, Period=${activePeriod}, Creator User ID=${activeUserId}`);
    try {
      // Service dipanggil dengan activeUprId (sebagai uprId dokumen), activePeriod, dan activeUserId (sebagai userId/pembuat dokumen)
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
    if (!activeUprId || !activePeriod || !activeUserId ) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak aktif di store untuk memperbarui sasaran.");
    console.log(`[AppStore] Updating goal ID: ${goalId}. Store Context: UPR ID=${activeUprId}, Period=${activePeriod}. Editor: ${activeUserId}`);
    try {
      const goalToUpdate = get().goals.find(g => g.id === goalId && g.uprId === activeUprId && g.period === activePeriod);
      if (!goalToUpdate) throw new Error("Sasaran tidak ditemukan di store untuk konteks saat ini.");
      
      await updateGoalInService(goalId, updatedData); // Service hanya perlu ID dan data
      const updatedGoal = { ...goalToUpdate, ...updatedData, userId: activeUserId, updatedAt: new Date().toISOString() }; // Update userId dan timestamp lokal
      set(state => ({
          goals: state.goals.map(g => g.id === goalId ? updatedGoal : g).sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }))
      }));
      // Jika nama atau deskripsi sasaran berubah, potensi risiko terkait mungkin tidak perlu di-fetch ulang kecuali ada logika dependen.
      // Untuk saat ini, kita tidak re-fetch PRs di sini.
      return updatedGoal;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in updateGoalInStore:", errorMessage);
        throw new Error(`Gagal memperbarui sasaran di store: ${errorMessage}`);
    }
  },
  deleteGoalFromStore: async (goalId) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak aktif di store untuk menghapus sasaran.");
    console.log(`[AppStore] Deleting goal ID: ${goalId} from UPR: ${activeUprId}, Period: ${activePeriod}. User: ${activeUserId}`);
    try {
      // Service dipanggil dengan uprId dan period untuk validasi konteks di backend jika perlu
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
    console.log(`[AppStore] getGoalById: Goal ${goalId} not in store for UPR ${uprIdToQuery}, Period ${periodToQuery}. Fetching from service.`);
    try {
      const goalFromService = await getGoalByIdFromService(goalId, uprIdToQuery, periodToQuery);
      if(goalFromService && goalFromService.uprId === uprIdToQuery && goalFromService.period === periodToQuery) {
          set(state => ({ goals: Array.from(new Set([...state.goals, goalFromService])).sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' })) }));
      }
      return goalFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getGoalById from service for ${goalId}:`, error);
        return null;
    }
  },

  // --- POTENTIAL RISKS ---
  fetchPotentialRisks: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchPotentialRisks: Context mismatch. Store: ${state.activeUprId}|${state.activePeriod}, Req: ${uprIdForDataQuery}|${periodForDataQuery}. Aborting.`);
      set({ potentialRisksLoading: false }); return;
    }
    console.log(`[AppStore] Fetching PRs for UPR: ${uprIdForDataQuery}, Period: ${periodForDataQuery}. By: ${actualUserIdInitiating}`);
    set({ potentialRisksLoading: true });
    try {
      const currentGoalsForContext = get().goals.filter(g => g.uprId === uprIdForDataQuery && g.period === periodForDataQuery);
      if (currentGoalsForContext.length === 0 && !get().goalsLoading) {
        console.log("[AppStore] No goals for current UPR/Period, skipping PR fetch for these goals.");
        set({ potentialRisks: [], potentialRisksLoading: false }); // Reset PRs if no goals
        await get().fetchRiskCauses(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating); // Proceed to fetch RCs (might be empty too)
        return;
      }
      let allPRs: PotentialRisk[] = [];
      for (const goal of currentGoalsForContext) {
          // Service hanya perlu goalId, uprId, dan period untuk query
          const prs = await getPotentialRisksByGoalIdFromService(goal.id, uprIdForDataQuery, periodForDataQuery);
          // Filter client-side untuk validasi konteks
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
    if (!activeUprId || typeof activeUprId !== 'string' || activeUprId.trim() === "" ||
        !activePeriod || typeof activePeriod !== 'string' || activePeriod.trim() === "" ||
        !activeUserId || typeof activeUserId !== 'string' || activeUserId.trim() === "") {
        console.error("[AppStore] addPotentialRiskToStore: Konteks tidak valid.", {activeUprId, activePeriod, activeUserId});
        throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menambah potensi risiko.");
    }
    console.log(`[AppStore] Adding PR to Goal: ${goalId}, UPR: ${activeUprId}. Creator User ID: ${activeUserId}`);
    try {
      // Service dipanggil dengan activeUprId (sebagai uprId dokumen), activePeriod, activeUserId (sebagai userId/pembuat), dan sequenceNumber
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
    console.log(`[AppStore] Updating PR ID: ${potentialRiskId} for UPR: ${activeUprId}. Editor User ID: ${activeUserId}`);
    try {
      const prToUpdate = get().potentialRisks.find(pr => pr.id === potentialRiskId && pr.uprId === activeUprId && pr.period === activePeriod);
      if (!prToUpdate) throw new Error("Potensi Risiko tidak ditemukan di store untuk konteks saat ini.");
      
      await updatePotentialRiskInService(potentialRiskId, updatedData); // Service hanya perlu ID dan data
      const updatedPR = { ...prToUpdate, ...updatedData, userId: activeUserId, updatedAt: new Date().toISOString() }; // Update userId (editor) dan timestamp lokal
      set(state => ({
        potentialRisks: state.potentialRisks.map(pr => pr.id === potentialRiskId ? updatedPR : pr).sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`))
      }));
      // Re-fetch RCs jika deskripsi PR atau kategori berubah, karena ini bisa mempengaruhi saran AI untuk penyebab
      if(updatedData.description || updatedData.category) {
        await get().fetchRiskCauses(activeUprId, activePeriod, activeUserId);
      }
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
      // Service dipanggil dengan uprId dan period untuk validasi konteks di backend
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
    console.log(`[AppStore] getPotentialRiskById: PR ${potentialRiskId} not in store for UPR ${uprIdToQuery}, Period ${periodToQuery}. Fetching from service.`);
    try {
      const prFromService = await getPotentialRiskByIdFromService(potentialRiskId, uprIdToQuery, periodToQuery);
      if(prFromService && prFromService.uprId === uprIdToQuery && prFromService.period === periodToQuery){
          set(state => ({ potentialRisks: Array.from(new Set([...state.potentialRisks, prFromService])).sort((a,b) => `${a.goalId}-${a.sequenceNumber}`.localeCompare(`${b.goalId}-${b.sequenceNumber}`)) }));
      }
      return prFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getPotentialRiskById from service for ${potentialRiskId}:`, error);
        return null;
    }
  },

  // --- RISK CAUSES ---
  fetchRiskCauses: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchRiskCauses: Context mismatch. Aborting.`);
      set({ riskCausesLoading: false }); return;
    }
    console.log(`[AppStore] Fetching RCs for UPR: ${uprIdForDataQuery}, Period: ${periodForDataQuery}. By: ${actualUserIdInitiating}`);
    set({ riskCausesLoading: true });
    try {
      const currentPRsForContext = get().potentialRisks.filter(pr => pr.uprId === uprIdForDataQuery && pr.period === periodForDataQuery);
      if (currentPRsForContext.length === 0 && !get().potentialRisksLoading) {
        console.log("[AppStore] No PRs for current UPR/Period, skipping RC fetch for these PRs.");
        set({ riskCauses: [], riskCausesLoading: false });
        await get().fetchControlMeasures(uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating);
        return;
      }
      let allRCs: RiskCause[] = [];
      for (const pr of currentPRsForContext) {
          const rcs = await getRiskCausesByPotentialRiskIdFromService(pr.id, uprIdForDataQuery, periodForDataQuery);
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

      await updateRiskCauseInService(riskCauseId, updatedData); // Service hanya perlu ID dan data
      const updatedRC = { ...rcToUpdate, ...updatedData, userId: activeUserId, analysisUpdatedAt: new Date().toISOString() }; // Update userId (editor) dan timestamp lokal
      set(state => ({
        riskCauses: state.riskCauses.map(rc => rc.id === riskCauseId ? updatedRC : rc).sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`))
      }));
      // Jika analisis (KRI, likelihood, impact) berubah, CM mungkin perlu di-re-evaluasi tapi tidak perlu re-fetch dari service
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
    console.log(`[AppStore] getRiskCauseById: RC ${riskCauseId} not in store for UPR ${uprIdToQuery}, Period ${periodToQuery}. Fetching from service.`);
    try {
      const rcFromService = await getRiskCauseByIdFromService(riskCauseId, uprIdToQuery, periodToQuery);
      if(rcFromService && rcFromService.uprId === uprIdToQuery && rcFromService.period === periodToQuery){
         set(state => ({ riskCauses: Array.from(new Set([...state.riskCauses, rcFromService])).sort((a,b) => `${a.potentialRiskId}-${a.sequenceNumber}`.localeCompare(`${b.potentialRiskId}-${b.sequenceNumber}`)) }));
      }
      return rcFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getRiskCauseById from service for ${riskCauseId}:`, error);
        return null;
    }
  },

  // --- CONTROL MEASURES ---
  fetchControlMeasures: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating, riskCauseId_optional?: string) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchControlMeasures: Context mismatch. Aborting.`);
      set({ controlMeasuresLoading: false }); return;
    }
    console.log(`[AppStore] Fetching CMs for UPR: ${uprIdForDataQuery}, Period: ${periodForDataQuery}, RC(opt): ${riskCauseId_optional}. By: ${actualUserIdInitiating}`);
    set({ controlMeasuresLoading: true });
    try {
      let allCMs: ControlMeasure[] = [];
      if (riskCauseId_optional) { 
        allCMs = await fetchControlMeasuresByRiskCauseIdFromService(riskCauseId_optional, uprIdForDataQuery, periodForDataQuery);
        set(current => ({
          controlMeasures: [ 
            ...current.controlMeasures.filter(cm => cm.riskCauseId !== riskCauseId_optional || cm.uprId !== uprIdForDataQuery || cm.period !== periodForDataQuery),
            ...allCMs.filter(cm => cm.uprId === uprIdForDataQuery && cm.period === periodForDataQuery) // Filter lagi untuk safety
          ].sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`)),
        }));
      } else { 
        const currentRCsForContext = get().riskCauses.filter(rc => rc.uprId === uprIdForDataQuery && rc.period === periodForDataQuery);
        if (currentRCsForContext.length === 0 && !get().riskCausesLoading) {
          console.log("[AppStore] No RCs for current UPR/Period, skipping CM fetch for all RCs.");
          set({ controlMeasures: [] });
        } else {
          for (const rc of currentRCsForContext) {
              const cms = await fetchControlMeasuresByRiskCauseIdFromService(rc.id, uprIdForDataQuery, periodForDataQuery);
              allCMs.push(...cms.filter(cm => cm.uprId === uprIdForDataQuery && cm.period === periodForDataQuery));
          }
          const sortedCMs = allCMs.sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`));
          set({ controlMeasures: sortedCMs });
        }
      }
      set({ controlMeasuresLoading: false });
      console.log(`[AppStore] CMs fetched for ${uprIdForDataQuery}|${periodForDataQuery}${riskCauseId_optional ? `|RC:${riskCauseId_optional}` : ''}: ${allCMs.length}. Global data fetch for main entities should be complete.`);
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

      await updateControlMeasureInService(controlMeasureId, updatedData); // Service hanya perlu ID dan data
      const updatedCM = { ...cmToUpdate, ...updatedData, userId: activeUserId, updatedAt: new Date().toISOString() }; // Update userId (editor) dan timestamp lokal
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
      await deleteControlMeasureFromService(controlMeasureId); // Service hanya perlu ID
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
    console.log(`[AppStore] getControlMeasureById: CM ${controlMeasureId} not in store for UPR ${uprIdToQuery}, Period ${periodToQuery}. Fetching from service.`);
    try {
      const cmFromService = await getControlMeasureByIdFromService(controlMeasureId, uprIdToQuery, periodToQuery);
      if(cmFromService && cmFromService.uprId === uprIdToQuery && cmFromService.period === periodToQuery) {
        set(state => ({ controlMeasures: Array.from(new Set([...state.controlMeasures, cmFromService])).sort((a, b) => `${a.riskCauseId}-${a.controlType}-${a.sequenceNumber}`.localeCompare(`${b.riskCauseId}-${b.controlType}-${b.sequenceNumber}`)) }));
      }
      return cmFromService || null;
    } catch (error) { 
        console.error(`[AppStore] Error in getControlMeasureById from service for ${controlMeasureId}:`, error);
        return null;
    }
  },
  
  // --- MONITORING SESSIONS & RELATED ---
  fetchMonitoringSessions: async (uprIdForDataQuery, periodForDataQuery, actualUserIdInitiating) => {
    const state = get();
    if (state.activeUprId !== uprIdForDataQuery || state.activePeriod !== periodForDataQuery) {
      console.warn(`[AppStore] fetchMonitoringSessions: Context mismatch. Aborting.`);
      set({ monitoringSessionsLoading: false }); return;
    }
    console.log(`[AppStore] Fetching MSs for UPR: ${uprIdForDataQuery}, Period: ${periodForDataQuery}. By: ${actualUserIdInitiating}`);
    set({ monitoringSessionsLoading: true });
    try {
      // Service dipanggil dengan UPR ID dan Periode. actualUserIdInitiating tidak untuk query utama di sini.
      const sessions = await getMonitoringSessionsFromService(uprIdForDataQuery, periodForDataQuery);
      // Filter client-side untuk validasi konteks
      set({ 
          monitoringSessions: sessions.filter(s => s.uprId === uprIdForDataQuery && s.period === periodForDataQuery).sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()), 
          monitoringSessionsLoading: false 
      });
      console.log(`[AppStore] MSs fetched for ${uprIdForDataQuery}|${periodForDataQuery}: ${sessions.length}.`);
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[AppStore] Error in fetchMonitoringSessions:", errorMessage);
        set({ monitoringSessions: [], monitoringSessionsLoading: false }); // Jangan reset dataFetchedForUprPeriod di sini
        throw new Error(`Gagal memuat sesi pemantauan dari store: ${errorMessage}`);
    }
  },
  addMonitoringSessionToState: async (sessionData) => {
    const { activeUprId, activePeriod, activeUserId } = get();
    if (!activeUprId || !activePeriod || !activeUserId) throw new Error("Konteks (UPR ID, Periode, atau User ID) tidak valid untuk menambah sesi pemantauan.");
    console.log(`[AppStore] Adding MS. UPR: ${activeUprId}. Creator: ${activeUserId}`);
    try {
      // Service dipanggil dengan activeUprId (sebagai uprId dokumen), activePeriod, dan activeUserId (sebagai userId/pembuat)
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
      if(updatedSession && updatedSession.uprId === activeUprId && updatedSession.period === activePeriod){ // Validasi konteks lagi
        set(state => ({
          monitoringSessions: state.monitoringSessions.map(s => s.id === sessionId ? { ...updatedSession, userId: activeUserId } : s).sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()) // Update userId lokal jika perlu
        }));
        return updatedSession;
      }
      console.warn(`[AppStore] updateMonitoringSessionStatusInState: Session ${sessionId} not found or context mismatch after update.`);
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
      // Service dipanggil dengan uprId dan period untuk validasi konteks di backend
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
      set({ riskExposuresLoading: false }); return;
    }
    console.log(`[AppStore] Fetching REs for Session: ${sessionId}, UPR: ${uprIdForDataQuery}. By: ${actualUserIdInitiating}`);
    set({ riskExposuresLoading: true });
    try {
      // Service dipanggil dengan UPR ID dan Periode sesi
      const exposures = await getRiskExposuresBySessionFromService(sessionId, uprIdForDataQuery, periodForDataQuery);
      set(state => ({
        riskExposures: [ // Hapus yang lama untuk sesi ini, lalu tambahkan yang baru
          ...state.riskExposures.filter(re => re.monitoringSessionId !== sessionId || re.uprId !== uprIdForDataQuery || re.period !== periodForDataQuery),
          ...exposures.filter(re => re.uprId === uprIdForDataQuery && re.period === periodForDataQuery) // Validasi konteks
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
    console.log(`[AppStore] Upserting RE for RC: ${exposureData.riskCauseId}, Session: ${exposureData.monitoringSessionId}, UPR: ${activeUprId}. Creator/Editor: ${activeUserId}`);
    try {
      // Service dipanggil dengan activeUprId, activePeriod, dan activeUserId (sebagai userId/pembuat/pengedit)
      const upsertedExposure = await upsertRiskExposureToService(exposureData, activeUprId, activePeriod, activeUserId);
      set(state => {
        const index = state.riskExposures.findIndex(
          re => re.monitoringSessionId === upsertedExposure.monitoringSessionId && 
                re.riskCauseId === upsertedExposure.riskCauseId && 
                re.uprId === activeUprId && // Pastikan konteks UPR juga
                re.period === activePeriod    // Pastikan konteks Periode juga
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
      set({ monitoredControlMeasuresLoading: false }); return;
    }
    console.log(`[AppStore] Fetching Monitored CMs for Session: ${sessionId}, UPR: ${uprIdForDataQuery}. By: ${actualUserIdInitiating}`);
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
    console.log(`[AppStore] Upserting Monitored CM data for Control: ${mcmData.controlMeasureId}, UPR: ${activeUprId}. Creator/Editor: ${activeUserId}`);
    try {
      const upsertedMCM = await upsertMonitoredControlMeasureToService(mcmData, activeUprId, activePeriod, activeUserId);
      set(state => {
        const index = state.monitoredControlMeasuresData.findIndex(
          m => m.monitoringSessionId === upsertedMCM.monitoringSessionId && 
               m.controlMeasureId === upsertedMCM.controlMeasureId && 
               m.riskCauseId === upsertedMCM.riskCauseId && 
               m.uprId === activeUprId && 
               m.period === activePeriod
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
  if (uprId && typeof uprId === 'string' && uprId.trim() !== "" && 
      period && typeof period === 'string' && period.trim() !== "" &&
      actualUserId && typeof actualUserId === 'string' && actualUserId.trim() !== "") {
    store.setAppContext(uprId, period, actualUserId); 
  } else {
    console.warn("[triggerGlobalDataFetchForStore] Context is incomplete or invalid (uprId, period, or actualUserId missing/empty). Resetting store.", {uprId, period, actualUserId});
    store.resetAllData(); 
  }
};

    
