
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PotentialRisk, Goal, RiskCause, LikelihoodLevelDesc, ImpactLevelDesc, RiskCategory, ControlMeasure, ControlMeasureTypeKey, AppUser } from '@/lib/types';
import { LIKELIHOOD_LEVELS_DESC, IMPACT_LEVELS_DESC, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, CONTROL_MEASURE_TYPE_KEYS, getControlTypeName, CalculatedRiskLevelCategory } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Info, BarChartHorizontalBig, Wand2, PlusCircle, Trash2, Edit, Settings2, BarChart3 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // CORRECTED IMPORT PATH
import { LikelihoodCriteriaModal } from '@/components/risks/likelihood-criteria-modal';
import { ImpactCriteriaModal } from '@/components/risks/impact-criteria-modal';
import { RiskMatrixModal } from '@/components/risks/risk-matrix-modal';
import { Badge } from "@/components/ui/badge";
import { suggestRiskParametersAction, suggestKriToleranceAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { KriToleranceAISuggestionsModal } from '@/components/risks/kri-tolerance-ai-suggestions-modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth-context';
import { getGoalById as getGoalByIdFromService } from '@/services/goalService';
import { getPotentialRiskById as getPotentialRiskByIdFromService } from '@/services/potentialRiskService';
import { getRiskCauseById as getRiskCauseByIdFromService, updateRiskCause as updateRiskCauseInService } from '@/services/riskCauseService';
import { 
  addControlMeasure as addControlMeasureToService, 
  getControlMeasuresByRiskCauseId as fetchControlMeasuresByRiskCauseIdFromService, 
  deleteControlMeasure as deleteControlMeasureFromService, 
  updateControlMeasure as updateControlMeasureInService 
} from '@/services/controlMeasureService';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '@/stores/useAppStore';


// Helper functions (getCalculatedRiskLevel, getRiskLevelColor, getControlGuidance)
// Matriks Skor Heatmap berdasarkan gambar Anda
// Baris: Kemungkinan (1-5 dari bawah ke atas), Kolom: Dampak (1-5 dari kiri ke kanan)
export const RISK_SCORE_HEATMAP: { [key: number]: { [key: number]: number } } = {
  1: { 1: 1,  2: 3,  3: 5,  4: 8,  5: 20  }, // Hampir tidak terjadi (1)
  2: { 1: 2,  2: 7,  3: 11, 4: 13, 5: 21  }, // Jarang terjadi (2)
  3: { 1: 4,  2: 10, 3: 14, 4: 17, 5: 22  }, // Kadang Terjadi (3)
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24  }, // Sering terjadi (4)
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25  }  // Hampir pasti terjadi (5)
};

