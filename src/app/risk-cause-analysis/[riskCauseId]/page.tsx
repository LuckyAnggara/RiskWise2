
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
import { LIKELIHOOD_LEVELS_DESC, IMPACT_LEVELS_DESC, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, CONTROL_MEASURE_TYPE_KEYS, getControlTypeName, CalculatedRiskLevelCategory, RISK_SCORE_HEATMAP, getCalculatedRiskLevel, getRiskLevelColor, getControlGuidance } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Info, BarChartHorizontalBig, Wand2, PlusCircle, Trash2, Edit, Settings2, BarChart3 } from 'lucide-react';
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
import { format, parseISO, isValid as isValidDate, startOfToday } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import { shallow } from 'zustand/shallow';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  
  const { currentUser, appUser, loading: contextOverallLoading, profileLoading: contextProfileLoading, isProfileComplete } = useAuth();
  const store = useAppStore();
  
  const allControlMeasuresFromStore = useAppStore(state => state.controlMeasures);
  const controlMeasuresLoadingFromStore = useAppStore(state => state.controlMeasuresLoading);

  const filteredControlMeasures = useMemo(() => {
    return allControlMeasuresFromStore
      .filter(cm => 
        cm.riskCauseId === riskCauseId && 
        cm.userId === (appUser?.uid || '') && 
        cm.period === (appUser?.activePeriod || '')
      )
      .sort((a, b) => {
        const typeOrder = CONTROL_MEASURE_TYPE_KEYS.indexOf(a.controlType) - CONTROL_MEASURE_TYPE_KEYS.indexOf(b.controlType);
        if (typeOrder !== 0) return typeOrder;
        return (a.sequenceNumber || 0) - (b.sequenceNumber || 0);
      });
  }, [allControlMeasuresFromStore, riskCauseId, appUser?.uid, appUser?.activePeriod]);


  const [localPageDataLoading, setLocalPageDataLoading] = useState(true); 
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentRiskCause, setCurrentRiskCause] = useState<RiskCause | null>(null);
  const [parentPotentialRisk, setParentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [grandParentGoal, setGrandParentGoal] = useState<Goal | null>(null);
  
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

  const returnPathForButton = useMemo(() => {
    const fromQuery = searchParams.get('from');
    if (fromQuery) return fromQuery;
    if (parentPotentialRisk?.id) return `/all-risks/manage/${parentPotentialRisk.id}`;
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
  
  useEffect(() => {
    let isActive = true;
    let isDataLoadingOperation = false; 

    async function loadPageDataInternal() {
      if (!isActive || isDataLoadingOperation || !currentUserId || !currentPeriod || !riskCauseId) {
        if(isActive && !isDataLoadingOperation) setLocalPageDataLoading(false); 
        return;
      }
      
      isDataLoadingOperation = true;
      if(isActive) setLocalPageDataLoading(true);
      
      try {
        const foundCause = await store.getRiskCauseById(riskCauseId, currentUserId, currentPeriod);
        if (!isActive || !foundCause) throw new Error(!foundCause ? `Penyebab Risiko (ID: ${riskCauseId}) tidak ditemukan.` : 'Operasi dibatalkan.');
        if (isActive) setCurrentRiskCause(foundCause);

        const foundPotentialRisk = await store.getPotentialRiskById(foundCause.potentialRiskId, currentUserId, currentPeriod);
        if (!isActive || !foundPotentialRisk) throw new Error(!foundPotentialRisk ? `Potensi risiko induk (ID: ${foundCause.potentialRiskId}) tidak ditemukan.` : 'Operasi dibatalkan.');
         if (isActive) setParentPotentialRisk(foundPotentialRisk);

        const foundGoal = await store.getGoalById(foundPotentialRisk.goalId, currentUserId, currentPeriod);
        if (!isActive || !foundGoal) throw new Error(!foundGoal ? `Sasaran induk (ID: ${foundPotentialRisk.goalId}) tidak ditemukan.` : 'Operasi dibatalkan.');
        if (isActive) setGrandParentGoal(foundGoal);
        
        if (foundCause && isActive) { 
            await store.fetchControlMeasures(currentUserId, currentPeriod, foundCause.id);
        }

      } catch (error: any) {
        if (!isActive) return;
        const errorMessage = (error instanceof Error && error.message) ? error.message : String(error).substring(0,500);
        if(isActive) {
            toast({ title: "Kesalahan Memuat Data Detail", description: errorMessage, variant: "destructive" });
            router.push(returnPathForButton); 
        }
      } finally {
        if (isActive) setLocalPageDataLoading(false);
        isDataLoadingOperation = false;
      }
    }
    
    if (currentUserId && currentPeriod && isProfileComplete && !contextOverallLoading && !contextProfileLoading && riskCauseId) {
        loadPageDataInternal();
    } else if (!contextOverallLoading && !contextProfileLoading && isActive) { 
        if (localPageDataLoading) setLocalPageDataLoading(false); 
    }
    return () => { isActive = false; };
  }, [
    riskCauseId, currentUserId, currentPeriod, isProfileComplete, contextOverallLoading, contextProfileLoading
    // Stable dependencies like store, router, toast, returnPathForButton removed
  ]);

  useEffect(() => {
    if (currentRiskCause) {
      reset({
        keyRiskIndicator: currentRiskCause.keyRiskIndicator || "",
        riskTolerance: currentRiskCause.riskTolerance || "",
        likelihood: currentRiskCause.likelihood,
        impact: currentRiskCause.impact,
      });
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
    const currentRiskCauseId = currentRiskCause.id; 

    const updatedRiskCauseData: Partial<Omit<RiskCause, 'id' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber' | 'analysisUpdatedAt'>> = {
      description: currentRiskCause.description, 
      source: currentRiskCause.source,          
      keyRiskIndicator: data.keyRiskIndicator || null,
      riskTolerance: data.riskTolerance || null,
      likelihood: data.likelihood,
      impact: data.impact,
    };
    
    try {
      const updatedCauseFromStore = await store.updateRiskCauseInStore(currentRiskCauseId, updatedRiskCauseData);
      if (updatedCauseFromStore) {
        setCurrentRiskCause(updatedCauseFromStore); 
        toast({ title: "Sukses", description: `Analisis untuk penyebab risiko ${riskCauseCodeDisplay} telah disimpan.` });
      } else {
        throw new Error("Pembaruan penyebab risiko di store gagal mengembalikan data.");
      }
    } catch (error:any) {
      const errorMessage = (error instanceof Error && error.message) ? error.message : String(error).substring(0,200);
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
      const errorMessage = (error instanceof Error && error.message) ? error.message : String(error).substring(0,200);
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
      const errorMessage = (error instanceof Error && error.message) ? error.message : String(error).substring(0,200);
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
  
  const confirmDeleteControlMeasure = async () => {
    if (!controlToDelete || !controlToDelete.id || !currentUserId || !currentPeriod || !currentRiskCause) {
        toast({ title: "Gagal Menghapus", description: "Data tidak lengkap untuk menghapus pengendalian.", variant: "destructive"});
        setIsDeleteControlAlertOpen(false);
        setControlToDelete(null);
        return;
    }
    try {
      await store.deleteControlMeasureFromStore(controlToDelete.id); 
      toast({ title: "Pengendalian Dihapus", description: `Pengendalian "${controlToDelete.description}" telah dihapus.`, variant: "destructive" });
      if (currentRiskCause?.id && currentUserId && currentPeriod) {
        await store.fetchControlMeasures(currentUserId, currentPeriod, currentRiskCause.id); 
      }
    } catch (error: any) {
        const errorMessage = (error instanceof Error && error.message) ? error.message : String(error).substring(0,200);
        console.error("[RiskCauseAnalysisPage] Error deleting control measure:", errorMessage);
        toast({ title: "Gagal Menghapus Pengendalian", description: errorMessage, variant: "destructive" });
    } finally {
        setIsDeleteControlAlertOpen(false);
        setControlToDelete(null);
    }
  };

  const pageIsEffectivelyLoading = contextOverallLoading || localPageDataLoading || controlMeasuresLoadingFromStore;

  const goalCodeForDisplay = useMemo(() => `${grandParentGoal?.code || 'S?'}`, [grandParentGoal]);
  const potentialRiskCodeForDisplay = useMemo(() => `${goalCodeForDisplay}.PR${parentPotentialRisk?.sequenceNumber || '?'}`, [goalCodeForDisplay, parentPotentialRisk]);
  const riskCauseCodeDisplay = useMemo(() => `${potentialRiskCodeForDisplay}.PC${currentRiskCause?.sequenceNumber || '?'}`, [potentialRiskCodeForDisplay, currentRiskCause]);
  
  if (pageIsEffectivelyLoading) { 
    return (
      <div className="space-y-6 p-4 md:p-6">
         <PageHeader
            title={`Analisis Detail Penyebab Risiko: ${riskCauseId && !currentRiskCause ? riskCauseId.substring(0,5)+'...' : riskCauseCodeDisplay}`}
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
            {contextOverallLoading ? "Memuat data pengguna/konteks..." : (localPageDataLoading ? "Memuat data penyebab risiko..." : (controlMeasuresLoadingFromStore ? "Memuat data pengendalian..." : "Memuat data..."))}
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
              <div className="space-y-6"> 
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="keyRiskIndicator">Key Risk Indicator (KRI)</Label>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAIKriToleranceSuggestion} disabled={isAIKriToleranceLoading || !currentUser || !currentRiskCause} aria-label="Dapatkan Saran AI untuk KRI & Toleransi" type="button">
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
                     <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAIKriToleranceSuggestion} disabled={isAIKriToleranceLoading || !currentUser || !currentRiskCause} aria-label="Dapatkan Saran AI untuk KRI & Toleransi" type="button">
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
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAILikelihoodImpactSuggestion} disabled={isAILikelihoodImpactLoading || !currentUser || !currentRiskCause} aria-label="Dapatkan Saran AI untuk Kemungkinan & Dampak" type="button">
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
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleGetAILikelihoodImpactSuggestion} disabled={isAILikelihoodImpactLoading || !currentUser || !currentRiskCause} aria-label="Dapatkan Saran AI untuk Kemungkinan & Dampak" type="button">
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
                                const editPath = currentRiskCause && parentPotentialRisk && grandParentGoal && currentUserId && currentPeriod 
                                  ? `/control-measure-manage/${controlItem.id}?riskCauseId=${currentRiskCause.id}&potentialRiskId=${parentPotentialRisk.id}&goalId=${grandParentGoal.id}&from=${encodeURIComponent(returnPathForEditControl)}`
                                  : '#';
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
                                                    <Link href={editPath}>
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


