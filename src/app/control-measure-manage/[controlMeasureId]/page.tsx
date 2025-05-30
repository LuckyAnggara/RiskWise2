
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ControlMeasure, RiskCause, PotentialRisk, Goal, ControlMeasureTypeKey, AppUser } from '@/lib/types';
import { CONTROL_MEASURE_TYPE_KEYS, getControlTypeName, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Calendar as CalendarIcon, Wand2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid as isValidDate, startOfToday } from 'date-fns';
import { getCalculatedRiskLevel, getRiskLevelColor, getControlGuidance } from '@/app/risk-cause-analysis/[riskCauseId]/page'; // Import shared functions
import { suggestControlMeasuresAction } from '@/app/actions';
import { ControlMeasureAISuggestionsModal, type AISuggestedControlMeasure } from '@/components/risks/control-measure-ai-suggestions-modal';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

import { getGoalById } from '@/services/goalService';
import { getPotentialRiskById } from '@/services/potentialRiskService';
import { getRiskCauseById } from '@/services/riskCauseService';
import { 
  addControlMeasure, 
  getControlMeasureById as getControlMeasureByIdFromService, 
  updateControlMeasure as updateControlMeasureInService 
} from '@/services/controlMeasureService';


const controlMeasureFormSchema = z.object({
  controlType: z.custom<ControlMeasureTypeKey>((val) => CONTROL_MEASURE_TYPE_KEYS.includes(val as ControlMeasureTypeKey), {
    message: "Tipe pengendalian harus dipilih.",
  }),
  description: z.string().min(5, "Deskripsi pengendalian minimal 5 karakter."),
  keyControlIndicator: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  responsiblePerson: z.string().nullable().optional(),
  deadline: z.date().nullable().optional(),
  budget: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(String(val).replace(/[^0-9.]/g, ''))),
    z.number().positive("Anggaran harus angka positif jika diisi.").nullable().optional()
  ),
});

type ControlMeasureFormData = z.infer<typeof controlMeasureFormSchema>;