export const getCalculatedRiskLevel = (likelihood: LikelihoodLevelDesc | null, impact: ImpactLevelDesc | null): { level: CalculatedRiskLevelCategory | 'N/A'; score: number | null } => {
  if (!likelihood || !impact) return { level: 'N/A', score: null };
  
  const likelihoodValue = LIKELIHOOD_LEVELS_DESC_MAP[likelihood];
  const impactValue = IMPACT_LEVELS_DESC_MAP[impact];

  if (likelihoodValue === undefined || impactValue === undefined) {
    console.warn(`[getCalculatedRiskLevel] Invalid likelihood or impact description: L=${likelihood}, I=${impact}`);
    return { level: 'N/A', score: null };
  }
  
  const score = RISK_SCORE_HEATMAP[likelihoodValue]?.[impactValue] ?? null;

  if (score === null) {
    console.warn(`[getCalculatedRiskLevel] Score not found in heatmap for Likelihood: ${likelihood} (val: ${likelihoodValue}), Impact: ${impact} (val: ${impactValue})`);
    return { level: 'N/A', score }; 
  }

  let level: CalculatedRiskLevelCategory;
  if (score >= 20 && score <= 25) level = 'Sangat Tinggi';
  else if (score >= 16 && score <= 19) level = 'Tinggi';   
  else if (score >= 12 && score <= 15) level = 'Sedang';   
  else if (score >= 6 && score <= 11) level = 'Rendah';    
  else if (score >= 1 && score <= 5) level = 'Sangat Rendah';
  else {
    console.warn(`[getCalculatedRiskLevel] Score ${score} is out of defined risk level ranges.`);
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


const riskCauseAnalysisSchema = z.object({
  keyRiskIndicator: z.string().nullable().optional(),
  riskTolerance: z.string().nullable().optional(),
  likelihood: z.custom<LikelihoodLevelDesc>((val): val is LikelihoodLevelDesc => LIKELIHOOD_LEVELS_DESC.includes(val as LikelihoodLevelDesc)).nullable(),
  impact: z.custom<ImpactLevelDesc>((val): val is ImpactLevelDesc => IMPACT_LEVELS_DESC.includes(val as ImpactLevelDesc)).nullable(),
});
type RiskCauseAnalysisFormData = z.infer<typeof riskCauseAnalysisSchema>;


export default function RiskCauseAnalysisPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const riskCauseId = params.riskCauseId as string;
  
  const { currentUser, appUser, loading: authLoading, profileLoading, isProfileComplete } = useAuth();
  
  // Select states from Zustand store individually
  const allControlMeasuresFromStore = useAppStore(state => state.controlMeasures);
  const controlMeasuresLoadingFromStore = useAppStore(state => state.controlMeasuresLoading);
  const store = useAppStore(); // For calling actions

  const [localDataLoading, setLocalDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentRiskCause, setCurrentRiskCause] = useState<RiskCause | null>(null);
  const [parentPotentialRisk, setParentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [grandParentGoal, setGrandParentGoal] = useState<Goal | null>(null);
  const [controls, setControls] = useState<ControlMeasure[]>([]); // Local state for filtered controls

  const [isLikelihoodCriteriaModalOpen, setIsLikelihoodCriteriaModalOpen] = useState(false);
  const [isImpactCriteriaModalOpen, setIsImpactCriteriaModalOpen] = useState(false);
  const [isRiskMatrixModalOpen, setIsRiskMatrixModalOpen] = useState(false);

  const [aiLikelihoodImpactSuggestion, setAiLikelihoodImpactSuggestion] = useState<{
    likelihood: LikelihoodLevelDesc | null;
    likelihoodJustification: string;
    impact: ImpactLevelDesc | null;
    impactJustification: string;
  } | null>(null);
  const [isAILikelihoodImpactLoading, setIsAILikelihoodImpactLoading] = useState(false);

  const [isKriToleranceSuggestionsModalOpen, setIsKriToleranceSuggestionsModalOpen] = useState(false);
  const [aiKriToleranceSuggestions, setAiKriToleranceSuggestions] = useState<{
    suggestedKRI: string;
    kriJustification: string;
    suggestedTolerance: string;
    toleranceJustification: string;
  } | null>(null); 
  const [isAIKriToleranceLoading, setIsAIKriToleranceLoading] = useState(false);

  const [isDeleteControlAlertOpen, setIsDeleteControlAlertOpen] = useState(false);
  const [controlToDelete, setControlToDelete] = useState<ControlMeasure | null>(null);
  
  const { toast } = useToast();

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);
  const riskAppetiteFromUser = useMemo(() => appUser?.riskAppetite ?? 5, [appUser]); 
  const uprDisplayName = useMemo(() => appUser?.displayName || "UPR Pengguna", [appUser]);

  const riskCauseIdQuery = searchParams.get('riskCauseId'); 
  const returnPathForButton = useMemo(() => {
    const fromQuery = searchParams.get('from');
    if (fromQuery) return fromQuery;
    if (parentPotentialRisk?.id) return `/all-risks/manage/${parentPotentialRisk.id}`;
    if (riskCauseIdQuery) return `/risk-analysis`; // Fallback to risk analysis list if specific cause ID was in query
    return '/risk-analysis';
  }, [searchParams, parentPotentialRisk?.id, riskCauseIdQuery]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue, 
    getValues,
    formState: { errors },
  } = useForm<RiskCauseAnalysisFormData>({
    resolver: zodResolver(riskCauseAnalysisSchema),
    defaultValues: {
        keyRiskIndicator: null,
        riskTolerance: null,
        likelihood: null,
        impact: null,
    }
  });

  const watchedLikelihood = watch("likelihood");
  const watchedImpact = watch("impact");
  
  const { level: calculatedRiskLevelText, score: calculatedRiskScore } = getCalculatedRiskLevel(watchedLikelihood, watchedImpact);
  
  useEffect(() => {
    let isActive = true;
    async function loadPageData() {
      console.log(`[RiskCauseAnalysisPage] Effect for main data fetch TRIGGERED. RC_ID: ${riskCauseId}, UserID: ${currentUserId}, Period: ${currentPeriod}, ProfileComplete: ${isProfileComplete}, AuthLoading: ${authLoading}, ProfileLoading: ${profileLoading}`);
      
      if (!isActive || authLoading || profileLoading || !isProfileComplete || !currentUserId || !currentPeriod || !riskCauseId) {
        if (isActive && !authLoading && !profileLoading && (!isProfileComplete || !currentUserId || !currentPeriod)) {
            console.log("[RiskCauseAnalysisPage] Prerequisites (auth/profile/context) not met, setting localDataLoading to false.");
            setLocalDataLoading(false);
        } else if (isActive) {
            console.log("[RiskCauseAnalysisPage] Still loading auth/profile or missing IDs, localDataLoading remains true or not set.");
        }
        return;
      }
      
      console.log(`[RiskCauseAnalysisPage] loadPageData: Fetching data for RC_ID: ${riskCauseId}, User: ${currentUserId}, Period: ${currentPeriod}`);
      setLocalDataLoading(true);
      setCurrentRiskCause(null);
      setParentPotentialRisk(null);
      setGrandParentGoal(null);
      // Controls will be filtered from store, no need to reset 'controls' state here if using selector pattern
      setAiLikelihoodImpactSuggestion(null);
      setAiKriToleranceSuggestions(null);
      reset({ keyRiskIndicator: null, riskTolerance: null, likelihood: null, impact: null });
      
      try {
        console.log("[RiskCauseAnalysisPage] loadPageData: Attempting to get RiskCause...");
        const foundCause = await store.getRiskCauseById(riskCauseId, currentUserId, currentPeriod);
        if (!isActive) return;
        if (!foundCause) {
          console.error(`[RiskCauseAnalysisPage] loadPageData: RiskCause with ID ${riskCauseId} not found or context mismatch.`);
          throw new Error(`Penyebab Risiko (ID: ${riskCauseId}) tidak ditemukan atau tidak cocok konteks.`);
        }
        console.log("[RiskCauseAnalysisPage] loadPageData: Fetched RiskCause:", JSON.stringify(foundCause).substring(0,100) + "...");
        setCurrentRiskCause(foundCause);

        console.log("[RiskCauseAnalysisPage] loadPageData: Attempting to get PotentialRisk for PR_ID:", foundCause.potentialRiskId);
        const foundPotentialRisk = await store.getPotentialRiskById(foundCause.potentialRiskId, currentUserId, currentPeriod);
        if (!isActive) return;
        if (!foundPotentialRisk) {
          console.error(`[RiskCauseAnalysisPage] loadPageData: PotentialRisk with ID ${foundCause.potentialRiskId} not found or context mismatch.`);
          throw new Error(`Potensi risiko induk (ID: ${foundCause.potentialRiskId}) tidak ditemukan atau tidak cocok konteks.`);
        }
        console.log("[RiskCauseAnalysisPage] loadPageData: Fetched PotentialRisk:", JSON.stringify(foundPotentialRisk).substring(0,100) + "...");
        setParentPotentialRisk(foundPotentialRisk);

        console.log("[RiskCauseAnalysisPage] loadPageData: Attempting to get Goal for Goal_ID:", foundPotentialRisk.goalId);
        const foundGoal = await store.getGoalById(foundPotentialRisk.goalId, currentUserId, currentPeriod);
        if (!isActive) return;
        if (!foundGoal) {
          console.error(`[RiskCauseAnalysisPage] loadPageData: Goal with ID ${foundPotentialRisk.goalId} not found or context mismatch.`);
          throw new Error(`Sasaran induk (ID: ${foundPotentialRisk.goalId}) tidak ditemukan atau tidak cocok konteks.`);
        }
        console.log("[RiskCauseAnalysisPage] loadPageData: Fetched Goal:", JSON.stringify(foundGoal).substring(0,100) + "...");
        setGrandParentGoal(foundGoal);
        
        console.log("[RiskCauseAnalysisPage] loadPageData: MAIN DATA LOADED SUCCESSFULLY. Now fetching control measures for RC_ID:", foundCause.id);
        await store.fetchControlMeasures(currentUserId, currentPeriod, foundCause.id);
        console.log("[RiskCauseAnalysisPage] loadPageData: Control measures fetch triggered.");

      } catch (error: any) {
        if (!isActive) return;
        const errorMessage = error.message || String(error);
        console.error("[RiskCauseAnalysisPage] Error in loadPageData:", errorMessage);
        if (isActive) {
          toast({ title: "Kesalahan Memuat Data", description: errorMessage, variant: "destructive" });
          router.push(returnPathForButton); 
        }
      } finally {
        if (isActive) {
          setLocalDataLoading(false);
          console.log("[RiskCauseAnalysisPage] loadPageData: FINISHED, localDataLoading set to false.");
        }
      }
    }
    
    if (currentUserId && currentPeriod && riskCauseId && isProfileComplete && !authLoading && !profileLoading) {
      console.log("[RiskCauseAnalysisPage] Conditions met, calling loadPageData.");
      loadPageData();
    } else {
      console.log("[RiskCauseAnalysisPage] Conditions NOT met for loadPageData. AuthL:", authLoading, "ProfL:", profileLoading, "ProfComp:", isProfileComplete, "UID:", !!currentUserId, "Period:", !!currentPeriod, "RCID:", !!riskCauseId);
      if (!authLoading && !profileLoading) { // If auth process is complete but context still missing
        setLocalDataLoading(false); // Ensure loading stops if prerequisites will never be met
      }
    }

    return () => { 
      isActive = false; 
      console.log("[RiskCauseAnalysisPage] useEffect for main data fetch: CLEANUP. isActive set to false.");
    };
  }, [
    riskCauseId, 
    currentUserId, 
    currentPeriod, 
    isProfileComplete, 
    authLoading, 
    profileLoading, 
    store, // store is stable
    reset, // reset is stable
    router, // router is stable
    toast, // toast is stable
    searchParams, // searchParams is stable
    returnPathForButton // from useMemo, should be stable unless its own deps change
  ]);

  useEffect(() => {
    const filtered = allControlMeasuresFromStore.filter(cm => 
      cm.riskCauseId === riskCauseId && 
      cm.userId === currentUserId && 
      cm.period === currentPeriod
    );
    setControls(filtered.sort((a, b) => {
      const typeOrder = CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType);
      if (typeOrder !== 0) return typeOrder;
      return (a.sequenceNumber || 0) - (b.sequenceNumber || 0);
    }));
  }, [allControlMeasuresFromStore, riskCauseId, currentUserId, currentPeriod]);


  useEffect(() => {
    if (currentRiskCause) {
      console.log("[RiskCauseAnalysisPage] currentRiskCause changed, resetting form with:", JSON.stringify(currentRiskCause).substring(0,100) + "...");
      const formValues = {
        keyRiskIndicator: currentRiskCause.keyRiskIndicator || "",
        riskTolerance: currentRiskCause.riskTolerance || "",
        likelihood: currentRiskCause.likelihood,
        impact: currentRiskCause.impact,
      };
      reset(formValues);
      setAiLikelihoodImpactSuggestion(null); 
      setAiKriToleranceSuggestions(null);
    } else {
       console.log("[RiskCauseAnalysisPage] currentRiskCause is null, resetting form to defaults.");
       reset({ keyRiskIndicator: null, riskTolerance: null, likelihood: null, impact: null });
    }
  }, [currentRiskCause, reset]);


  const onSubmitAnalysis: SubmitHandler<RiskCauseAnalysisFormData> = async (data) => {
    if (!currentRiskCause || !currentUserId || !currentPeriod) {
      toast({ title: "Kesalahan", description: "Konteks data tidak lengkap untuk menyimpan analisis penyebab.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const updatedRiskCauseData: Partial<Omit<RiskCause, 'id' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber' | 'analysisUpdatedAt'>> = {
      keyRiskIndicator: data.keyRiskIndicator || null,
      riskTolerance: data.riskTolerance || null,
      likelihood: data.likelihood,
      impact: data.impact,
    };
    
    try {
      const updatedCauseFromStore = await store.updateRiskCause(currentRiskCause.id, updatedRiskCauseData, currentUserId, currentPeriod);
      if (updatedCauseFromStore) {
        setCurrentRiskCause(updatedCauseFromStore); 
      }
      toast({ title: "Sukses", description: `Analisis untuk penyebab risiko ${riskCauseCodeDisplay} telah disimpan.` });
    } catch (error:any) {
      const errorMessage = (error instanceof Error && error.message) ? error.message : String(error);
      console.error("[RiskCauseAnalysisPage] Error saving risk cause analysis:", errorMessage);
      toast({ title: "Gagal Menyimpan", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetAILikelihoodImpactSuggestion = async () => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser) {
        toast({ title: "Konteks Tidak Lengkap", description: "Data induk tidak tersedia untuk saran AI.", variant: "warning" });
        return;
    }
    setIsAILikelihoodImpactLoading(true);
    setAiLikelihoodImpactSuggestion(null);
    try {
      const result = await suggestRiskParametersAction({
        potentialRiskDescription: parentPotentialRisk.description,
        riskCategory: parentPotentialRisk.category,
        goalDescription: grandParentGoal.description,
        riskCauseDescription: currentRiskCause.description,
      });

      if (result.success && result.data) {
        const currentFormValues = getValues();
        const newAiSuggestionData = {
          likelihood: result.data.suggestedLikelihood,
          likelihoodJustification: result.data.likelihoodJustification,
          impact: result.data.suggestedImpact,
          impactJustification: result.data.impactJustification,
        };
        setAiLikelihoodImpactSuggestion(newAiSuggestionData);

        if (result.data.suggestedLikelihood && result.data.suggestedLikelihood !== currentFormValues.likelihood) {
          setValue('likelihood', result.data.suggestedLikelihood, {shouldValidate: true});
        }
        if (result.data.suggestedImpact && result.data.suggestedImpact !== currentFormValues.impact) {
          setValue('impact', result.data.suggestedImpact, {shouldValidate: true});
        }
      } else {
        const errorMsg = result.error || "Gagal mendapatkan saran dari AI.";
        toast({ title: "Kesalahan Saran AI (L/I)", description: errorMsg, variant: "destructive" });
      }
    } catch (error: any) {
      const errorMessage = (error instanceof Error && error.message) ? error.message : String(error);
      toast({ title: "Kesalahan AI", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAILikelihoodImpactLoading(false);
    }
  };

  const handleGetAIKriToleranceSuggestion = async () => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser) {
      toast({ title: "Konteks Tidak Lengkap", description: "Data induk tidak tersedia untuk saran KRI/Toleransi AI.", variant: "warning" });
      return;
    }
    setIsAIKriToleranceLoading(true);
    setAiKriToleranceSuggestions(null);
    try {
      const result = await suggestKriToleranceAction({
        riskCauseDescription: currentRiskCause.description,
        potentialRiskDescription: parentPotentialRisk.description,
        riskCategory: parentPotentialRisk.category,
        goalDescription: grandParentGoal.description,
      });
      if (result.success && result.data) {
        setAiKriToleranceSuggestions(result.data);
        setIsKriToleranceSuggestionsModalOpen(true);
      } else {
         const errorMsg = result.error || "Gagal mendapatkan saran KRI/Toleransi dari AI.";
        toast({ title: "Kesalahan Saran AI (KRI/Toleransi)", description: errorMsg, variant: "destructive" });
      }
    } catch (error: any)
     {
      const errorMessage = (error instanceof Error && error.message) ? error.message : String(error);
      toast({ title: "Kesalahan AI", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAIKriToleranceLoading(false);
    }
  };

  const handleApplyKRI = (kri: string) => setValue('keyRiskIndicator', kri, { shouldValidate: true });
  const handleApplyTolerance = (tolerance: string) => setValue('riskTolerance', tolerance, { shouldValidate: true });
  const handleApplyBothKriTolerance = (kri: string, tolerance: string) => {
    setValue('keyRiskIndicator', kri, { shouldValidate: true });
    setValue('riskTolerance', tolerance, { shouldValidate: true });
  };
  
  const handleSaveControlMeasure = async (
    formData: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber'>,
    existingControlId?: string
  ): Promise<ControlMeasure | null> => {
    if (!currentUserId || !currentPeriod || !currentRiskCause || !parentPotentialRisk || !grandParentGoal) {
      toast({ title: "Konteks Tidak Lengkap", description: "Tidak dapat menyimpan tindakan pengendalian. Data induk atau konteks pengguna hilang.", variant: "destructive" });
      return null;
    }
    
    const controlDataForService = {
      ...formData, 
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
    };

    try {
      let savedControl: ControlMeasure | null = null;
      if (existingControlId) { // Mode Edit
        const updatedControl = await store.updateControlMeasure(existingControlId, controlDataForService);
        savedControl = updatedControl;
        toast({ title: "Sukses", description: "Tindakan pengendalian berhasil diperbarui." });
      } else { // Mode Tambah Baru
        savedControl = await store.addControlMeasure(
          controlDataForService,
          currentRiskCause.id,
          parentPotentialRisk.id,
          grandParentGoal.id,
          currentUserId,
          currentPeriod
        );
        toast({ title: "Sukses", description: "Tindakan pengendalian baru berhasil ditambahkan." });
      }
      return savedControl;
    } catch (error: any) {
      const errorMessage = (error instanceof Error && error.message) ? error.message : String(error);
      console.error("[RiskCauseAnalysisPage] Error saving control measure:", errorMessage);
      toast({ title: "Gagal Menyimpan Pengendalian", description: errorMessage, variant: "destructive" });
      return null;
    }
  };
  
  const confirmDeleteControlMeasure = async () => {
    if (!controlToDelete || !controlToDelete.id || !currentUserId || !currentPeriod || !currentRiskCause) {
        toast({ title: "Gagal Menghapus", description: "Data tidak lengkap untuk menghapus pengendalian.", variant: "destructive"});
        setIsDeleteControlAlertOpen(false);
        setControlToDelete(null);
        return;
    }
    try {
      await store.deleteControlMeasure(controlToDelete.id); 
      toast({ title: "Pengendalian Dihapus", description: `Pengendalian "${controlToDelete.description}" telah dihapus.`, variant: "destructive" });
    } catch (error: any) {
        const errorMessage = (error instanceof Error && error.message) ? error.message : String(error);
        console.error("[RiskCauseAnalysisPage] Error deleting control measure:", errorMessage);
        toast({ title: "Gagal Menghapus Pengendalian", description: errorMessage, variant: "destructive" });
    } finally {
        setIsDeleteControlAlertOpen(false);
        setControlToDelete(null);
    }
  };

  const pageIsActuallyLoading = authLoading || profileLoading || localDataLoading || controlMeasuresLoadingFromStore;

  const goalCodeForDisplay = useMemo(() => `${grandParentGoal?.code || 'S?'}`, [grandParentGoal]);
  const potentialRiskCodeForDisplay = useMemo(() => `${goalCodeForDisplay}.PR${parentPotentialRisk?.sequenceNumber || '?'}`, [goalCodeForDisplay, parentPotentialRisk]);
  const riskCauseCodeDisplay = useMemo(() => `${potentialRiskCodeForDisplay}.PC${currentRiskCause?.sequenceNumber || '?'}`, [potentialRiskCodeForDisplay, currentRiskCause]);
  
  if (pageIsActuallyLoading) { 
    return (
      <div className="space-y-6 p-4 md:p-6">
         <PageHeader
            title="Analisis Detail Penyebab Risiko"
            description="Memuat data..."
            actions={
            <Link href={returnPathForButton} passHref>
                <Button variant="outline" disabled>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                </Button>
            </Link>
            }
        />
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xl text-muted-foreground">
            {authLoading || profileLoading ? "Memuat data pengguna..." : (localDataLoading ? "Memuat data penyebab risiko..." : "Memuat data pengendalian...")}
          </p>
        </div>
      </div>
    );
  }
  
  if (!currentUser || !isProfileComplete) {
    const targetPath = currentUser ? '/settings' : '/login';
    const message = !currentUser ? "Sesi tidak ditemukan." : "Profil Anda belum lengkap.";
     return (
      <div className="space-y-6 p-4 md:p-6">
         <PageHeader
            title="Akses Ditolak"
            description={message}
            actions={
                <Button onClick={() => router.push(targetPath)} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> {currentUser ? "Ke Pengaturan" : "Ke Halaman Login"}
                </Button>
            }
        />
        <div className="flex flex-col items-center justify-center py-10">
          <Info className="h-12 w-12 text-destructive mb-4" />
          <p className="text-xl text-muted-foreground text-center">{message}</p>
        </div>
      </div>
    );
  }

  if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal) {
     return (
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
            title="Analisis Detail Penyebab Risiko"
            description={`UPR: ${uprDisplayName}, Periode: ${currentPeriod || '...'}.`}
            actions={
            <Link href={returnPathForButton} passHref>
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                </Button>
            </Link>
            }
        />
        <div className="flex flex-col items-center justify-center py-10">
          <Info className="h-12 w-12 text-destructive mb-4" />
          <p className="text-xl text-muted-foreground text-center">
            Gagal memuat data lengkap untuk penyebab risiko ini. ID tidak valid atau data induk tidak ditemukan dalam konteks pengguna/periode saat ini.
          </p>
        </div>
      </div>
    );
  }
  
  const controlGuidanceText = getControlGuidance(calculatedRiskLevelText);
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Analisis Detail Penyebab Risiko: ${riskCauseCodeDisplay}`}
        description={`UPR: ${uprDisplayName}, Periode: ${currentPeriod || '...'}. Untuk penyebab: "${currentRiskCause.description}"`}
        actions={
          <Link href={returnPathForButton} passHref>
            <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
          </Link>
        }
      />

      <Card className="mb-6">
        <CardHeader>
            <CardTitle>Konteks Risiko</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
            <p><strong>Sasaran Terkait ({goalCodeForDisplay}):</strong> {grandParentGoal.name}</p>
            <p><strong>Potensi Risiko ({potentialRiskCodeForDisplay}):</strong> {parentPotentialRisk.description}</p>
            <div><strong>Kategori Risiko:</strong> <Badge variant="secondary">{parentPotentialRisk.category || 'N/A'}</Badge></div>
            <p><strong>Pemilik Potensi Risiko:</strong> {parentPotentialRisk.owner || 'N/A'}</p>
            <p><strong>Deskripsi Penyebab (PC{currentRiskCause.sequenceNumber || '?' }):</strong> {currentRiskCause.description}</p>
            <div><strong>Sumber Penyebab:</strong> <Badge variant="outline">{currentRiskCause.source}</Badge></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formulir Analisis Penyebab Risiko</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitAnalysis)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-6"> {/* Kolom Kiri: KRI & Toleransi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="keyRiskIndicator">Key Risk Indicator (KRI)</Label>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAIKriToleranceSuggestion} disabled={isAIKriToleranceLoading || !currentUser} aria-label="Dapatkan Saran AI untuk KRI & Toleransi" type="button">
                      {isAIKriToleranceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Textarea
                    id="keyRiskIndicator"
                    {...register("keyRiskIndicator")}
                    rows={3}
                    placeholder="Contoh: Jumlah keluhan pelanggan melebihi X per bulan, Persentase downtime sistem > Y%"
                    disabled={isSaving}
                    className={errors.keyRiskIndicator ? "border-destructive" : ""}
                  />
                  {errors.keyRiskIndicator && <p className="text-xs text-destructive mt-1">{errors.keyRiskIndicator.message}</p>}
                </div>

                <div className="space-y-1.5">
                   <div className="flex items-center justify-between">
                    <Label htmlFor="riskTolerance">Toleransi Risiko</Label>
                     <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAIKriToleranceSuggestion} disabled={isAIKriToleranceLoading || !currentUser} aria-label="Dapatkan Saran AI untuk KRI & Toleransi" type="button">
                       {isAIKriToleranceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                     </Button>
                  </div>
                  <Textarea
                    id="riskTolerance"
                    {...register("riskTolerance")}
                    rows={3}
                    placeholder="Contoh: Maksimal 5 keluhan pelanggan per bulan, Downtime sistem tidak boleh melebihi 2 jam per kuartal"
                    disabled={isSaving}
                    className={errors.riskTolerance ? "border-destructive" : ""}
                  />
                  {errors.riskTolerance && <p className="text-xs text-destructive mt-1">{errors.riskTolerance.message}</p>}
                </div>
              </div>

              <div className="space-y-6"> {/* Kolom Kanan: Kemungkinan, Dampak, Level */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="likelihood">Kemungkinan</Label>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAILikelihoodImpactSuggestion} disabled={isAILikelihoodImpactLoading || !currentUser} aria-label="Dapatkan Saran AI untuk Kemungkinan & Dampak" type="button">
                        {isAILikelihoodImpactLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsLikelihoodCriteriaModalOpen(true)} type="button" aria-label="Lihat Kriteria Kemungkinan"><Info className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <Controller
                    name="likelihood"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        value={field.value || ""} 
                        onValueChange={(value) => {
                           field.onChange(value as LikelihoodLevelDesc);
                        }} 
                        disabled={isSaving}
                      >
                        <SelectTrigger id="likelihood" className={errors.likelihood ? "border-destructive" : ""}>
                          <SelectValue placeholder="Pilih kemungkinan" />
                        </SelectTrigger>
                        <SelectContent>
                          {LIKELIHOOD_LEVELS_DESC.map(level => (<SelectItem key={`lh-${level}`} value={level}>{level}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.likelihood && <p className="text-xs text-destructive mt-1">{errors.likelihood.message}</p>}
                  {aiLikelihoodImpactSuggestion?.likelihoodJustification && (
                    <Alert variant="default" className="mt-2 text-xs">
                      <Wand2 className="h-4 w-4" />
                      <AlertTitle className="font-semibold">Saran AI (Kemungkinan): {aiLikelihoodImpactSuggestion.likelihood || "Tidak ada"}</AlertTitle>
                      <AlertDescription>{aiLikelihoodImpactSuggestion.likelihoodJustification}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="impact">Dampak</Label>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAILikelihoodImpactSuggestion} disabled={isAILikelihoodImpactLoading || !currentUser} aria-label="Dapatkan Saran AI untuk Kemungkinan & Dampak" type="button">
                        {isAILikelihoodImpactLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsImpactCriteriaModalOpen(true)} type="button" aria-label="Lihat Kriteria Dampak"><Info className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <Controller
                    name="impact"
                    control={control}
                    render={({ field }) => ( 
                      <Select 
                        value={field.value || ""} 
                        onValueChange={(value) => {
                           field.onChange(value as ImpactLevelDesc);
                        }} 
                        disabled={isSaving}
                      >
                        <SelectTrigger id="impact" className={errors.impact ? "border-destructive" : ""}>
                          <SelectValue placeholder="Pilih dampak" />
                        </SelectTrigger>
                        <SelectContent>
                          {IMPACT_LEVELS_DESC.map(level => (<SelectItem key={`im-${level}`} value={level}>{level}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.impact && <p className="text-xs text-destructive mt-1">{errors.impact.message}</p>}
                  {aiLikelihoodImpactSuggestion?.impactJustification && (
                    <Alert variant="default" className="mt-2 text-xs">
                      <Wand2 className="h-4 w-4" />
                      <AlertTitle className="font-semibold">Saran AI (Dampak): {aiLikelihoodImpactSuggestion.impact || "Tidak ada"}</AlertTitle>
                      <AlertDescription>{aiLikelihoodImpactSuggestion.impactJustification}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Tingkat Risiko (Penyebab)</Label>
                    <Badge className={`${getRiskLevelColor(calculatedRiskLevelText)} text-xs`}>
                      {calculatedRiskLevelText === 'N/A' ? 'N/A' : `${calculatedRiskLevelText} (${calculatedRiskScore ?? 'N/A'})`}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Dihitung berdasarkan Kemungkinan dan Dampak yang dipilih untuk penyebab ini.</p>
                </div>
                
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsRiskMatrixModalOpen(true)} type="button" className="w-full">
                    <BarChartHorizontalBig className="mr-2 h-4 w-4" /> Lihat Matriks Profil Risiko
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-8">
              <Button type="submit" disabled={isSaving || !currentUser}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Analisis Penyebab
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Rencana Pengendalian Risiko</CardTitle>
            {calculatedRiskScore !== null && riskAppetiteFromUser !== null && calculatedRiskScore <= riskAppetiteFromUser && (
              <Alert variant="default" className="mt-2 text-sm bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700">
                <Info className="h-4 w-4 text-sky-700 dark:text-sky-300" />
                <AlertTitle className="font-semibold text-sky-800 dark:text-sky-200">Informasi Selera Risiko</AlertTitle>
                <AlertDescription className="text-sky-700 dark:text-sky-300">
                  Berdasarkan Selera Risiko Anda (batas: {riskAppetiteFromUser}), penyebab risiko ini dengan skor tingkat risiko {calculatedRiskScore} mungkin tidak memerlukan tindakan pengendalian prioritas tinggi. Pertimbangkan efisiensi sumber daya.
                </AlertDescription>
              </Alert>
            )}
          <CardDescription className="mt-2 text-xs">
            {controlGuidanceText}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <Link 
                href={currentRiskCause && parentPotentialRisk && grandParentGoal && currentUserId && currentPeriod ? `/control-measure-manage/new?riskCauseId=${currentRiskCause.id}&potentialRiskId=${parentPotentialRisk.id}&goalId=${grandParentGoal.id}&from=${encodeURIComponent(`/risk-cause-analysis/${riskCauseId}`)}` : '#'}
                passHref
              >
                <Button 
                    disabled={!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUser || (calculatedRiskLevelText === 'N/A')}
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengendalian Baru
                </Button>
              </Link>
              {(calculatedRiskLevelText === 'N/A') && (
                <p className="text-xs text-muted-foreground italic mt-1">
                  Analisis kemungkinan dan dampak pada penyebab risiko diperlukan sebelum menambah pengendalian.
                </p>
              )}


            {controlMeasuresLoadingFromStore ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-sm text-muted-foreground">Memuat data pengendalian...</p>
                </div>
            ) : controls.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada rencana pengendalian untuk penyebab risiko ini.</p>
            ) : (
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[120px]">Kode</TableHead>
                                <TableHead className="min-w-[120px]">Tipe</TableHead>
                                <TableHead className="min-w-[250px]">Deskripsi Pengendalian</TableHead>
                                <TableHead className="min-w-[180px]">KCI</TableHead>
                                <TableHead className="min-w-[180px]">Target</TableHead>
                                <TableHead className="min-w-[150px]">Penanggung Jawab</TableHead>
                                <TableHead className="min-w-[120px]">Waktu</TableHead>
                                <TableHead className="min-w-[120px]">Anggaran (Rp)</TableHead>
                                <TableHead className="text-right min-w-[100px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {controls.map(controlItem => { 
                                const controlCode = `${riskCauseCodeDisplay}.${controlItem.controlType}.${controlItem.sequenceNumber}`;
                                const returnPathForEditControl = `/risk-cause-analysis/${riskCauseId}`;
                                return (
                                <TableRow key={controlItem.id}>
                                    <TableCell className="text-xs font-mono">{controlCode}</TableCell>
                                    <TableCell className="text-xs"><Badge variant="outline">{getControlTypeName(controlItem.controlType)} ({controlItem.controlType})</Badge></TableCell>
                                    <TableCell className="text-xs max-w-xs truncate" title={controlItem.description}>{controlItem.description}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={controlItem.keyControlIndicator || ''}>{controlItem.keyControlIndicator || '-'}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={controlItem.target || ''}>{controlItem.target || '-'}</TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate" title={controlItem.responsiblePerson || ''}>{controlItem.responsiblePerson || '-'}</TableCell>
                                    <TableCell className="text-xs">{controlItem.deadline && isValidDate(parseISO(controlItem.deadline)) ? format(parseISO(controlItem.deadline), "dd/MM/yyyy", {locale: localeID}) : '-'}</TableCell>
                                    <TableCell className="text-xs text-right">{controlItem.budget ? controlItem.budget.toLocaleString('id-ID') : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!currentUser}>
                                                    <Settings2 className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/control-measure-manage/${controlItem.id}?from=${encodeURIComponent(returnPathForEditControl)}`}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {setControlToDelete(controlItem); setIsDeleteControlAlertOpen(true);}} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={!currentUser}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
      </Card>


      <LikelihoodCriteriaModal isOpen={isLikelihoodCriteriaModalOpen} onOpenChange={setIsLikelihoodCriteriaModalOpen} />
      <ImpactCriteriaModal isOpen={isImpactCriteriaModalOpen} onOpenChange={setIsImpactCriteriaModalOpen} />
      <RiskMatrixModal isOpen={isRiskMatrixModalOpen} onOpenChange={setIsRiskMatrixModalOpen} />
      
      {isKriToleranceSuggestionsModalOpen && aiKriToleranceSuggestions && currentRiskCause && (
        <KriToleranceAISuggestionsModal
          isOpen={isKriToleranceSuggestionsModalOpen}
          onOpenChange={setIsKriToleranceSuggestionsModalOpen}
          suggestions={aiKriToleranceSuggestions}
          onApplyKRI={handleApplyKRI}
          onApplyTolerance={handleApplyTolerance}
          onApplyBoth={handleApplyBothKriTolerance}
        />
      )}

       <AlertDialog open={isDeleteControlAlertOpen} onOpenChange={setIsDeleteControlAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Pengendalian</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengendalian: "{controlToDelete?.description}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteControlAlertOpen(false); setControlToDelete(null); }}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteControlMeasure} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

