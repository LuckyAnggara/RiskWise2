
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ControlMeasure, RiskCause, PotentialRisk, Goal, ControlMeasureTypeKey, AppUser } from '@/lib/types';
import { CONTROL_MEASURE_TYPE_KEYS, getControlTypeName, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP } from '@/lib/types'; // Removed getCalculatedRiskLevel as it's imported from risk-cause-analysis page
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Calendar as CalendarIcon, Wand2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { useAppStore } from '../../../stores/useAppStore'; // MODIFIED IMPORT PATH
import { getCalculatedRiskLevel, getRiskLevelColor, getControlGuidance } from '@/app/risk-cause-analysis/[riskCauseId]/page';
import { suggestControlMeasuresAction } from '@/app/actions';
import { ControlMeasureAISuggestionsModal } from '@/components/risks/control-measure-ai-suggestions-modal';


const controlMeasureFormSchema = z.object({
  controlType: z.custom<ControlMeasureTypeKey>((val) => CONTROL_MEASURE_TYPE_KEYS.includes(val as ControlMeasureTypeKey), {
    message: "Tipe pengendalian harus dipilih.",
  }),
  description: z.string().min(5, "Deskripsi pengendalian minimal 5 karakter."),
  keyControlIndicator: z.string().nullable(),
  target: z.string().nullable(),
  responsiblePerson: z.string().nullable(),
  deadline: z.date().nullable(),
  budget: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(String(val).replace(/[^0-9]/g, ''))),
    z.number().positive("Anggaran harus angka positif jika diisi.").nullable()
  ),
});

type ControlMeasureFormData = z.infer<typeof controlMeasureFormSchema>;

interface AISuggestedControl {
  description: string;
  suggestedControlType: ControlMeasureTypeKey;
  justification: string;
}


