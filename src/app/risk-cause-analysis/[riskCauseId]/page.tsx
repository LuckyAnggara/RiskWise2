
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
import { LIKELIHOOD_LEVELS_DESC, IMPACT_LEVELS_DESC, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, CalculatedRiskLevelCategory, CONTROL_MEASURE_TYPE_KEYS, getControlTypeName } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Info, BarChartHorizontalBig, Wand2, PlusCircle, Trash2, Edit, Settings2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
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
import { useAppStore } from '@/stores/useAppStore';
import { shallow } from 'zustand/shallow';

import { getGoalById } from '@/services/goalService';
import { getPotentialRiskById } from '@/services/potentialRiskService';
import { getRiskCauseById as getRiskCauseByIdFromService, updateRiskCause as updateRiskCauseInService } from '@/services/riskCauseService';
import { addControlMeasure, getControlMeasuresByRiskCauseId, deleteControlMeasure, updateControlMeasure as updateControlMeasureInService } from '@/services/controlMeasureService';


export const RISK_SCORE_HEATMAP: { [key: number]: { [key: number]: number } } = {
  // Dampak ->
  // Kemungkinan
  // V               1 (TS) 2 (M)  3 (Mod) 4 (S)   5 (SS)
  /* 5 Sangat Pasti*/  1: { 1: 9,  2: 15,  3: 18,  4: 23,  5: 25  }, // Baris untuk Kemungkinan 5 (Sangat Pasti)
  /* 4 Sering */       2: { 1: 6,  2: 12,  3: 16,  4: 19,  5: 24  }, // Baris untuk Kemungkinan 4 (Sering)
  /* 3 Kadang */       3: { 1: 4,  2: 10,  3: 14,  4: 17,  5: 22  }, // Baris untuk Kemungkinan 3 (Kadang)
  /* 2 Jarang */       4: { 1: 2,  2: 7,   3: 11,  4: 13,  5: 21  }, // Baris untuk Kemungkinan 2 (Jarang)
  /* 1 Hampir Tidak */ 5: { 1: 1,  2: 3,   3: 5,   4: 8,   5: 20  }  // Baris untuk Kemungkinan 1 (Hampir Tidak)
};


