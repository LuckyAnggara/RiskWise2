
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription,CardFooter } from '@/components/ui/card';
import type { RiskCause, ControlMeasure, MonitoringSession, RiskExposure, MonitoredRiskCauseView, MonitoringSessionStatus, MonitoredControlMeasureData } from '@/lib/types';
import { ArrowLeft, Loader2, Save, AlertTriangle, CheckCircle2, FileUp, Info, Wand2, PlayCircle, UploadCloud, CornerRightDown, FileText } from 'lucide-react';
import { getCalculatedRiskLevel, getRiskLevelColor, getControlTypeName } from  '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { getMonitoringSessionById as getMonitoringSessionByIdFromService } from '@/services/monitoringService'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const parseToleranceValue = (toleranceText: string | null): number | null => {
    if (!toleranceText) return null;
    const match = toleranceText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
};

const parseNumericValue = (text: string | null | undefined): number | null => {
  if (text === null || text === undefined || typeof text !== 'string') return null;
  const cleanedText = text.replace(/[^0-9.,]/g, '').replace(',', '.'); 
  const num = parseFloat(cleanedText);
  return isNaN(num) ? null : num;
};

const calculateControlPerformance = (
  realizationKCI: string | null | undefined, 
  targetKCI: string | null | undefined, 
  isTargetNegative: boolean | null | undefined
): number | null => {
  const realizationValue = parseNumericValue(realizationKCI);
  const targetValue = parseNumericValue(targetKCI);

  if (realizationValue === null || targetValue === null) return null;
  
  // Handle target 0 for positive target: if realization is > 0, it's 100% "over", if 0, it's 100% "met", if <0 it's <100%
  // This simplistic model might need refinement based on business logic for target 0.
  // For now, if target is 0 and non-negative, any positive realization is "good" (100%) or more.
  // If target is 0 and negative, any non-zero realization is "bad" (0% or negative performance).
  if (targetValue === 0) {
    if (!isTargetNegative) { // Target 0, positive direction (e.g., achieve at least 0 defects)
      return realizationValue <= 0 ? 100 : (100 - (realizationValue * 100)); // simplistic, needs review for "0 target" logic
    } else { // Target 0, negative direction (e.g., maintain 0 incidents)
      return realizationValue === 0 ? 100 : 0; // if realization is > 0, performance is 0%
    }
  }


  let performance: number;
  if (isTargetNegative) { // Target is to keep value low (e.g. incidents, complaints)
    // If realization is less than or equal to target, performance is 100% or more.
    // If realization is greater than target, performance is less than 100%.
    performance = ((2 * targetValue) - realizationValue) / targetValue * 100;

  } else { // Target is to achieve a high value (e.g. sales, completion)
    performance = (realizationValue / targetValue) * 100;
  }
  return parseFloat(performance.toFixed(2)); 
};


interface ControlMonitoringFormState {
  realizationKCI: string;
  isTargetNegative: boolean;
  controlActivityNarrative: string;
  supportingDocumentUrl: string;
  selectedFileName: string;
}