export default function ManageControlMeasurePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { currentUser, appUser, loading: authLoading, profileLoading, isProfileComplete, refreshAppUser } = useAuth();
  const { toast } = useToast();

  const controlMeasureIdParam = params.controlMeasureId as string;
  const isCreatingNew = controlMeasureIdParam === 'new';

  const riskCauseIdQuery = searchParams.get('riskCauseId');
  const potentialRiskIdQuery = searchParams.get('potentialRiskId');
  const goalIdQuery = searchParams.get('goalId');

  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [submitActionType, setSubmitActionType] = useState<'close' | 'new' | null>(null);
  
  const [currentControlMeasure, setCurrentControlMeasure] = useState<ControlMeasure | null>(null);
  const [parentRiskCause, setParentRiskCause] = useState<RiskCause | null>(null);
  const [parentPotentialRisk, setParentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [grandParentGoal, setGrandParentGoal] = useState<Goal | null>(null);
  
  const [isAISuggestionsModalOpen, setIsAISuggestionsModalOpen] = useState(false);
  const [aiControlSuggestions, setAiControlSuggestions] = useState<AISuggestedControlMeasure[]>([]);
  const [isAISuggestionsLoading, setIsAISuggestionsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ControlMeasureFormData>({
    resolver: zodResolver(controlMeasureFormSchema),
    defaultValues: {
      controlType: 'Prv',
      description: "",
      keyControlIndicator: "",
      target: "",
      responsiblePerson: "",
      deadline: null,
      budget: null,
    },
  });
  
  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || "UPR Tidak Ditemukan", [appUser]);
  
  const returnPath = useMemo(() => {
    const fromQuery = searchParams.get('from');
    if (fromQuery) return fromQuery;
    
    const rcIdForPath = currentControlMeasure?.riskCauseId || riskCauseIdQuery;
    if (rcIdForPath) return `/risk-cause-analysis/${rcIdForPath}`;
    
    return '/risk-analysis'; 
  }, [searchParams, currentControlMeasure, riskCauseIdQuery]);


  useEffect(() => {
    let isActive = true;
    const loadPageData = async () => {
      if (!currentUserId || !currentPeriod || !isProfileComplete || authLoading || profileLoading) {
        console.log("[ManageCMPage] loadPageData: Waiting for auth/profile context or context missing.");
        if (isActive) setPageIsLoading(true); // Keep loading if context not ready
        return;
      }
      console.log(`[ManageCMPage] loadPageData called. isCreatingNew: ${isCreatingNew}, CM_ID: ${controlMeasureIdParam}, User: ${currentUserId}, Period: ${currentPeriod}`);
      
      if (isActive) {
        setPageIsLoading(true);
        setCurrentControlMeasure(null);
        setParentRiskCause(null);
        setParentPotentialRisk(null);
        setGrandParentGoal(null);
        reset({ controlType: 'Prv', description: "", keyControlIndicator: "", target: "", responsiblePerson: "", deadline: null, budget: null });
      }

      try {
        let riskCauseForContext: RiskCause | null = null;
        let potentialRiskForContext: PotentialRisk | null = null;
        let goalForContext: Goal | null = null;
        let controlToLoad: ControlMeasure | null = null;
        
        let actualRiskCauseId = riskCauseIdQuery;
        let actualPotentialRiskId = potentialRiskIdQuery;
        let actualGoalId = goalIdQuery;

        if (!isCreatingNew && controlMeasureIdParam) {
          console.log(`[ManageCMPage] Editing existing CM. Fetching CM by ID: ${controlMeasureIdParam}`);
          controlToLoad = await getControlMeasureByIdFromService(controlMeasureIdParam, currentUserId, currentPeriod);
          if (!isActive) return;
          if (!controlToLoad) throw new Error("Tindakan pengendalian tidak ditemukan atau tidak cocok konteks pengguna/periode.");
          if (isActive) setCurrentControlMeasure(controlToLoad);
          actualRiskCauseId = controlToLoad.riskCauseId;
          actualPotentialRiskId = controlToLoad.potentialRiskId;
          actualGoalId = controlToLoad.goalId;
        }
        
        if (!actualRiskCauseId) throw new Error("ID Penyebab Risiko (riskCauseId) diperlukan.");
        console.log(`[ManageCMPage] Fetching parent RiskCause by ID: ${actualRiskCauseId}`);
        riskCauseForContext = await getRiskCauseById(actualRiskCauseId, currentUserId, currentPeriod);
        if (!isActive) return;
        if (!riskCauseForContext) throw new Error(`Penyebab Risiko (ID: ${actualRiskCauseId}) tidak ditemukan atau tidak cocok konteks.`);
        if (isActive) setParentRiskCause(riskCauseForContext);
        
        if (!actualPotentialRiskId) throw new Error("ID Potensi Risiko tidak valid.");
        console.log(`[ManageCMPage] Fetching parent PotentialRisk by ID: ${actualPotentialRiskId}`);
        potentialRiskForContext = await getPotentialRiskById(actualPotentialRiskId, currentUserId, currentPeriod);
        if (!isActive) return;
        if (!potentialRiskForContext) throw new Error(`Potensi Risiko Induk (ID: ${actualPotentialRiskId}) tidak ditemukan atau tidak cocok konteks.`);
        if (isActive) setParentPotentialRisk(potentialRiskForContext);
        
        if (!actualGoalId) throw new Error("ID Sasaran tidak valid.");
        console.log(`[ManageCMPage] Fetching grandparent Goal by ID: ${actualGoalId}`);
        goalForContext = await getGoalById(actualGoalId, currentUserId, currentPeriod);
        if (!isActive) return;
        if (!goalForContext) throw new Error(`Sasaran Induk (ID: ${actualGoalId}) tidak ditemukan atau tidak cocok konteks.`);
        if (isActive) setGrandParentGoal(goalForContext);
        
        if (controlToLoad && isActive) {
          reset({
            controlType: controlToLoad.controlType,
            description: controlToLoad.description,
            keyControlIndicator: controlToLoad.keyControlIndicator || "",
            target: controlToLoad.target || "",
            responsiblePerson: controlToLoad.responsiblePerson || "",
            deadline: controlToLoad.deadline && isValidDate(parseISO(controlToLoad.deadline)) ? parseISO(controlToLoad.deadline) : null,
            budget: controlToLoad.budget || null,
          });
        } else if (isCreatingNew && riskCauseForContext && isActive) {
          // Set default control type based on risk level (already in the form's defaultValues)
        }
        console.log("[ManageCMPage] loadPageData: Successfully loaded context data.");
      } catch (error: any) {
        if (!isActive) return;
        const errorMessage = error.message || String(error);
        console.error("[ManageCMPage] Error in loadPageData:", errorMessage);

        let toastMessage = errorMessage;
        if (errorMessage.includes("Maximum call stack size exceeded")) {
            toastMessage = "Terjadi kesalahan internal saat memuat data. Silakan coba lagi.";
        }

        if (isActive) {
          toast({ title: "Kesalahan Memuat Data", description: toastMessage, variant: "destructive" });
          router.push(returnPath); 
        }
      } finally {
        if (isActive) {
            setPageIsLoading(false);
            console.log("[ManageCMPage] loadPageData: FINISHED, pageIsLoading set to false.");
        }
      }
    };
    
    if (currentUserId && currentPeriod && isProfileComplete && !authLoading && !profileLoading) {
      loadPageData();
    } else if (!authLoading && !profileLoading && (!currentUser || !isProfileComplete)) {
       // If auth is done but user not logged in or profile incomplete, stop loading and wait for AppLayout redirect
       if(isActive) setPageIsLoading(false);
    }

    return () => { isActive = false; };
  }, [
    controlMeasureIdParam, isCreatingNew, 
    riskCauseIdQuery, potentialRiskIdQuery, goalIdQuery,
    currentUserId, currentPeriod, isProfileComplete, authLoading, profileLoading,
    reset, router, toast, returnPath 
  ]);
  

  const processSave = async (formData: ControlMeasureFormData): Promise<ControlMeasure | null> => {
    if (!currentUserId || !currentPeriod) {
      toast({ title: "Konteks Pengguna/Periode Hilang", description: "Tidak dapat menyimpan. Harap muat ulang.", variant: "destructive" });
      return null;
    }
    if (!parentRiskCause || !parentPotentialRisk || !grandParentGoal) {
      toast({ title: "Konteks Induk Hilang", description: "Data induk (Penyebab/Potensi/Sasaran) tidak lengkap untuk menyimpan pengendalian.", variant: "destructive" });
      return null;
    }

    const controlDataForService = {
      description: formData.description,
      keyControlIndicator: formData.keyControlIndicator || null,
      target: formData.target || null,
      responsiblePerson: formData.responsiblePerson || null,
      deadline: formData.deadline ? formData.deadline.toISOString() : null,
      budget: formData.budget === null || isNaN(Number(formData.budget)) ? null : Number(formData.budget),
    };

    setIsSaving(true);
    let savedControl: ControlMeasure | null = null;
    try {
      if (isCreatingNew) {
        if (!parentRiskCause.id || !parentPotentialRisk.id || !grandParentGoal.id || !currentUserId || !currentPeriod || !formData.controlType) {
            throw new Error("Data yang diperlukan untuk membuat tindakan pengendalian baru tidak lengkap.");
        }
        savedControl = await addControlMeasure(
          controlDataForService,
          parentRiskCause.id,
          parentPotentialRisk.id,
          grandParentGoal.id,
          currentUserId,
          currentPeriod,
          formData.controlType 
        );
      } else if (currentControlMeasure && currentControlMeasure.id) {
        const updatePayload = {
          controlType: formData.controlType, 
          ...controlDataForService
        };
        await updateControlMeasureInService(currentControlMeasure.id, updatePayload);
        const fetchedUpdatedControl = await getControlMeasureByIdFromService(currentControlMeasure.id, currentUserId, currentPeriod);
        if (!fetchedUpdatedControl) throw new Error("Gagal mengambil data pengendalian setelah update.");
        savedControl = fetchedUpdatedControl;
      } else {
        throw new Error("Konteks pengendalian tidak valid untuk disimpan.");
      }
      return savedControl;
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[ManageCMPage] Error saving control measure:", errorMessage);
      toast({ title: "Gagal Menyimpan Pengendalian", description: errorMessage, variant: "destructive" });
      return null;
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleFormSubmit = async (formData: ControlMeasureFormData) => {
    const savedControl = await processSave(formData);
    if (savedControl) {
      toast({ 
          title: isCreatingNew && submitActionType !== 'close' ? "Pengendalian Baru Disimpan" : "Pengendalian Diperbarui", 
          description: `Pengendalian "${formData.description}" telah berhasil disimpan.` 
      });
      
      if (submitActionType === 'close' || !isCreatingNew) {
        router.push(returnPath);
      } else if (submitActionType === 'new' && isCreatingNew) {
        reset({ 
          controlType: 'Prv', 
          description: "", 
          keyControlIndicator: "", 
          target: "", 
          responsiblePerson: "", 
          deadline: null, 
          budget: null 
        });
        if(parentRiskCause){
            const { level: riskLevel } = getCalculatedRiskLevel(parentRiskCause.likelihood, parentRiskCause.impact);
            setValue('controlType', getControlGuidance(riskLevel).includes("Preventif") ? 'Prv' : 'RM'); // Simplified default
        }
        router.replace(`/control-measure-manage/new?riskCauseId=${parentRiskCause?.id}&potentialRiskId=${parentPotentialRisk?.id}&goalId=${grandParentGoal?.id}&from=${encodeURIComponent(returnPath)}`, undefined, { shallow: true });
      }
    }
    setSubmitActionType(null); 
  };
  
  const handleGetAIControlSuggestions = async () => {
    if (!parentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUserId || !currentPeriod) {
      toast({ title: "Konteks Tidak Lengkap", description: "Data induk atau pengguna/periode tidak tersedia untuk saran AI.", variant: "warning" });
      return;
    }
    
    const { level: riskCauseLevelText } = getCalculatedRiskLevel(parentRiskCause.likelihood, parentRiskCause.impact);
    if (riskCauseLevelText === 'N/A' || !parentRiskCause.likelihood || !parentRiskCause.impact) {
        toast({ title: "Analisis Penyebab Belum Lengkap", description: "Harap lengkapi analisis Kemungkinan dan Dampak untuk penyebab risiko ini sebelum meminta saran pengendalian AI.", variant: "warning" });
        return;
    }

    setIsAISuggestionsLoading(true);
    setAiControlSuggestions([]);
    try {
      const result = await suggestControlMeasuresAction({
        riskCauseDescription: parentRiskCause.description,
        parentPotentialRiskDescription: parentPotentialRisk.description,
        grandParentGoalDescription: grandParentGoal.description,
        riskCauseLevelText: riskCauseLevelText,
        riskCauseLikelihood: parentRiskCause.likelihood,
        riskCauseImpact: parentRiskCause.impact,
      });

      if (result.success && result.data && result.data.suggestedControls) {
        if (result.data.suggestedControls.length === 0) {
          toast({ title: "Tidak Ada Saran AI", description: "AI tidak memberikan saran pengendalian untuk konteks ini.", variant: "default" });
        } else {
          setAiControlSuggestions(result.data.suggestedControls);
          setIsAISuggestionsModalOpen(true);
        }
      } else {
        const errorMsg = result.error || "Gagal mendapatkan saran pengendalian dari AI.";
        toast({ title: "Kesalahan Saran AI", description: errorMsg, variant: "destructive" });
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      toast({ title: "Kesalahan AI Fatal", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAISuggestionsLoading(false);
    }
  };

  const handleApplyAISuggestion = (suggestion: AISuggestedControlMeasure) => {
    setValue('description', suggestion.description || "", { shouldValidate: true });
    setValue('controlType', suggestion.suggestedControlType, { shouldValidate: true });
    setValue('keyControlIndicator', suggestion.suggestedKCI || "", { shouldValidate: true });
    setValue('target', suggestion.suggestedTarget || "", { shouldValidate: true });
    setIsAISuggestionsModalOpen(false);
  };


  if (authLoading || profileLoading || pageIsLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
         <PageHeader
            title={isCreatingNew ? "Tambah Tindakan Pengendalian" : "Edit Tindakan Pengendalian"}
            description="Memuat data..."
            actions={
            <Link href={returnPath} passHref>
                <Button variant="outline" disabled>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                </Button>
            </Link>
            }
        />
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xl text-muted-foreground">
            {authLoading || profileLoading ? "Memuat data pengguna..." : "Memuat data tindakan pengendalian..."}
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

  if ((isCreatingNew && (!riskCauseIdQuery || !parentRiskCause || !parentPotentialRisk || !grandParentGoal)) || 
      (!isCreatingNew && (!currentControlMeasure || !parentRiskCause || !parentPotentialRisk || !grandParentGoal))) {
     return (
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
            title="Kesalahan Konteks Data"
            description={`UPR: ${uprDisplayName}, Periode: ${currentPeriod || '...'}.`}
            actions={
            <Link href={returnPath} passHref>
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                </Button>
            </Link>
            }
        />
        <div className="flex flex-col items-center justify-center py-10">
          <Info className="h-12 w-12 text-destructive mb-4" />
          <p className="text-xl text-muted-foreground text-center">
            Konteks data induk untuk tindakan pengendalian tidak lengkap atau tidak ditemukan.
          </p>
        </div>
      </div>
    );
  }
  
  const controlCodePrefix = parentRiskCause?.sequenceNumber && parentPotentialRisk?.sequenceNumber && grandParentGoal?.code
    ? `${grandParentGoal.code}.PR${parentPotentialRisk.sequenceNumber}.PC${parentRiskCause.sequenceNumber}.${getValues("controlType")}` 
    : `...${getValues("controlType")}`;
  
  const pageTitle = isCreatingNew 
    ? "Tambah Tindakan Pengendalian Baru" 
    : `Edit Tindakan Pengendalian (${controlCodePrefix}${currentControlMeasure?.sequenceNumber ? `.${currentControlMeasure.sequenceNumber}`: ''})`;
  
  const goalCodeForDisplay = grandParentGoal?.code || 'S?';
  const potentialRiskCodeForDisplay = `${goalCodeForDisplay}.PR${parentPotentialRisk?.sequenceNumber || '?'}`;
  const riskCauseCodeForDisplay = `${potentialRiskCodeForDisplay}.PC${parentRiskCause?.sequenceNumber || '?'}`;
  
  const currentRiskCauseLevelData = parentRiskCause ? getCalculatedRiskLevel(parentRiskCause.likelihood, parentRiskCause.impact) : { level: 'N/A' as CalculatedRiskLevelCategory | 'N/A', score: null };
  const controlGuidanceText = parentRiskCause ? getControlGuidance(currentRiskCauseLevelData.level) : "Tentukan tingkat risiko penyebab terlebih dahulu untuk mendapatkan panduan pengendalian.";
  const isAIButtonDisabled = isAISuggestionsLoading || !parentRiskCause || !parentPotentialRisk || !grandParentGoal || (parentRiskCause && (currentRiskCauseLevelData.level === 'N/A' || !parentRiskCause.likelihood || !parentRiskCause.impact));

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        description={`UPR: ${uprDisplayName}, Periode: ${currentPeriod || '...'}.`}
        actions={
          <Link href={returnPath} passHref>
            <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Konteks Risiko</CardTitle>
          <CardDescription className="text-xs space-y-0.5">
            <p><strong>Sasaran ({goalCodeForDisplay}):</strong> {grandParentGoal?.name || 'Memuat...'}</p>
            <p><strong>Potensi Risiko ({potentialRiskCodeForDisplay}):</strong> {parentPotentialRisk?.description || 'Memuat...'}</p>
            <p><strong>Penyebab Risiko ({riskCauseCodeForDisplay}):</strong> {parentRiskCause?.description || 'Memuat...'}</p>
            {parentRiskCause && (
                <p><strong>Tingkat Risiko Penyebab: </strong> 
                    <Badge className={`${getRiskLevelColor(currentRiskCauseLevelData.level)} text-xs ml-1`}>
                        {currentRiskCauseLevelData.level === 'N/A' ? 'N/A' : `${currentRiskCauseLevelData.level} (${currentRiskCauseLevelData.score ?? 'N/A'})`}
                    </Badge>
                </p>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle>Detail Tindakan Pengendalian</CardTitle>
            <Button
                variant="outline"
                size="sm"
                onClick={handleGetAIControlSuggestions}
                disabled={isAIButtonDisabled}
                className="text-xs mt-2 sm:mt-0"
                type="button"
            >
                {isAISuggestionsLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3 w-3" />} Brainstorm Kontrol (AI)
            </Button>
           </div>
            {parentRiskCause && (currentRiskCauseLevelData.level === 'N/A' || !parentRiskCause.likelihood || !parentRiskCause.impact) && (
                 <p className="text-xs text-muted-foreground mt-1">
                    <Info className="inline h-3 w-3 mr-1" />
                    Analisis Kemungkinan & Dampak pada penyebab risiko diperlukan untuk saran AI yang optimal.
                 </p>
            )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="controlType">Tipe Pengendalian</Label>
                <Controller
                  name="controlType"
                  control={control}
                  defaultValue={currentControlMeasure?.controlType || 'Prv'}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                      <SelectTrigger id="controlType" className={errors.controlType ? "border-destructive" : ""}>
                        <SelectValue placeholder="Pilih tipe pengendalian" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTROL_MEASURE_TYPE_KEYS.map(typeKey => (
                          <SelectItem key={typeKey} value={typeKey}>{getControlTypeName(typeKey)} ({typeKey})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.controlType && <p className="text-xs text-destructive mt-1">{errors.controlType.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="responsiblePerson">Penanggung Jawab</Label>
                <Input
                  id="responsiblePerson"
                  {...register("responsiblePerson")}
                  placeholder="Contoh: Manajer SDM, Kepala Divisi TI"
                  disabled={isSaving}
                  className={errors.responsiblePerson ? "border-destructive" : ""}
                />
                 {errors.responsiblePerson && <p className="text-xs text-destructive mt-1">{errors.responsiblePerson.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="controlDescription">Deskripsi Pengendalian Risiko</Label>
              <Textarea
                id="controlDescription"
                {...register("description")}
                className={errors.description ? "border-destructive" : ""}
                rows={3}
                placeholder="Jelaskan tindakan pengendalian..."
                disabled={isSaving}
              />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="keyControlIndicator">Indikator Pengendalian Risiko (KCI)</Label>
                <Input
                  id="keyControlIndicator"
                  {...register("keyControlIndicator")}
                  placeholder="Contoh: Persentase penyelesaian pelatihan"
                  disabled={isSaving}
                  className={errors.keyControlIndicator ? "border-destructive" : ""}
                />
                {errors.keyControlIndicator && <p className="text-xs text-destructive mt-1">{errors.keyControlIndicator.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target">Target KCI</Label>
                <Input
                  id="target"
                  {...register("target")}
                  placeholder="Contoh: 100% pegawai mengikuti pelatihan"
                  disabled={isSaving}
                   className={errors.target ? "border-destructive" : ""}
                />
                {errors.target && <p className="text-xs text-destructive mt-1">{errors.target.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="deadline">Waktu (Deadline)</Label>
                <Controller
                    name="deadline"
                    control={control}
                    render={({ field }) => (
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                            errors.deadline && "border-destructive"
                            )}
                            disabled={isSaving}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Pilih tanggal</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            fromDate={startOfToday()}
                        />
                        </PopoverContent>
                    </Popover>
                    )}
                />
                {errors.deadline && <p className="text-xs text-destructive mt-1">{errors.deadline.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget">Anggaran (Rp)</Label>
                <Controller
                    name="budget"
                    control={control}
                    render={({ field }) => (
                        <Input
                        id="budget"
                        type="text" 
                        value={field.value === null || field.value === undefined || isNaN(Number(field.value)) ? "" : Number(field.value).toLocaleString('id-ID')}
                        onChange={(e) => {
                            const rawValue = e.target.value.replace(/[^0-9]/g, '');
                            const numericValue = rawValue === '' ? null : parseInt(rawValue, 10);
                            field.onChange(numericValue); 
                        }}
                        placeholder="Contoh: 5.000.000"
                        className={errors.budget ? "border-destructive" : ""}
                        disabled={isSaving}
                        />
                    )}
                />
                {errors.budget && <p className="text-xs text-destructive mt-1">{errors.budget.message}</p>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end pt-4 space-y-2 sm:space-y-0 sm:space-x-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.push(returnPath)} 
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                Batal / Tutup
              </Button>
              <Button 
                type="button" 
                onClick={() => { setSubmitActionType('close'); handleSubmit(handleFormSubmit)(); }}
                disabled={isSaving || !currentUser || !parentRiskCause}
                className="w-full sm:w-auto"
              >
                {isSaving && submitActionType === 'close' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isCreatingNew ? "Simpan & Tutup" : "Simpan Perubahan"}
              </Button>
              {isCreatingNew && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => { setSubmitActionType('new'); handleSubmit(handleFormSubmit)(); }}
                  disabled={isSaving || !currentUser || !parentRiskCause}
                  className="w-full sm:w-auto"
                >
                  {isSaving && submitActionType === 'new' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Simpan & Tambah Baru
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {isAISuggestionsModalOpen && parentRiskCause && parentPotentialRisk && grandParentGoal && (
        <ControlMeasureAISuggestionsModal
            isOpen={isAISuggestionsModalOpen}
            onOpenChange={setIsAISuggestionsModalOpen}
            suggestions={aiControlSuggestions}
            onApplySuggestion={handleApplyAISuggestion}
        />
      )}
    </div>
  );
}