export const getCalculatedRiskLevel = (likelihood: LikelihoodLevelDesc | null, impact: ImpactLevelDesc | null): { level: CalculatedRiskLevelCategory | 'N/A'; score: number | null } => {
  if (!likelihood || !impact) return { level: 'N/A', score: null };
  
  const likelihoodValue = LIKELIHOOD_LEVELS_DESC_MAP[likelihood];
  const impactValue = IMPACT_LEVELS_DESC_MAP[impact];

  if (likelihoodValue === undefined || impactValue === undefined) {
    console.warn(`[getCalculatedRiskLevel] Invalid likelihood or impact description: L=${likelihood}, I=${impact}`);
    return { level: 'N/A', score: null };
  }
  
  // Ambil skor dari heatmap yang sudah disesuaikan urutan barisnya
  // Baris heatmap (kunci luar) adalah 1-5 yang merepresentasikan Kemungkinan 5-1
  // Kolom heatmap (kunci dalam) adalah 1-5 yang merepresentasikan Dampak 1-5
  // Karena LIKELIHOOD_LEVELS_DESC_MAP kita (1=Hampir tidak, 5=Sangat Pasti),
  // kita perlu membalik mapping likelihoodValue untuk heatmap: heatmapRow = 6 - likelihoodValue
  const heatmapRowKey = (6 - likelihoodValue) as keyof typeof RISK_SCORE_HEATMAP;
  const score = RISK_SCORE_HEATMAP[heatmapRowKey]?.[impactValue] ?? null;

  if (score === null) {
    console.warn(`[getCalculatedRiskLevel] Score not found in heatmap for Likelihood: ${likelihood} (val: ${likelihoodValue}, mapRow: ${heatmapRowKey}), Impact: ${impact} (val: ${impactValue})`);
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
  
  // Select states from Zustand store with shallow equality for object selection
  const allControlMeasures = useAppStore(state => state.controlMeasures);
  const controlMeasuresLoading = useAppStore(state => state.controlMeasuresLoading);
  const store = useAppStore();


  const [localDataLoading, setLocalDataLoading] = useState(true); 
  const pageIsLoading = authLoading || profileLoading || localDataLoading || controlMeasuresLoading;
  
  const [currentRiskCause, setCurrentRiskCause] = useState<RiskCause | null>(null);
  const [parentPotentialRisk, setParentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [grandParentGoal, setGrandParentGoal] = useState<Goal | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);
  const [controlToEdit, setControlToEdit] = useState<ControlMeasure | null>(null);
  const [isDeleteControlAlertOpen, setIsDeleteControlAlertOpen] = useState(false);
  const [controlToDelete, setControlToDelete] = useState<ControlMeasure | null>(null);


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
    // Fallback jika riskCauseIdQuery ada (meskipun parentPotentialRisk mungkin belum termuat saat ini dihitung)
    // Ini mungkin perlu disesuaikan jika kita ingin path kembali yang lebih dinamis berdasarkan konteks yang dimuat
    // Untuk saat ini, jika parentPotentialRisk tidak ada, fallback ke /risk-analysis
    return '/risk-analysis'; 
  }, [searchParams, parentPotentialRisk?.id]);

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
  
  const filteredControlMeasures = useMemo(() => {
    if (!allControlMeasures || !riskCauseId || !currentUserId || !currentPeriod) return [];
    return allControlMeasures.filter(cm => 
      cm.riskCauseId === riskCauseId && 
      cm.userId === currentUserId && 
      cm.period === currentPeriod
    ).sort((a, b) => {
      const typeOrder = CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType);
      if (typeOrder !== 0) return typeOrder;
      return (a.sequenceNumber || 0) - (b.sequenceNumber || 0);
    });
  }, [allControlMeasures, riskCauseId, currentUserId, currentPeriod]);

  useEffect(() => {
    let isActive = true;
    console.log(`[RiskCauseAnalysisPage] Effect for main data fetch TRIGGERED. RC_ID: ${riskCauseId}, UserID: ${currentUserId}, Period: ${currentPeriod}, AuthL: ${authLoading}, ProfL: ${profileLoading}, ProfComp: ${isProfileComplete}`);

    async function loadPageData() {
      if (!riskCauseId || !currentUserId || !currentPeriod || !isProfileComplete || authLoading || profileLoading) {
        console.log("[RiskCauseAnalysisPage] loadPageData: Prerequisites not met. Aborting fetch.");
        if (!authLoading && !profileLoading && isActive) {
          setLocalDataLoading(false);
        }
        return;
      }
      
      if (!isActive) return;
      setLocalDataLoading(true);
      console.log(`[RiskCauseAnalysisPage] loadPageData: Fetching data for RC_ID: ${riskCauseId}, User: ${currentUserId}, Period: ${currentPeriod}`);

      // Reset state sebelum fetch baru
      setCurrentRiskCause(null);
      setParentPotentialRisk(null);
      setGrandParentGoal(null);
      // store.getState().setControlMeasures([]); // Tidak perlu, fetchControlMeasures akan menangani
      setAiLikelihoodImpactSuggestion(null);
      setAiKriToleranceSuggestions(null);
      reset({ keyRiskIndicator: null, riskTolerance: null, likelihood: null, impact: null });
      
      try {
        console.log(`[RiskCauseAnalysisPage] Attempting to get RiskCause ID: ${riskCauseId}`);
        const foundCause = await getRiskCauseByIdFromService(riskCauseId, currentUserId, currentPeriod);
        if (!isActive) return;
        if (!foundCause) {
          console.error(`[RiskCauseAnalysisPage] RiskCause with ID ${riskCauseId} not found or context mismatch for user ${currentUserId}, period ${currentPeriod}.`);
          throw new Error(`Penyebab Risiko (ID: ${riskCauseId}) tidak ditemukan atau tidak cocok konteks.`);
        }
        console.log(`[RiskCauseAnalysisPage] Fetched RiskCause:`, foundCause);
        if (isActive) setCurrentRiskCause(foundCause);

        console.log(`[RiskCauseAnalysisPage] Attempting to get PotentialRisk ID: ${foundCause.potentialRiskId}`);
        const foundPotentialRisk = await getPotentialRiskById(foundCause.potentialRiskId, currentUserId, currentPeriod);
        if (!isActive) return;
        if (!foundPotentialRisk) {
            console.error(`[RiskCauseAnalysisPage] PotentialRisk with ID ${foundCause.potentialRiskId} not found or context mismatch.`);
            throw new Error(`Potensi risiko induk (ID: ${foundCause.potentialRiskId}) tidak ditemukan atau tidak cocok konteks.`);
        }
        console.log(`[RiskCauseAnalysisPage] Fetched PotentialRisk:`, foundPotentialRisk);
        if (isActive) setParentPotentialRisk(foundPotentialRisk);

        console.log(`[RiskCauseAnalysisPage] Attempting to get Goal ID: ${foundPotentialRisk.goalId}`);
        const foundGoal = await getGoalById(foundPotentialRisk.goalId, currentUserId, currentPeriod);
        if (!isActive) return;
        if (!foundGoal) {
            console.error(`[RiskCauseAnalysisPage] Goal with ID ${foundPotentialRisk.goalId} not found or context mismatch.`);
            throw new Error(`Sasaran induk (ID: ${foundPotentialRisk.goalId}) tidak ditemukan atau tidak cocok konteks.`);
        }
        console.log(`[RiskCauseAnalysisPage] Fetched Goal:`, foundGoal);
        if (isActive) setGrandParentGoal(foundGoal);
        
        if (foundCause && isActive) {
            console.log(`[RiskCauseAnalysisPage] Triggering fetchControlMeasures for RC_ID: ${foundCause.id}`);
            await store.fetchControlMeasures(currentUserId, currentPeriod, foundCause.id);
        }
        console.log("[RiskCauseAnalysisPage] Main data fetching complete and states set.");
        
      } catch (error: any) {
        if (!isActive) return;
        const errorMessage = error.message || String(error);
        console.error("[RiskCauseAnalysisPage] Error in loadPageData:", errorMessage);
        if (isActive) {
          toast({ title: "Kesalahan Memuat Data", description: errorMessage.substring(0, 200), variant: "destructive" });
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
      loadPageData();
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
    store, // store is stable, but fetchControlMeasures might change if store definition changes
    reset, 
    router, 
    toast, 
    searchParams, // from useSearchParams, stable
    returnPathForButton // memoized
  ]);

  useEffect(() => {
    if (currentRiskCause) {
      console.log("[RiskCauseAnalysisPage] currentRiskCause changed, resetting form with:", currentRiskCause);
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
      const updatedCause = await updateRiskCauseInService(currentRiskCause.id, updatedRiskCauseData);
      if(updatedCause) {
        // Optimistically update local state, or refetch from store if store is the source of truth
        setCurrentRiskCause(prev => prev ? { ...prev, ...updatedCause } : null);
        // If store is used for currentRiskCause, call store update action here
        // store.updateRiskCauseInState(currentRiskCause.id, updatedCauseData) // Assuming this action exists in store
        toast({ title: "Sukses", description: `Analisis untuk penyebab risiko ${riskCauseCodeDisplay} telah disimpan.` });
      } else {
         throw new Error("Gagal memuat ulang data penyebab setelah update dari service.");
      }
    } catch (error:any) {
      const errorMessage = error.message || String(error);
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
      const errorMessage = error.message || String(error);
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
    } catch (error: any) {
      const errorMessage = error.message ? String(error.message) : String(error);
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
    existingControlId?: string,
    isNewControl?: boolean
  ) => {
    if (!currentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUserId || !currentPeriod) {
      toast({ title: "Konteks Tidak Lengkap", description: "Data induk atau pengguna/periode tidak tersedia untuk menyimpan pengendalian.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const controlDataForService = {
      ...formData,
      deadline: formData.deadline ? (typeof formData.deadline === 'string' ? formData.deadline : formData.deadline.toISOString()) : null,
      budget: formData.budget === null || formData.budget === undefined || isNaN(Number(formData.budget)) ? null : Number(formData.budget),
    };

    try {
      if (!isNewControl && controlToEdit && controlToEdit.id) {
        console.log("[ManageCMPage] Updating existing control measure ID:", controlToEdit.id);
        await updateControlMeasureInService(controlToEdit.id, controlDataForService);
        toast({ title: "Pengendalian Diperbarui" });
      } else {
        console.log("[ManageCMPage] Adding new control measure for RiskCause ID:", currentRiskCause.id);
        await addControlMeasure(
          controlDataForService,
          currentRiskCause.id,
          parentPotentialRisk.id,
          grandParentGoal.id,
          currentUserId,
          currentPeriod,
          formData.controlType // controlType dari formData
        );
        toast({ title: "Pengendalian Baru Disimpan" });
      }
      await store.fetchControlMeasures(currentUserId, currentPeriod, currentRiskCause.id); // Re-fetch controls for this cause
      setIsControlModalOpen(false);
      setControlToEdit(null);
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[ManageCMPage] Error saving control measure:", errorMessage);
      toast({ title: "Gagal Menyimpan Pengendalian", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
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
      await deleteControlMeasure(controlToDelete.id); 
      toast({ title: "Pengendalian Dihapus", description: `Pengendalian "${controlToDelete.description}" telah dihapus.`, variant: "destructive" });
      await store.fetchControlMeasures(currentUserId, currentPeriod, currentRiskCause.id); // Re-fetch
    } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error("[RiskCauseAnalysisPage] Error deleting control measure:", errorMessage);
        toast({ title: "Gagal Menghapus Pengendalian", description: errorMessage, variant: "destructive" });
    } finally {
        setIsDeleteControlAlertOpen(false);
        setControlToDelete(null);
    }
  };

  const goalCodeForDisplay = useMemo(() => `${grandParentGoal?.code || 'S?'}`, [grandParentGoal]);
  const potentialRiskCodeForDisplay = useMemo(() => `${goalCodeForDisplay}.PR${parentPotentialRisk?.sequenceNumber || '?'}`, [goalCodeForDisplay, parentPotentialRisk]);
  const riskCauseCodeDisplay = useMemo(() => `${potentialRiskCodeForDisplay}.PC${currentRiskCause?.sequenceNumber || '?'}`, [potentialRiskCodeForDisplay, currentRiskCause]);
  

  if (authLoading || profileLoading || localDataLoading) { 
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
            {authLoading || profileLoading ? "Memuat data pengguna..." : "Memuat data analisis penyebab risiko..."}
          </p>
        </div>
      </div>
    );
  }
  
  if (!currentUser || !isProfileComplete) {
    return (
      <div className="space-y-6 p-4 md:p-6">
         <PageHeader
            title="Akses Ditolak"
            description={!currentUser ? "Sesi tidak ditemukan." : "Profil Anda belum lengkap."}
            actions={
                <Button onClick={() => router.push(currentUser ? '/settings' : '/login')} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> {currentUser ? "Ke Pengaturan" : "Ke Halaman Login"}
                </Button>
            }
        />
        <div className="flex flex-col items-center justify-center py-10">
          <Info className="h-12 w-12 text-destructive mb-4" />
          <p className="text-xl text-muted-foreground text-center">
              { !currentUser ? "Sesi tidak ditemukan. Silakan login kembali." : "Profil Anda belum lengkap. Harap lengkapi di Pengaturan."}
          </p>
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
            Detail penyebab risiko, potensi risiko induk, atau sasaran tidak dapat dimuat. Pastikan ID valid dan data ada dalam konteks UPR/Periode Anda.
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
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="keyRiskIndicator">Indikator Kunci Risiko (KRI)</Label>
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

              <div className="space-y-6">
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
                href={currentRiskCause && parentPotentialRisk && grandParentGoal && currentUserId && currentPeriod ? `/control-measure-manage/new?riskCauseId=${currentRiskCause.id}&potentialRiskId=${parentPotentialRisk.id}&goalId=${grandParentGoal.id}&from=${encodeURIComponent(router.asPath)}` : '#'}
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


            {controlMeasuresLoading ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-sm text-muted-foreground">Memuat data pengendalian...</p>
                </div>
            ) : filteredControlMeasures.length === 0 ? (
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
                            {filteredControlMeasures.map(controlItem => { 
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
                                                    <Link href={`/control-measure-manage/${controlItem.id}?from=${encodeURIComponent(returnPathForEditControl)}&riskCauseId=${riskCauseId}&potentialRiskId=${parentPotentialRisk?.id}&goalId=${grandParentGoal?.id}`}>
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

    