export default function ConductMonitoringPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  
  const store = useAppStore();
  const { 
    getMonitoringSessionByIdFromState, 
    riskCauses, 
    controlMeasures,
    riskCausesLoading,
    controlMeasuresLoading,
    riskExposures,
    fetchRiskExposuresForSession,
    riskExposuresLoading,
    monitoredControlMeasuresData,
    fetchMonitoredControlMeasuresForSession,
    monitoredControlMeasuresLoading,
    upsertRiskExposureInState,
    upsertMonitoredControlMeasureInState,
    updateMonitoringSessionStatusInState,
    triggerGlobalDataFetch,
  } = store;

  const sessionId = params.sessionId as string;

  const [currentSession, setCurrentSession] = useState<MonitoringSession | null>(null);
  const [monitoredCausesWithControls, setMonitoredCausesWithControls] = useState<Array<MonitoredRiskCauseView & { controls: ControlMeasure[] }>>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({}); 
  const [controlSavingStates, setControlSavingStates] = useState<Record<string, boolean>>({});


  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || "UPR Pengguna", [appUser]);

  const [exposureValues, setExposureValues] = useState<Record<string, string | number>>({});
  const [exposureNotes, setExposureNotes] = useState<Record<string, string>>({});
  
  const [controlMonitoringFormValues, setControlMonitoringFormValues] = useState<Record<string, ControlMonitoringFormState>>({});


  const loadInitialData = useCallback(async () => {
    if (!sessionId || !currentUserId || !currentPeriod) {
      setPageLoading(false);
      return;
    }
    setPageLoading(true);

    try {
      let session = getMonitoringSessionByIdFromState(sessionId);
      if (!session) {
        const sessionFromService = await getMonitoringSessionByIdFromService(sessionId,currentUserId, currentPeriod );
        if(sessionFromService) session = sessionFromService;
      }
      
      if (!session) {
        toast({ title: "Sesi Pemantauan Tidak Ditemukan", description: `Sesi dengan ID ${sessionId} tidak ditemukan.`, variant: "destructive" });
        router.push("/monitoring");
        return;
      }
      setCurrentSession(session);

      if (session.status === 'Direncanakan') {
        const updatedSession = await updateMonitoringSessionStatusInState(sessionId, 'Aktif');
        if (updatedSession) setCurrentSession(updatedSession);
      }
      
      if(useAppStore.getState().dataFetchedForPeriod !== `${currentUserId}|${currentPeriod}` || riskCauses.length === 0){
          await triggerGlobalDataFetch(currentUserId, currentPeriod); 
      }
      await fetchRiskExposuresForSession(sessionId, currentUserId, currentPeriod);
      await fetchMonitoredControlMeasuresForSession(sessionId, currentUserId, currentPeriod);

    } catch (error: any) {
      toast({ title: "Gagal Memuat Data Sesi", description: error.message || String(error), variant: "destructive" });
    } finally {
      setPageLoading(false);
    }
  }, [sessionId, currentUserId, currentPeriod, getMonitoringSessionByIdFromState, updateMonitoringSessionStatusInState, toast, router, triggerGlobalDataFetch, fetchRiskExposuresForSession, fetchMonitoredControlMeasuresForSession, riskCauses.length]);

  useEffect(() => {
    if (!authLoading && currentUser && isProfileComplete && currentUserId && currentPeriod) {
        loadInitialData();
    } else if (!authLoading && (!currentUser || !isProfileComplete)) {
        router.push(currentUser ? '/settings' : '/login');
    }
  }, [authLoading, currentUser, isProfileComplete, currentUserId, currentPeriod, loadInitialData, router]);

  useEffect(() => {
    if (currentSession && riskCauses.length > 0 && controlMeasures.length >= 0) {
      const causesToDisplay = riskCauses
        .filter(rc => currentSession.riskCauseIdsToMonitor.includes(rc.id))
        .map(rc => {
          const exposure = riskExposures.find(re => re.riskCauseId === rc.id && re.monitoringSessionId === currentSession.id);
          const potentialRisk = store.potentialRisks.find(pr => pr.id === rc.potentialRiskId);
          const goal = potentialRisk ? store.goals.find(g => g.id === potentialRisk.goalId) : undefined;
          const relevantControls = controlMeasures.filter(cm => cm.riskCauseId === rc.id && cm.userId === currentUserId && cm.period === currentPeriod);
          
          return {
            ...rc,
            potentialRiskDescription: potentialRisk?.description || "N/A",
            goalCode: goal?.code || "N/A",
            potentialRiskCode: `${goal?.code || 'S?'}.PR${potentialRisk?.sequenceNumber || '?'}`,
            riskCauseCode: `${goal?.code || 'S?'}.PR${potentialRisk?.sequenceNumber || '?'}.PC${rc.sequenceNumber || '?'}`,
            riskExposure: exposure || null,
            controls: relevantControls,
          };
        })
        .sort((a,b) => a.riskCauseCode.localeCompare(b.riskCauseCode, undefined, {numeric: true, sensitivity: 'base'}));
        
      setMonitoredCausesWithControls(causesToDisplay);

      const initialExposureValues: Record<string, string | number> = {};
      const initialExposureNotes: Record<string, string> = {};
      const initialControlFormValues: Record<string, ControlMonitoringFormState> = {};

      causesToDisplay.forEach(mc => {
        if (mc.riskExposure) {
          initialExposureValues[mc.id] = mc.riskExposure.exposureValue !== null ? mc.riskExposure.exposureValue : '';
          initialExposureNotes[mc.id] = mc.riskExposure.exposureNotes || '';
        } else {
          initialExposureValues[mc.id] = '';
          initialExposureNotes[mc.id] = '';
        }
        mc.controls.forEach(ctrl => {
          const monitoredCtrlData = monitoredControlMeasuresData.find(mcmd => mcmd.controlMeasureId === ctrl.id && mcmd.monitoringSessionId === currentSession.id);
          initialControlFormValues[ctrl.id] = {
            realizationKCI: monitoredCtrlData?.realizationKCI || "",
            isTargetNegative: monitoredCtrlData?.isTargetNegative || false,
            controlActivityNarrative: monitoredCtrlData?.controlActivityNarrative || "",
            supportingDocumentUrl: monitoredCtrlData?.supportingDocumentUrl || "",
            selectedFileName: "" 
          };
        });
      });
      setExposureValues(initialExposureValues);
      setExposureNotes(initialExposureNotes);
      setControlMonitoringFormValues(initialControlFormValues);
    }
  }, [currentSession, riskCauses, controlMeasures, riskExposures, monitoredControlMeasuresData, store.potentialRisks, store.goals, currentUserId, currentPeriod]);


  const handleExposureValueChange = (riskCauseId: string, value: string) => {
    setExposureValues(prev => ({ ...prev, [riskCauseId]: value }));
  };

  const handleExposureNotesChange = (riskCauseId: string, value: string) => {
    setExposureNotes(prev => ({ ...prev, [riskCauseId]: value }));
  };

  const handleSaveExposure = async (riskCauseId: string) => {
    if (!currentSession || !currentUserId || !currentPeriod) {
      toast({ title: "Konteks Tidak Lengkap", variant: "destructive" });
      return;
    }
    setSavingStates(prev => ({ ...prev, [riskCauseId]: true }));
    const exposureValueStr = String(exposureValues[riskCauseId]);
    const exposureValueNum = exposureValueStr !== '' ? parseFloat(exposureValueStr) : null;

    if (exposureValueStr !== '' && (isNaN(Number(exposureValueNum)) || exposureValueNum === null)) {
        toast({ title: "Input Tidak Valid", description: "Nilai risiko yang terjadi harus berupa angka.", variant: "destructive" });
        setSavingStates(prev => ({ ...prev, [riskCauseId]: false }));
        return;
    }
    const notes = exposureNotes[riskCauseId] || null;
    const exposureData = { monitoringSessionId: sessionId, riskCauseId, exposureValue: exposureValueNum, exposureNotes: notes };

    try {
      await upsertRiskExposureInState(exposureData, currentUserId, currentPeriod);
      toast({ title: "Data Paparan Disimpan" });
    } catch (error: any) {
      toast({ title: "Gagal Menyimpan Paparan", description: error.message || String(error), variant: "destructive" });
    } finally {
      setSavingStates(prev => ({ ...prev, [riskCauseId]: false }));
    }
  };
  
  const handleControlMonitoringInputChange = (controlMeasureId: string, field: keyof ControlMonitoringFormState, value: string | boolean | File | null) => {
    if (field === 'selectedFileName' && value instanceof File) {
        setControlMonitoringFormValues(prev => ({
            ...prev,
            [controlMeasureId]: {
                ...(prev[controlMeasureId] || { realizationKCI: "", isTargetNegative: false, controlActivityNarrative: "", supportingDocumentUrl: "", selectedFileName: "" }),
                selectedFileName: value.name, 
            }
        }));
    } else if (typeof value === 'string' || typeof value === 'boolean') {
        setControlMonitoringFormValues(prev => ({
        ...prev,
        [controlMeasureId]: {
            ...(prev[controlMeasureId] || { realizationKCI: "", isTargetNegative: false, controlActivityNarrative: "", supportingDocumentUrl: "", selectedFileName: "" }),
            [field]: value,
        }
        }));
    }
  };

  const handleSaveControlMonitoring = async (controlMeasureId: string, riskCauseId: string, targetKCI: string | null) => {
    if (!currentSession || !currentUserId || !currentPeriod) {
      toast({ title: "Konteks Tidak Lengkap", variant: "destructive" });
      return;
    }
    setControlSavingStates(prev => ({...prev, [controlMeasureId]: true}));
    const formData = controlMonitoringFormValues[controlMeasureId];
    if (!formData) {
        toast({ title: "Data Form Tidak Ditemukan", variant: "destructive"});
        setControlSavingStates(prev => ({...prev, [controlMeasureId]: false}));
        return;
    }

    const performance = calculateControlPerformance(formData.realizationKCI, targetKCI, formData.isTargetNegative);
    const mcmData: Omit<MonitoredControlMeasureData, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period'> = {
        monitoringSessionId: sessionId,
        riskCauseId: riskCauseId,
        controlMeasureId: controlMeasureId,
        realizationKCI: formData.realizationKCI || null,
        isTargetNegative: formData.isTargetNegative,
        controlPerformance: performance,
        controlActivityNarrative: formData.controlActivityNarrative || null,
        supportingDocumentUrl: formData.supportingDocumentUrl || null, 
    };
    try {
        await upsertMonitoredControlMeasureInState(mcmData, currentUserId, currentPeriod);
        toast({ title: "Data Pemantauan Kontrol Disimpan" });
    } catch (error: any) {
        toast({ title: "Gagal Simpan Pemantauan Kontrol", description: error.message || String(error), variant: "destructive" });
    } finally {
        setControlSavingStates(prev => ({...prev, [controlMeasureId]: false}));
    }
  };

  const handleCompleteMonitoring = async () => {
    if (!currentSession) return;
    try {
      const updatedSession = await updateMonitoringSessionStatusInState(currentSession.id, 'Selesai');
      if (updatedSession) setCurrentSession(updatedSession);
      toast({ title: "Sesi Pemantauan Selesai"});
      router.push('/monitoring');
    } catch (error: any) {
      toast({ title: "Gagal Menyelesaikan Sesi", description: error.message || String(error), variant: "destructive" });
    }
  };


  if (authLoading || pageLoading || riskCausesLoading || controlMeasuresLoading || riskExposuresLoading || monitoredControlMeasuresLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          {authLoading ? "Memuat data pengguna..." : "Memuat data sesi pemantauan..."}
        </p>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Sesi pemantauan tidak ditemukan.</p>
        <Link href="/monitoring"><Button variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Button></Link>
      </div>
    );
  }
   return (
    <div className="space-y-6">
      <PageHeader
        title={`Pelaksanaan Pemantauan: ${currentSession.name}`}
        description={`UPR: ${uprDisplayName}, Periode Sesi: ${format(parseISO(currentSession.startDate), "dd MMM yyyy", { locale: localeID })} - ${format(parseISO(currentSession.endDate), "dd MMM yyyy", { locale: localeID })}. Status: ${currentSession.status}`}
        actions={
          <Link href="/monitoring" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button></Link>
        }
      />
      {monitoredCausesWithControls.length === 0 && (
        <Card><CardContent className="pt-6 text-center"><p className="text-muted-foreground">Tidak ada penyebab risiko untuk dipantau dalam sesi ini.</p></CardContent></Card>
      )}
      <Accordion type="multiple" className="w-full space-y-4">
        { monitoredCausesWithControls.map((cause) => {
          const { level: currentRiskLevelText, score: currentRiskScore } = getCalculatedRiskLevel(cause.likelihood, cause.impact);
          const toleranceValue = parseToleranceValue(cause.riskTolerance);
          const exposureValueNum = exposureValues[cause.id] !== '' && exposureValues[cause.id] !== undefined ? Number(exposureValues[cause.id]) : null;
          let comparisonResultText = "";
          let guidanceText = "";
          let isExceeded: boolean | null = null;

          if (exposureValueNum !== null && toleranceValue !== null) {
            const difference = exposureValueNum - toleranceValue;
            if (difference >= 0) { 
              isExceeded = true;
              comparisonResultText = `Paparan (${exposureValueNum}) >= Toleransi (${toleranceValue}). Hasil: +${difference}. Potensi Risiko Telah Menjadi Risiko Aktual.`;
              guidanceText = "Segera lakukan tindakan pengendalian (Risk Mitigation) dan susun/perbaiki Tindakan Korektif (Corrective Action).";
            } else {
              isExceeded = false;
              comparisonResultText = `Paparan (${exposureValueNum}) < Toleransi (${toleranceValue}). Hasil: ${difference}. Pengendalian Preventif Berjalan Baik.`;
              guidanceText = "Lakukan pengendalian risiko sesuai rencana. Tinjau dan perbaiki rencana pengendalian jika diperlukan.";
            }
          }
          return (
            <AccordionItem key={cause.id} value={cause.id} className="border rounded-lg shadow-lg bg-card">
              <AccordionTrigger className="p-4 hover:no-underline rounded-t-lg data-[state=open]:rounded-b-none data-[state=open]:border-b">
                <div className="flex-1 text-left space-y-1">
                  <CardTitle className="text-base">{cause.riskCauseCode} - {cause.description}</CardTitle>
                  <CardDescription className="text-xs space-y-0.5">
                    <div>Sumber: <Badge variant="outline" className="text-xs">{cause.source}</Badge> | Potensi Risiko Induk: {cause.potentialRiskCode} - {cause.potentialRiskDescription}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs pt-1">
                      <div><span className="font-medium">Tingkat Risiko Awal:</span> <Badge className={`${getRiskLevelColor(currentRiskLevelText)} text-xs`}>{currentRiskLevelText === 'N/A' ? 'N/A' : `${currentRiskLevelText} (${currentRiskScore ?? 'N/A'})`}</Badge></div>
                      <div><span className="font-medium">KRI:</span> <span className="text-muted-foreground">{cause.keyRiskIndicator || "-"}</span></div>
                      <div><span className="font-medium">Toleransi:</span> <span className="text-muted-foreground">{cause.riskTolerance || "-"} {toleranceValue !== null ? `(Nilai: ${toleranceValue})` : ''}</span></div>
                    </div>
                  </CardDescription>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-4">
                    <div className="space-y-3">
                        <div><Label htmlFor={`exposureValue-${cause.id}`}>Realisasi KRI (Nilai Risiko yang Terjadi)</Label><Input id={`exposureValue-${cause.id}`} type="number" placeholder="Nilai numerik risiko yang terjadi" value={exposureValues[cause.id] ?? ''} onChange={(e) => handleExposureValueChange(cause.id, e.target.value)} disabled={savingStates[cause.id] || currentSession.status === 'Selesai'}/></div>
                        <div><Label htmlFor={`exposureNotes-${cause.id}`}>Catatan/Deskripsi Paparan Risiko</Label><Textarea id={`exposureNotes-${cause.id}`} placeholder="Jelaskan konteks paparan..." rows={2} value={exposureNotes[cause.id] ?? ''} onChange={(e) => handleExposureNotesChange(cause.id, e.target.value)} disabled={savingStates[cause.id] || currentSession.status === 'Selesai'}/></div>
                        <Button onClick={() => handleSaveExposure(cause.id)} disabled={savingStates[cause.id] || currentSession.status === 'Selesai'} size="sm">{savingStates[cause.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Simpan Paparan</Button>
                    </div>
                    {comparisonResultText && (<Alert variant={isExceeded ? "destructive" : "default"} className={isExceeded === false ? "bg-green-50 dark:bg-green-500/30 border-green-200 dark:border-green-700" : ""}>{isExceeded ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}<AlertTitle className={isExceeded === false ? "text-green-800 dark:text-green-200" : ""}>{isExceeded ? "Risiko Melebihi Toleransi!" : "Risiko Terkendali"}</AlertTitle><AlertDescription className={isExceeded === false ? "text-green-700 dark:text-green-300" : ""}><p className="font-semibold">{comparisonResultText}</p><p className="mt-1">{guidanceText}</p></AlertDescription></Alert>)}
                </div>
                <Separator className="my-6" />
                <div>
                    <h4 className="text-sm font-semibold mb-3">Pemantauan Pelaksanaan Pengendalian Risiko ({cause.controls.length} Kontrol)</h4>
                    {cause.controls.length === 0 ? (<p className="text-xs text-muted-foreground italic">Belum ada rencana pengendalian yang disusun untuk penyebab risiko ini.</p>) :
                     (<div className="flex overflow-x-auto space-x-4 pb-2 -mx-1 px-1">
                        {cause.controls.map((ctrl, index) => {
                           const controlCode = `${cause.riskCauseCode}.${ctrl.controlType}.${ctrl.sequenceNumber}`;
                           const formState = controlMonitoringFormValues[ctrl.id] || { realizationKCI: "", isTargetNegative: false, controlActivityNarrative: "", supportingDocumentUrl: "", selectedFileName: ""};
                           const calculatedPerformance = calculateControlPerformance(formState.realizationKCI, ctrl.target, formState.isTargetNegative);
                           const performanceTooltipText = formState.isTargetNegative 
                             ? `Target Negatif. Rumus: ((2 * Target - Realisasi) / Target) * 100%. Target: ${ctrl.target || 'N/A'}. Realisasi: ${formState.realizationKCI || 'N/A'}`
                             : `Target Positif. Rumus: (Realisasi / Target) * 100%. Target: ${ctrl.target || 'N/A'}. Realisasi: ${formState.realizationKCI || 'N/A'}`;
                           const isMonitored = monitoredControlMeasuresData.some(
                              (mcmd) => mcmd.controlMeasureId === ctrl.id && mcmd.monitoringSessionId === currentSession.id
                           );

                           return (
                            <Card key={ctrl.id} className="min-w-[320px] sm:min-w-[360px] max-w-md w-full lg:w-1/3 flex-shrink-0 shadow-md flex flex-col">
                                <CardHeader className="pb-3 pt-4 bg-muted/50 dark:bg-slate-800 rounded-t-md min-h-[100px]">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-sm flex items-center">
                                            {isMonitored && <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />} 
                                            ({index + 1}) {controlCode} - {getControlTypeName(ctrl.controlType)}
                                        </CardTitle>
                                        {/* Optionally, show KCI/Target in header if space allows, or performance if calculated */}
                                    </div>
                                    <CardDescription className="text-muted-foreground text-xs line-clamp-2" title={ctrl.description}>{ctrl.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs pt-3 flex-grow">
                                    <div className='text-xs flex flex-row space-x-2'>
                                        <p><span className="font-medium">KCI Pengendalian:</span></p>
                                        <p className="text-muted-foreground">{ctrl.keyControlIndicator || "-"}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-3">
                                        <div><Label className="font-medium">Target KCI</Label><p className="text-muted-foreground text-xs">{ctrl.target || "-"}</p></div>
                                        <div><Label htmlFor={`realizationKCI-${ctrl.id}`}>Realisasi KCI</Label><Input id={`realizationKCI-${ctrl.id}`} type="text" placeholder="Realisasi (angka)" value={formState.realizationKCI} onChange={e => handleControlMonitoringInputChange(ctrl.id, 'realizationKCI', e.target.value)} disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'} className="h-8 text-xs mt-0.5" /></div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id={`isTargetNegative-${ctrl.id}`} checked={formState.isTargetNegative} onCheckedChange={(checked) => handleControlMonitoringInputChange(ctrl.id, 'isTargetNegative', Boolean(checked))} disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'} />
                                        <Label htmlFor={`isTargetNegative-${ctrl.id}`} className="text-xs font-normal">Target Negatif (makin rendah realisasi, makin baik)</Label>
                                    </div>
                                    <div>
                                        <Label className="flex items-center">Kinerja Pengendalian Risiko (%)
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 p-0"><Info className="h-3 w-3 text-muted-foreground"/></Button>
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="max-w-xs text-xs p-2">
                                                <p>{performanceTooltipText}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </Label>
                                        <Input readOnly value={calculatedPerformance !== null ? `${calculatedPerformance}%` : "N/A"} className="h-8 text-xs bg-muted/50 mt-0.5" />
                                    </div>
                                    <div><Label htmlFor={`narrative-${ctrl.id}`}>Keterangan Kegiatan Pengendalian</Label><Textarea id={`narrative-${ctrl.id}`} rows={2} placeholder="Narasi singkat kegiatan..." value={formState.controlActivityNarrative} onChange={e => handleControlMonitoringInputChange(ctrl.id, 'controlActivityNarrative', e.target.value)} disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'} className="text-xs"/></div>
                                    <div>
                                        <Label htmlFor={`docFile-${ctrl.id}`}>Data Dukung (Opsional)</Label>
                                        <div className="flex items-center space-x-2 mt-0.5">
                                          <Input id={`docFile-${ctrl.id}`} type="file" onChange={e => handleControlMonitoringInputChange(ctrl.id, 'selectedFileName', e.target.files ? e.target.files[0] : null)} className="text-xs h-8 flex-grow" disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'}/>
                                        </div>
                                        {formState.selectedFileName && <p className="text-xs text-muted-foreground mt-1">File terpilih: {formState.selectedFileName}</p>}
                                        <div className="text-xs text-muted-foreground mt-1 flex items-center"><CornerRightDown className="h-3 w-3 mr-1"/>atau URL:</div>
                                        <Input id={`docUrl-${ctrl.id}`} placeholder="https://linkdokumen.com/..." value={formState.supportingDocumentUrl} onChange={e => handleControlMonitoringInputChange(ctrl.id, 'supportingDocumentUrl', e.target.value)} disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'} className="h-8 text-xs mt-0.5"/>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">(Fitur upload file akan dikembangkan. Saat ini, simpan file di cloud storage Anda dan paste link di sini).</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-2 pb-3">
                                     <Button size="sm" onClick={() => handleSaveControlMonitoring(ctrl.id, cause.id, ctrl.target)} disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'} className="w-full">
                                        {controlSavingStates[ctrl.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                        Simpan Monitor Kontrol
                                    </Button>
                                </CardFooter>
                            </Card>
                           );
                        })}
                     </div>)
                    }
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
      {currentSession.status !== 'Selesai' && monitoredCausesWithControls.length > 0 && (
        <div className="mt-8 flex justify-end">
          <Button onClick={handleCompleteMonitoring} variant="default" size="lg"><CheckCircle2 className="mr-2 h-5 w-5" /> Selesaikan Sesi Pemantauan Ini</Button>
        </div>
      )}
    </div>
  );
}

