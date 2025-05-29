
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ControlMeasure, RiskCause, PotentialRisk, Goal, ControlMeasureTypeKey, AppUser } from '@/lib/types';
import { CONTROL_MEASURE_TYPE_KEYS, getControlTypeName, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP } from '@/lib/types'; // Removed getCalculatedRiskLevel from here
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
import { ControlMeasureAISuggestionsModal, type AISuggestedControlMeasure } from '@/components/risks/control-measure-ai-suggestions-modal'; // CORRECTED IMPORT PATH
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

import { getGoalById } from '@/services/goalService';
import { getPotentialRiskById } from '@/services/potentialRiskService';
import { getRiskCauseById } from '@/services/riskCauseService';
import { addControlMeasure, getControlMeasureById as getControlMeasureByIdFromService, updateControlMeasure as updateControlMeasureInService } from '@/services/controlMeasureService';


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
    (val) => (val === "" || val === null || val === undefined ? null : Number(String(val).replace(/[^0-9]/g, ''))),
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
  
  const [currentControlMeasure, setCurrentControlMeasure] = useState<ControlMeasure | null>(null);
  const [parentRiskCause, setParentRiskCause] = useState<RiskCause | null>(null);
  const [parentPotentialRisk, setParentPotentialRisk] = useState<PotentialRisk | null>(null);
  const [grandParentGoal, setGrandParentGoal] = useState<Goal | null>(null);
  
  const [isAISuggestionsModalOpen, setIsAISuggestionsModalOpen] = useState(false);
  const [aiControlSuggestions, setAiControlSuggestions] = useState<AISuggestedControlMeasure[]>([]);
  const [isAISuggestionsLoading, setIsAISuggestionsLoading] = useState(false);
  const [submitActionType, setSubmitActionType] = useState<'close' | 'new' | null>(null);


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
      keyControlIndicator: null,
      target: null,
      responsiblePerson: null,
      deadline: null,
      budget: null,
    },
  });

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);

  const returnPath = useMemo(() => {
    const fromQuery = searchParams.get('from');
    if (fromQuery) return fromQuery;
    
    const rcId = currentControlMeasure?.riskCauseId || parentRiskCause?.id || riskCauseIdQuery;
    if (rcId) return `/risk-cause-analysis/${rcId}`;
    
    return '/risk-analysis'; 
  }, [searchParams, currentControlMeasure, parentRiskCause, riskCauseIdQuery]);

  const fetchData = useCallback(async () => {
    let isActive = true;
    if (!currentUserId || !currentPeriod || !isProfileComplete) {
      if (!authLoading && !profileLoading && isActive) {
        toast({ title: "Konteks Tidak Lengkap", description: "Sesi atau profil pengguna tidak lengkap. Harap muat ulang atau lengkapi profil.", variant: "destructive" });
        router.push('/');
      }
      if (isActive) setPageIsLoading(false);
      return;
    }

    console.log(`[ManageCMPage] fetchData called. isCreatingNew: ${isCreatingNew}, CM_ID: ${controlMeasureIdParam}, User: ${currentUserId}, Period: ${currentPeriod}`);
    setPageIsLoading(true);
    setCurrentControlMeasure(null);
    setParentRiskCause(null);
    setParentPotentialRisk(null);
    setGrandParentGoal(null);
    reset({ controlType: 'Prv', description: "", keyControlIndicator: null, target: null, responsiblePerson: null, deadline: null, budget: null });

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
        if (!controlToLoad) throw new Error("Tindakan pengendalian tidak ditemukan atau tidak cocok konteks pengguna/periode.");
        if (isActive) setCurrentControlMeasure(controlToLoad);
        actualRiskCauseId = controlToLoad.riskCauseId;
        // ID lain (potentialRiskId, goalId) sudah ada di controlToLoad, tidak perlu di-override dari query param jika edit.
        actualPotentialRiskId = controlToLoad.potentialRiskId;
        actualGoalId = controlToLoad.goalId;
      }
      
      if (!actualRiskCauseId) throw new Error("ID Penyebab Risiko (riskCauseId) diperlukan dari query parameter untuk membuat pengendalian baru.");
      console.log(`[ManageCMPage] Fetching parent RiskCause by ID: ${actualRiskCauseId}`);
      riskCauseForContext = await getRiskCauseById(actualRiskCauseId, currentUserId, currentPeriod);
      if (!riskCauseForContext) throw new Error(`Penyebab Risiko (ID: ${actualRiskCauseId}) tidak ditemukan atau tidak cocok konteks.`);
      if (isActive) setParentRiskCause(riskCauseForContext);
      actualPotentialRiskId = riskCauseForContext.potentialRiskId; 
      
      if (!actualPotentialRiskId) throw new Error("ID Potensi Risiko tidak valid dari Penyebab Risiko.");
      console.log(`[ManageCMPage] Fetching parent PotentialRisk by ID: ${actualPotentialRiskId}`);
      potentialRiskForContext = await getPotentialRiskById(actualPotentialRiskId, currentUserId, currentPeriod);
      if (!potentialRiskForContext) throw new Error(`Potensi Risiko Induk (ID: ${actualPotentialRiskId}) tidak ditemukan atau tidak cocok konteks.`);
      if (isActive) setParentPotentialRisk(potentialRiskForContext);
      actualGoalId = potentialRiskForContext.goalId;
      
      if (!actualGoalId) throw new Error("ID Sasaran tidak valid dari Potensi Risiko.");
      console.log(`[ManageCMPage] Fetching grandparent Goal by ID: ${actualGoalId}`);
      goalForContext = await getGoalById(actualGoalId, currentUserId, currentPeriod);
      if (!goalForContext) throw new Error(`Sasaran Induk (ID: ${actualGoalId}) tidak ditemukan atau tidak cocok konteks.`);
      if (isActive) setGrandParentGoal(goalForContext);
      
      if (controlToLoad && isActive) {
        reset({
          controlType: controlToLoad.controlType,
          description: controlToLoad.description,
          keyControlIndicator: controlToLoad.keyControlIndicator || null,
          target: controlToLoad.target || null,
          responsiblePerson: controlToLoad.responsiblePerson || null,
          deadline: controlToLoad.deadline && isValidDate(parseISO(controlToLoad.deadline)) ? parseISO(controlToLoad.deadline) : null,
          budget: controlToLoad.budget,
        });
      }
      console.log("[ManageCMPage] fetchData: Successfully loaded context data.");
    } catch (error: any) {
      if (!isActive) return;
      const errorMessage = error.message || String(error);
      console.error("[ManageCMPage] Error in fetchData:", errorMessage);
      toast({ title: "Kesalahan Memuat Data Halaman", description: errorMessage, variant: "destructive" });
      if (isActive) router.push(returnPath); 
    } finally {
      if (isActive) setPageIsLoading(false);
      console.log("[ManageCMPage] fetchData: FINISHED, pageIsLoading set to", false);
    }
    return () => { isActive = false; };
  }, [
      controlMeasureIdParam, isCreatingNew, riskCauseIdQuery, potentialRiskIdQuery, goalIdQuery,
      currentUserId, currentPeriod, isProfileComplete, authLoading, profileLoading,
      reset, router, toast, returnPath // returnPath should be stable due to useMemo
  ]);

  useEffect(() => {
    let isActive = true;
    if (currentUserId && currentPeriod && isProfileComplete && !authLoading && !profileLoading) {
        console.log("[ManageCMPage] useEffect: Context ready, calling fetchData.");
        fetchData();
    } else if (!authLoading && !profileLoading && (!currentUserId || !currentPeriod || !isProfileComplete)) {
        console.warn("[ManageCMPage] useEffect: Context not ready, or profile incomplete. Not fetching.");
        if(isActive) setPageIsLoading(false); // Ensure loading stops if context not ready
    }
    return () => { isActive = false; };
  }, [fetchData, currentUserId, currentPeriod, isProfileComplete, authLoading, profileLoading]); // fetchData is now a dependency
  
  
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
      ...formData,
      deadline: formData.deadline ? formData.deadline.toISOString() : null,
      budget: formData.budget === null || isNaN(Number(formData.budget)) ? null : Number(formData.budget),
    };

    setIsSaving(true);
    let savedControl: ControlMeasure | null = null;
    try {
      if (isCreatingNew) {
        // Logic to get sequenceNumber from store or service
        const existingControls = await getControlMeasuresByRiskCauseId(parentRiskCause.id, currentUserId, currentPeriod);
        const sequenceNumber = (existingControls.filter(c => c.controlType === formData.controlType).length) + 1;
        
        savedControl = await addControlMeasure(
          controlDataForService,
          parentRiskCause.id,
          parentPotentialRisk.id,
          grandParentGoal.id,
          currentUserId,
          currentPeriod,
          sequenceNumber
        );
      } else if (currentControlMeasure && currentControlMeasure.id) {
        savedControl = await updateControlMeasureInService(currentControlMeasure.id, controlDataForService);
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
    const saved = await processSave(formData);
    if (saved) {
      toast({ title: isCreatingNew && submitActionType !== 'new' ? "Pengendalian Ditambahkan" : "Pengendalian Diperbarui", description: `Pengendalian "${formData.description}" telah disimpan.` });
      if (submitActionType === 'close' || !isCreatingNew) {
        router.push(returnPath);
      } else if (submitActionType === 'new' && isCreatingNew) { // Ensure this only happens when creating new
        reset({ controlType: 'Prv', description: "", keyControlIndicator: null, target: null, responsiblePerson: null, deadline: null, budget: null });
        // We need to ensure the next sequence number will be correct, refetching controls for the parent cause is good.
        if(parentRiskCause && currentUserId && currentPeriod) {
          // await store.fetchControlMeasures(currentUserId, currentPeriod, parentRiskCause.id); // If using store
          // For now, let's assume next add will correctly calculate sequence based on Firestore data
        }
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
        setAiControlSuggestions(result.data.suggestedControls);
        setIsAISuggestionsModalOpen(true);
      } else {
        toast({ title: "Kesalahan Saran AI", description: result.error || "Gagal mendapatkan saran pengendalian dari AI.", variant: "destructive" });
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      toast({ title: "Kesalahan AI", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAISuggestionsLoading(false);
    }
  };

  const handleApplyAISuggestion = (suggestion: AISuggestedControlMeasure) => {
    setValue('description', suggestion.description, { shouldValidate: true });
    setValue('controlType', suggestion.suggestedControlType, { shouldValidate: true });
    setIsAISuggestionsModalOpen(false);
  };

  if (authLoading || profileLoading || pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          {authLoading || profileLoading ? "Memuat data pengguna..." : "Memuat data tindakan pengendalian..."}
        </p>
      </div>
    );
  }
  
  if ((isCreatingNew && (!riskCauseIdQuery || !parentRiskCause || !parentPotentialRisk || !grandParentGoal)) || 
      (!isCreatingNew && (!currentControlMeasure || !parentRiskCause || !parentPotentialRisk || !grandParentGoal))) {
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Info className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl text-muted-foreground text-center">
          Konteks data induk untuk tindakan pengendalian tidak lengkap atau tidak ditemukan.<br/>
          Pastikan ID yang benar diteruskan atau data induk ada.
        </p>
         <Button onClick={() => router.push(returnPath)} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }
  
  const controlCodePrefix = parentRiskCause?.code 
    ? `${parentRiskCause.code}.${getValues("controlType")}` 
    : `${grandParentGoal?.code || 'S?'}.PR${parentPotentialRisk?.sequenceNumber || '?'}.PC${parentRiskCause?.sequenceNumber || '?'}.${getValues("controlType")}`;
  
  const pageTitle = isCreatingNew 
    ? "Tambah Tindakan Pengendalian Baru" 
    : `Edit Tindakan Pengendalian (${controlCodePrefix}.${currentControlMeasure?.sequenceNumber || '?'})`;
  
  const goalCodeForDisplay = grandParentGoal?.code || 'S?';
  const potentialRiskCodeForDisplay = `${goalCodeForDisplay}.PR${parentPotentialRisk?.sequenceNumber || '?'}`;
  const riskCauseCodeForDisplay = `${potentialRiskCodeForDisplay}.PC${parentRiskCause?.sequenceNumber || '?'}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        description={`UPR: ${uprDisplayName}, Periode: ${currentPeriod || '...'}.`}
        actions={
          <Button onClick={() => router.push(returnPath)} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Konteks Risiko</CardTitle>
          <CardDescription className="text-xs space-y-0.5">
            <p><strong>Sasaran ({goalCodeForDisplay}):</strong> {grandParentGoal?.name || 'Memuat...'}</p>
            <p><strong>Potensi Risiko ({potentialRiskCodeForDisplay}):</strong> {parentPotentialRisk?.description || 'Memuat...'}</p>
            <p><strong>Penyebab Risiko ({riskCauseCodeForDisplay}):</strong> {parentRiskCause?.description || 'Memuat...'}</p>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Detail Tindakan Pengendalian</CardTitle>
            <Button
                variant="outline"
                size="sm"
                onClick={handleGetAIControlSuggestions}
                disabled={isAISuggestionsLoading || !parentRiskCause || !parentPotentialRisk || !grandParentGoal || (parentRiskCause && (!parentRiskCause.likelihood || !parentRiskCause.impact))}
                className="text-xs"
            >
                {isAISuggestionsLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3 w-3" />} Brainstorm Kontrol (AI)
            </Button>
           </div>
            {parentRiskCause && (!parentRiskCause.likelihood || !parentRiskCause.impact) && (
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
                            fromDate={startOfToday()} // Prevent selecting past dates
                        />
                        </PopoverContent>
                    </Popover>
                    )}
                />
                {errors.deadline && <p className="text-xs text-destructive mt-1">{errors.deadline.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget">Anggaran (Rp)</Label>
                <Input
                  id="budget"
                  type="text" 
                  defaultValue={getValues("budget")?.toLocaleString('id-ID') || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(numericValue)) {
                      e.target.value = numericValue.toLocaleString('id-ID');
                      setValue("budget", numericValue, {shouldValidate: true});
                    } else if (value === "") {
                       e.target.value = "";
                       setValue("budget", null, {shouldValidate: true});
                    } else {
                        // If not a number and not empty, revert to previous valid number or empty
                        const currentBudget = getValues("budget");
                        e.target.value = currentBudget?.toLocaleString('id-ID') || "";
                    }
                  }}
                  onBlur={(e) => { // Ensure formatting on blur
                    const value = getValues("budget");
                    if (value !== null && value !== undefined) {
                        e.target.value = value.toLocaleString('id-ID');
                    } else {
                        e.target.value = "";
                    }
                  }}
                  placeholder="Contoh: 5.000.000"
                  className={errors.budget ? "border-destructive" : ""}
                  disabled={isSaving}
                />
                {errors.budget && <p className="text-xs text-destructive mt-1">{errors.budget.message}</p>}
              </div>
            </div>

            <div className="flex justify-end pt-4 space-x-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.push(returnPath)} 
                disabled={isSaving}
              >
                Batal / Tutup
              </Button>
              <Button 
                type="button" 
                onClick={() => { setSubmitActionType('close'); handleSubmit(handleFormSubmit)(); }}
                disabled={isSaving || !currentUser}
              >
                {isSaving && submitActionType === 'close' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isCreatingNew ? "Simpan & Tutup" : "Simpan Perubahan & Tutup"}
              </Button>
              {isCreatingNew && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => { setSubmitActionType('new'); handleSubmit(handleFormSubmit)(); }}
                  disabled={isSaving || !currentUser}
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
