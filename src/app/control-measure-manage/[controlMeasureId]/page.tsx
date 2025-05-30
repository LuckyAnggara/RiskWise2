
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
import type { ControlMeasure, RiskCause, PotentialRisk, Goal, ControlMeasureTypeKey, AppUser, LikelihoodLevelDesc, ImpactLevelDesc, CalculatedRiskLevelCategory } from '@/lib/types';
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
  const { currentUser, appUser, loading: authLoading, profileLoading, isProfileComplete } = useAuth();
  const { toast } = useToast();

  const controlMeasureIdFromUrl = params.controlMeasureId as string | undefined;
  const isCreatingNew = controlMeasureIdFromUrl === 'new';
  const actualControlMeasureIdForOperations = (!isCreatingNew && controlMeasureIdFromUrl && typeof controlMeasureIdFromUrl === 'string')
                                          ? controlMeasureIdFromUrl
                                          : undefined;

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

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || "UPR Tidak Ditemukan", [appUser]);

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

  const returnPath = useMemo(() => {
    const fromQuery = searchParams.get('from');
    if (fromQuery) return fromQuery;
    
    if (parentRiskCause?.id) return `/risk-cause-analysis/${parentRiskCause.id}`;
    if (riskCauseIdQuery) return `/risk-cause-analysis/${riskCauseIdQuery}`;
    
    return '/risk-analysis'; 
  }, [searchParams, parentRiskCause?.id, riskCauseIdQuery]);

  const fetchData = useCallback(async () => {
    let isActive = true;
    console.log(`[ManageCMPage] fetchData called. isCreatingNew: ${isCreatingNew}, UserID: ${currentUserId}, Period: ${currentPeriod}`);
    
    setPageIsLoading(true);
    setCurrentControlMeasure(null);
    setParentRiskCause(null);
    setParentPotentialRisk(null);
    setGrandParentGoal(null);
    reset({ controlType: 'Prv', description: "", keyControlIndicator: "", target: "", responsiblePerson: "", deadline: null, budget: null });

    try {
      if (!currentUserId || !currentPeriod) {
        throw new Error("Konteks pengguna (ID atau Periode) tidak tersedia.");
      }

      let riskCauseIdForContext = riskCauseIdQuery;
      let potentialRiskIdForContext = potentialRiskIdQuery;
      let goalIdForContext = goalIdQuery;
      let controlToLoad: ControlMeasure | null = null;
      
      if (!isCreatingNew) {
        if (!actualControlMeasureIdForOperations) {
          throw new Error("ID Tindakan Pengendalian tidak valid untuk mode edit.");
        }
        controlToLoad = await getControlMeasureByIdFromService(actualControlMeasureIdForOperations, currentUserId, currentPeriod);
        if (!isActive) return;
        if (!controlToLoad) {
          throw new Error("Tindakan pengendalian tidak ditemukan atau tidak cocok konteks pengguna/periode.");
        }
        if (isActive) setCurrentControlMeasure(controlToLoad);
        riskCauseIdForContext = controlToLoad.riskCauseId;
      }
      
      if (!riskCauseIdForContext) throw new Error("Konteks ID Penyebab Risiko diperlukan.");
      const foundRiskCause = await getRiskCauseById(riskCauseIdForContext, currentUserId, currentPeriod);
      if (!isActive) return;
      if (!foundRiskCause) throw new Error(`Penyebab Risiko (ID: ${riskCauseIdForContext}) tidak ditemukan atau tidak cocok konteks.`);
      if (isActive) setParentRiskCause(foundRiskCause);
      
      potentialRiskIdForContext = foundRiskCause.potentialRiskId;
      if (!potentialRiskIdForContext) throw new Error("Konteks ID Potensi Risiko dari Penyebab tidak ditemukan.");
      const foundPotentialRisk = await getPotentialRiskById(potentialRiskIdForContext, currentUserId, currentPeriod);
      if (!isActive) return;
      if (!foundPotentialRisk) throw new Error(`Potensi Risiko Induk (ID: ${potentialRiskIdForContext}) tidak ditemukan atau tidak cocok konteks.`);
      if (isActive) setParentPotentialRisk(foundPotentialRisk);
      
      goalIdForContext = foundPotentialRisk.goalId;
      if (!goalIdForContext) throw new Error("Konteks ID Sasaran dari Potensi Risiko tidak ditemukan.");
      const foundGoal = await getGoalById(goalIdForContext, currentUserId, currentPeriod);
      if (!isActive) return;
      if (!foundGoal) throw new Error(`Sasaran Induk (ID: ${goalIdForContext}) tidak ditemukan atau tidak cocok konteks.`);
      if (isActive) setGrandParentGoal(foundGoal);
      
      if (controlToLoad && isActive) {
        reset({
          controlType: controlToLoad.controlType,
          description: controlToLoad.description,
          keyControlIndicator: controlToLoad.keyControlIndicator || "",
          target: controlToLoad.target || "",
          responsiblePerson: controlToLoad.responsiblePerson || "",
          deadline: controlToLoad.deadline && isValidDate(parseISO(controlToLoad.deadline)) ? parseISO(controlToLoad.deadline) : null,
          budget: controlToLoad.budget,
        });
      } else if (isCreatingNew && foundRiskCause && isActive) {
        const { level: riskLevel } = getCalculatedRiskLevel(foundRiskCause.likelihood, foundRiskCause.impact);
        const guidance = getControlGuidance(riskLevel);
        if (guidance.includes("Preventif")) setValue('controlType', 'Prv');
        else if (guidance.includes("Mitigasi")) setValue('controlType', 'RM');
        else setValue('controlType', 'Crr');
      }
    } catch (error: any) {
      if (!isActive) return;
      const errorMessage = error.message || String(error);
      console.error("[ManageCMPage] Error in fetchData:", errorMessage);
      if (isActive) {
        toast({ title: "Kesalahan Memuat Data Halaman", description: errorMessage, variant: "destructive" });
        router.push(returnPath); 
      }
    } finally {
      if (isActive) setPageIsLoading(false);
    }
    return () => { isActive = false; };
  }, [
    actualControlMeasureIdForOperations, isCreatingNew, 
    riskCauseIdQuery, potentialRiskIdQuery, goalIdQuery,
    currentUserId, currentPeriod, 
    reset, router, toast, returnPath, setValue 
  ]);
  
  useEffect(() => {
    if (currentUserId && currentPeriod && isProfileComplete && !authLoading && !profileLoading) {
      fetchData();
    }
  }, [
      fetchData, // Now fetchData is a dependency
      currentUserId, currentPeriod, isProfileComplete, authLoading, profileLoading
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
      // controlType is passed as separate param to addControlMeasure
    };
    
    console.log("[ManageCMPage] formData.controlType to be used:", formData.controlType);

    setIsSaving(true);
    try {
      if (isCreatingNew) {
        if (!parentRiskCause.id || !parentPotentialRisk.id || !grandParentGoal.id) {
          throw new Error("Data induk tidak valid untuk membuat tindakan pengendalian baru.");
        }
        console.log("[ManageCMPage] Calling addControlMeasure with formData.controlType:", formData.controlType);
        const newControl = await addControlMeasure(
          controlDataForService, // This is Omit<..., 'controlType'>
          parentRiskCause.id,
          parentPotentialRisk.id,
          grandParentGoal.id,
          currentUserId,
          currentPeriod,
          formData.controlType // This is the specific controlType for the service
        );
        return newControl;
      } else if (currentControlMeasure && currentControlMeasure.id) {
        const updatePayload = { 
          controlType: formData.controlType, // Include controlType for updates
          ...controlDataForService
        };
        await updateControlMeasureInService(currentControlMeasure.id, updatePayload);
        const fetchedUpdatedControl = await getControlMeasureByIdFromService(currentControlMeasure.id, currentUserId, currentPeriod);
        if (!fetchedUpdatedControl) throw new Error("Gagal mengambil data pengendalian setelah update.");
        return fetchedUpdatedControl;
      } else {
        throw new Error("Konteks pengendalian tidak valid untuk disimpan.");
      }
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
      if (submitActionType === 'close' || !isCreatingNew) {
        toast({ 
            title: !isCreatingNew ? "Pengendalian Diperbarui" : "Pengendalian Baru Disimpan", 
            description: `Pengendalian "${formData.description}" telah berhasil disimpan.` 
        });
        router.push(returnPath);
      } else if (submitActionType === 'new' && isCreatingNew) {
        toast({ 
            title: "Pengendalian Baru Disimpan", 
            description: `Pengendalian "${formData.description}" telah berhasil disimpan. Silakan input pengendalian baru.` 
        });
        const defaultControlType = parentRiskCause ? (getControlGuidance(getCalculatedRiskLevel(parentRiskCause.likelihood, parentRiskCause.impact).level).includes("Preventif") ? 'Prv' : 'RM') : 'Prv';
        reset({ 
          controlType: defaultControlType, 
          description: "", 
          keyControlIndicator: "", 
          target: "", 
          responsiblePerson: "", 
          deadline: null, 
          budget: null 
        });
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
      console.error("[ManageCMPage] Error fetching AI control suggestions:", errorMessage);
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

  if ( (isCreatingNew && (!riskCauseIdQuery || !parentRiskCause || !parentPotentialRisk || !grandParentGoal)) || 
       (!isCreatingNew && (!actualControlMeasureIdForOperations || !currentControlMeasure || !parentRiskCause || !parentPotentialRisk || !grandParentGoal)) ) {
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
            Konteks data induk untuk tindakan pengendalian tidak lengkap atau tidak ditemukan. Pastikan semua ID (sasaran, potensi risiko, penyebab risiko) valid.
          </p>
        </div>
      </div>
    );
  }
  
  const goalCodeForDisplay = grandParentGoal?.code || 'S?';
  const potentialRiskCodeForDisplay = `${goalCodeForDisplay}.PR${parentPotentialRisk?.sequenceNumber || '?'}`;
  const riskCauseCodeForDisplay = `${potentialRiskCodeForDisplay}.PC${parentRiskCause?.sequenceNumber || '?'}`;
  
  const controlCodeDisplay = currentControlMeasure 
    ? `${riskCauseCodeForDisplay}.${currentControlMeasure.controlType}.${currentControlMeasure.sequenceNumber}` 
    : `${riskCauseCodeForDisplay}.${getValues("controlType")}.(Baru)`;

  const pageTitle = isCreatingNew 
    ? "Tambah Tindakan Pengendalian Baru" 
    : `Edit Tindakan Pengendalian (${controlCodeDisplay})`;
  
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
            {parentPotentialRisk && (
                <div><strong>Kategori Risiko:</strong> <Badge variant="secondary" className="text-xs">{parentPotentialRisk.category || 'N/A'}</Badge></div>
            )}
            <p><strong>Pemilik Potensi Risiko:</strong> {parentPotentialRisk?.owner || 'N/A'}</p>
            <p><strong>Penyebab Risiko ({riskCauseCodeForDisplay}):</strong> {parentRiskCause?.description || 'Memuat...'}</p>
            {parentRiskCause && (
                <div><strong>Tingkat Risiko Penyebab: </strong> 
                    <Badge className={`${getRiskLevelColor(currentRiskCauseLevelData.level)} text-xs ml-1`}>
                        {currentRiskCauseLevelData.level === 'N/A' ? 'N/A' : `${currentRiskCauseLevelData.level} (${currentRiskCauseLevelData.score ?? 'N/A'})`}
                    </Badge>
                </div>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
            <div className="flex-grow">
                <CardTitle>Detail Tindakan Pengendalian</CardTitle>
                {parentRiskCause && (currentRiskCauseLevelData.level === 'N/A' || !parentRiskCause.likelihood || !parentRiskCause.impact) && !isAIButtonDisabled && (
                    <p className="text-xs text-muted-foreground mt-1">
                        <Info className="inline h-3 w-3 mr-1" />
                        Analisis Kemungkinan & Dampak pada penyebab risiko diperlukan untuk saran AI yang optimal.
                    </p>
                )}
                {parentRiskCause && (
                <CardDescription className="mt-2 text-xs">
                    Panduan Tipe Kontrol: {controlGuidanceText}
                </CardDescription>
                )}
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={handleGetAIControlSuggestions}
                disabled={isAIButtonDisabled}
                className="text-xs mt-2 sm:mt-0 self-start sm:self-center"
                type="button"
            >
                {isAISuggestionsLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3 w-3" />} Brainstorm Kontrol (AI)
            </Button>
           </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="controlType">Tipe Pengendalian</Label>
                <Controller
                  name="controlType"
                  control={control}
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
                            selected={field.value ?? undefined} 
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
                        onBlur={(e) => { 
                            if (field.value !== null && field.value !== undefined && !isNaN(Number(field.value))) {
                                e.target.value = Number(field.value).toLocaleString('id-ID');
                            } else if (e.target.value === "0") { 
                                field.onChange(0); // Ensure 0 is a number
                                e.target.value = "0";
                            } else {
                                e.target.value = "";
                            }
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
                  onClick={() => { setSubmitActionType('close'); handleSubmit(handleFormSubmit)(); }}
                  disabled={isSaving || !currentUser || !parentRiskCause}
                  className="w-full sm:w-auto"
                >
                  {isSaving && submitActionType === 'close' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isCreatingNew ? "Simpan & Tutup" : "Simpan Perubahan & Tutup"}
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