export default function ManageControlMeasurePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const store = useAppStore();
  const { currentUser, appUser, loading: authLoading, profileLoading, isProfileComplete } = useAuth();
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
  const [aiControlSuggestions, setAiControlSuggestions] = useState<AISuggestedControl[]>([]);
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

  const currentUserId = useMemo(() => appUser?.uid || null, [appUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);

  const returnPath = useMemo(() => {
    if (currentControlMeasure?.riskCauseId) return `/risk-cause-analysis/${currentControlMeasure.riskCauseId}`;
    if (riskCauseIdQuery) return `/risk-cause-analysis/${riskCauseIdQuery}`;
    // Fallback if coming from somewhere else or context is lost (should be rare)
    if (parentRiskCause?.id) return `/risk-cause-analysis/${parentRiskCause.id}`;
    return '/risk-analysis';
  }, [currentControlMeasure, riskCauseIdQuery, parentRiskCause]);


  const loadPageData = useCallback(async () => {
    let isActive = true;
    console.log(`[ManageCMPage] loadPageData called. isCreatingNew: ${isCreatingNew}, CM_ID: ${controlMeasureIdParam}, RC_ID: ${riskCauseIdQuery}, UserID: ${currentUserId}, Period: ${currentPeriod}`);
    setPageIsLoading(true);
    setCurrentControlMeasure(null);
    setParentRiskCause(null);
    setParentPotentialRisk(null);
    setGrandParentGoal(null);
    reset({ controlType: 'Prv', description: "", keyControlIndicator: "", target: "", responsiblePerson: "", deadline: null, budget: null });

    if (!currentUserId || !currentPeriod || !isProfileComplete || authLoading || profileLoading) {
      console.log("[ManageCMPage] Prerequisites not met for fetching data (auth, profile, context).");
      if (!authLoading && !profileLoading && (!currentUserId || !currentPeriod || !isProfileComplete)) {
        toast({ title: "Konteks Tidak Lengkap", description: "Sesi atau profil pengguna tidak lengkap untuk memuat halaman ini.", variant: "destructive" });
        router.push('/');
      }
      setPageIsLoading(false);
      return () => { isActive = false; };
    }

    try {
      let riskCauseForContext: RiskCause | null = null;
      let potentialRiskForContext: PotentialRisk | null = null;
      let goalForContext: Goal | null = null;
      let controlToLoad: ControlMeasure | null = null;

      if (isCreatingNew) {
        if (!riskCauseIdQuery || !potentialRiskIdQuery || !goalIdQuery) {
          throw new Error("ID Induk (Penyebab/Potensi/Sasaran) diperlukan untuk membuat pengendalian baru.");
        }
        riskCauseForContext = await store.getRiskCauseById(riskCauseIdQuery, currentUserId, currentPeriod);
        if (riskCauseForContext) {
          potentialRiskForContext = await store.getPotentialRiskById(riskCauseForContext.potentialRiskId, currentUserId, currentPeriod);
          if (potentialRiskForContext) {
            goalForContext = await store.getGoalById(potentialRiskForContext.goalId, currentUserId, currentPeriod);
          }
        }
        if (!riskCauseForContext || !potentialRiskForContext || !goalForContext) {
          throw new Error("Satu atau lebih data induk (Penyebab, Potensi Risiko, atau Sasaran) tidak ditemukan atau tidak cocok dengan konteks UPR/Periode Anda.");
        }
      } else { // Editing existing control measure
        controlToLoad = await store.getControlMeasureById(controlMeasureIdParam, currentUserId, currentPeriod);
        if (!controlToLoad) {
          throw new Error("Tindakan pengendalian tidak ditemukan atau tidak cocok dengan konteks UPR/Periode Anda.");
        }
        riskCauseForContext = await store.getRiskCauseById(controlToLoad.riskCauseId, currentUserId, currentPeriod);
        if (riskCauseForContext) {
          potentialRiskForContext = await store.getPotentialRiskById(controlToLoad.potentialRiskId, currentUserId, currentPeriod);
          if (potentialRiskForContext) {
            goalForContext = await store.getGoalById(controlToLoad.goalId, currentUserId, currentPeriod);
          }
        }
         if (!riskCauseForContext || !potentialRiskForContext || !goalForContext) {
          throw new Error("Data induk untuk tindakan pengendalian ini tidak ditemukan atau tidak cocok konteks.");
        }
      }
      
      if (!isActive) return;
      setCurrentControlMeasure(controlToLoad);
      setParentRiskCause(riskCauseForContext);
      setParentPotentialRisk(potentialRiskForContext);
      setGrandParentGoal(goalForContext);

      if (controlToLoad) {
        reset({
          controlType: controlToLoad.controlType,
          description: controlToLoad.description,
          keyControlIndicator: controlToLoad.keyControlIndicator || "",
          target: controlToLoad.target || "",
          responsiblePerson: controlToLoad.responsiblePerson || "",
          deadline: controlToLoad.deadline && isValidDate(parseISO(controlToLoad.deadline)) ? parseISO(controlToLoad.deadline) : null,
          budget: controlToLoad.budget,
        });
      }

    } catch (error: any) {
      if (!isActive) return;
      const errorMessage = error.message || String(error);
      console.error("[ManageCMPage] Error in loadPageData:", errorMessage);
      toast({ title: "Kesalahan Memuat Data Halaman", description: errorMessage, variant: "destructive" });
      router.push(returnPath); 
    } finally {
      if (isActive) setPageIsLoading(false);
    }
    return () => { isActive = false; };
  }, [
      controlMeasureIdParam, isCreatingNew, riskCauseIdQuery, potentialRiskIdQuery, goalIdQuery, 
      currentUserId, currentPeriod, isProfileComplete, authLoading, profileLoading, 
      store, reset, router, toast, returnPath // returnPath is stable due to useMemo
  ]);

  useEffect(() => {
    // Hanya jalankan jika semua dependensi penting ada
    if (currentUserId && currentPeriod && isProfileComplete && !authLoading && !profileLoading) {
      loadPageData();
    } else if (!authLoading && !profileLoading && (!currentUserId || !currentPeriod || !isProfileComplete)) {
      // Jika konteks belum siap setelah loading auth selesai, mungkin redirect atau tampilkan pesan error
      // Untuk sekarang, hanya set pageIsLoading false agar tidak stuck di loading screen
      setPageIsLoading(false);
    }
  }, [loadPageData, currentUserId, currentPeriod, isProfileComplete, authLoading, profileLoading]);
  
  const processSave = async (formData: ControlMeasureFormData): Promise<ControlMeasure | null> => {
    if (!currentUserId || !currentPeriod) {
      toast({ title: "Konteks Pengguna/Periode Hilang", description: "Tidak dapat menyimpan. Harap muat ulang.", variant: "destructive" });
      return null;
    }
    if (!parentRiskCause || !parentPotentialRisk || !grandParentGoal) {
      toast({ title: "Konteks Induk Hilang", description: "Tidak dapat menyimpan. Data induk (Penyebab/Potensi/Sasaran) tidak lengkap atau tidak ditemukan.", variant: "destructive" });
      return null;
    }

    const controlDataForService = {
      controlType: formData.controlType,
      description: formData.description,
      keyControlIndicator: formData.keyControlIndicator || null,
      target: formData.target || null,
      responsiblePerson: formData.responsiblePerson || null,
      deadline: formData.deadline ? formData.deadline.toISOString() : null,
      budget: formData.budget === null || isNaN(Number(formData.budget)) ? null : Number(formData.budget),
    };

    try {
      if (isCreatingNew) {
        const newControl = await store.addControlMeasure(
          controlDataForService,
          parentRiskCause.id,
          parentPotentialRisk.id,
          grandParentGoal.id,
          currentUserId,
          currentPeriod
        );
        // setCurrentControlMeasure(newControl); // Tidak perlu set di sini jika akan reset atau navigasi
        return newControl;
      } else if (currentControlMeasure && currentControlMeasure.id) {
        const updatedControl = await store.updateControlMeasure(currentControlMeasure.id, controlDataForService);
        setCurrentControlMeasure(updatedControl);
        return updatedControl;
      }
      return null;
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("Error saving control measure via store:", errorMessage);
      toast({ title: "Gagal Menyimpan Pengendalian", description: errorMessage, variant: "destructive" });
      return null;
    }
  };
  
  const onSubmitAndClose: SubmitHandler<ControlMeasureFormData> = async (formData) => {
    setIsSaving(true);
    const savedControl = await processSave(formData);
    setIsSaving(false);

    if (savedControl) {
      toast({ title: isCreatingNew ? "Pengendalian Ditambahkan" : "Pengendalian Diperbarui", description: `Pengendalian "${formData.description}" telah disimpan.` });
      router.push(returnPath);
    }
  };

  const onSubmitAndNew: SubmitHandler<ControlMeasureFormData> = async (formData) => {
    if (!isCreatingNew) return; // Hanya untuk mode pembuatan baru
    setIsSaving(true);
    const savedControl = await processSave(formData);
    setIsSaving(false);

    if (savedControl) {
      toast({ title: "Pengendalian Disimpan", description: `Pengendalian "${formData.description}" disimpan. Silakan input yang baru.` });
      reset({ controlType: 'Prv', description: "", keyControlIndicator: "", target: "", responsiblePerson: "", deadline: null, budget: null });
      // Optional: Refresh control measures for the current risk cause in the store if needed immediately for sequence numbering
      // await store.fetchControlMeasures(currentUserId!, currentPeriod!, parentRiskCause!.id);
    }
  };

  const handleGetAIControlSuggestions = async () => {
    if (!parentRiskCause || !parentPotentialRisk || !grandParentGoal || !currentUserId || !currentPeriod) {
      toast({ title: "Konteks Tidak Lengkap", description: "Data induk (Penyebab, Potensi Risiko, Sasaran) atau konteks pengguna/periode tidak tersedia untuk saran AI.", variant: "warning" });
      return;
    }
    
    const { level: riskCauseLevel } = getCalculatedRiskLevel(parentRiskCause.likelihood, parentRiskCause.impact);
    if (riskCauseLevel === 'N/A' || !parentRiskCause.likelihood || !parentRiskCause.impact) {
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
        riskCauseLevelText: riskCauseLevel,
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

  const handleApplyAISuggestion = (suggestion: AISuggestedControl) => {
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
  
  if ((isCreatingNew && (!parentRiskCause || !parentPotentialRisk || !grandParentGoal)) || 
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
  
  const pageTitle = isCreatingNew 
    ? "Tambah Tindakan Pengendalian Baru" 
    : `Edit Tindakan Pengendalian (${parentRiskCause?.code && currentControlMeasure?.controlType && currentControlMeasure?.sequenceNumber ? `${parentRiskCause.code}.${currentControlMeasure.controlType}.${currentControlMeasure.sequenceNumber}` : '...'})`;
  
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
          <form className="space-y-6">
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target">Target KCI</Label>
                <Input
                  id="target"
                  {...register("target")}
                  placeholder="Contoh: 100% pegawai mengikuti pelatihan"
                  disabled={isSaving}
                />
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
                        const currentBudget = getValues("budget");
                        e.target.value = currentBudget?.toLocaleString('id-ID') || "";
                    }
                  }}
                  onBlur={(e) => { 
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
                onClick={() => {
                  setSubmitActionType('close');
                  handleSubmit(onSubmitAndClose)();
                }} 
                disabled={isSaving || !currentUser}
              >
                {isSaving && submitActionType === 'close' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isCreatingNew ? "Simpan & Tutup" : "Simpan Perubahan & Tutup"}
              </Button>
              {isCreatingNew && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    setSubmitActionType('new');
                    handleSubmit(onSubmitAndNew)();
                  }} 
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

      {isAISuggestionsModalOpen && (
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
