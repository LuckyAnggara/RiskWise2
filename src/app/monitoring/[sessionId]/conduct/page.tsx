
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { RiskCause, ControlMeasure, MonitoringSession, RiskExposure, MonitoredRiskCauseView, MonitoringSessionStatus, MonitoredControlMeasureData } from '@/lib/types';
import { ArrowLeft, Loader2, Save, AlertTriangle, CheckCircle2, FileUp, Info, Wand2, PlayCircle, UploadCloud } from 'lucide-react';
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


const parseToleranceValue = (toleranceText: string | null): number | null => {
    if (!toleranceText) return null;
    const match = toleranceText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
};

interface ControlMonitoringFormState {
  realizationKCI: string;
  controlEffectivenessNotes: string;
  controlActivityNotes: string;
  supportingDocumentUrl: string;
  followUpPlan: string;
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
  
  // State for control monitoring inputs
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
      
      // Fetch all necessary data for this session
      // triggerGlobalDataFetch will ensure goals, PRs, RCs, CMs are loaded if not already for the context
      // We then need to specifically fetch exposures and monitored CM data for *this* session
      if(useAppStore.getState().dataFetchedForPeriod !== `${currentUserId}|${currentPeriod}` || riskCauses.length === 0){
          await triggerGlobalDataFetch(currentUserId, currentPeriod); // This will fetch base data including all control measures
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
            controlEffectivenessNotes: monitoredCtrlData?.controlEffectivenessNotes || "",
            controlActivityNotes: monitoredCtrlData?.controlActivityNotes || "",
            supportingDocumentUrl: monitoredCtrlData?.supportingDocumentUrl || "",
            followUpPlan: monitoredCtrlData?.followUpPlan || "",
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
  
  const handleControlMonitoringInputChange = (controlMeasureId: string, field: keyof ControlMonitoringFormState, value: string) => {
    setControlMonitoringFormValues(prev => ({
      ...prev,
      [controlMeasureId]: {
        ...(prev[controlMeasureId] || { realizationKCI: "", controlEffectivenessNotes: "", controlActivityNotes: "", supportingDocumentUrl: "", followUpPlan: "" }),
        [field]: value,
      }
    }));
  };

  const handleSaveControlMonitoring = async (controlMeasureId: string, riskCauseId: string) => {
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
    const mcmData = {
        monitoringSessionId: sessionId,
        riskCauseId: riskCauseId,
        controlMeasureId: controlMeasureId,
        realizationKCI: formData.realizationKCI || null,
        controlEffectivenessNotes: formData.controlEffectivenessNotes || null,
        controlActivityNotes: formData.controlActivityNotes || null,
        supportingDocumentUrl: formData.supportingDocumentUrl || null,
        followUpPlan: formData.followUpPlan || null,
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
        <Card><CardContent className="pt-6 text-center"><p className="text-muted-foreground">Tidak ada penyebab risiko untuk dipantau.</p></CardContent></Card>
      )}
      <div className="space-y-6">
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
            <Card key={cause.id}>
              <CardHeader>
                <CardTitle className="text-base">{cause.riskCauseCode} - {cause.description}</CardTitle>
                <CardDescription className="text-xs">Sumber: <Badge variant="outline">{cause.source}</Badge> | Potensi Risiko Induk: {cause.potentialRiskCode} - {cause.potentialRiskDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div><Label className="font-semibold">Tingkat Risiko Awal</Label><div><Badge className={`${getRiskLevelColor(currentRiskLevelText)}`}>{currentRiskLevelText === 'N/A' ? 'N/A' : `${currentRiskLevelText} (${currentRiskScore ?? 'N/A'})`}</Badge></div></div>
                  <div><Label className="font-semibold">KRI</Label><p className="text-muted-foreground">{cause.keyRiskIndicator || "-"}</p></div>
                  <div><Label className="font-semibold">Toleransi Risiko</Label><p className="text-muted-foreground">{cause.riskTolerance || "-"} {toleranceValue !== null ? `(Nilai: ${toleranceValue})` : ''}</p></div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-3">
                        <div><Label htmlFor={`exposureValue-${cause.id}`}>Realisasi KRI (Nilai Risiko yang Terjadi)</Label><Input id={`exposureValue-${cause.id}`} type="number" placeholder="Nilai numerik risiko yang terjadi" value={exposureValues[cause.id] ?? ''} onChange={(e) => handleExposureValueChange(cause.id, e.target.value)} disabled={savingStates[cause.id] || currentSession.status === 'Selesai'}/></div>
                        <div><Label htmlFor={`exposureNotes-${cause.id}`}>Catatan/Deskripsi Paparan Risiko</Label><Textarea id={`exposureNotes-${cause.id}`} placeholder="Jelaskan konteks paparan..." rows={2} value={exposureNotes[cause.id] ?? ''} onChange={(e) => handleExposureNotesChange(cause.id, e.target.value)} disabled={savingStates[cause.id] || currentSession.status === 'Selesai'}/></div>
                        <Button onClick={() => handleSaveExposure(cause.id)} disabled={savingStates[cause.id] || currentSession.status === 'Selesai'} size="sm">{savingStates[cause.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Simpan Paparan</Button>
                    </div>
                    {comparisonResultText && (<Alert variant={isExceeded ? "destructive" : "default"} className={isExceeded === false ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700" : ""}>{isExceeded ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}<AlertTitle className={isExceeded === false ? "text-green-800 dark:text-green-200" : ""}>{isExceeded ? "Risiko Melebihi Toleransi!" : "Risiko Terkendali"}</AlertTitle><AlertDescription className={isExceeded === false ? "text-green-700 dark:text-green-300" : ""}><p className="font-semibold">{comparisonResultText}</p><p className="mt-1">{guidanceText}</p></AlertDescription></Alert>)}
                </div>
                <Separator />
                <div>
                    <h4 className="text-sm font-semibold mb-3">Pemantauan Pelaksanaan Pengendalian Risiko</h4>
                    {cause.controls.length === 0 ? (<p className="text-xs text-muted-foreground italic">Belum ada rencana pengendalian yang disusun untuk penyebab risiko ini.</p>) :
                     (<div className="space-y-6">
                        {cause.controls.map(ctrl => {
                           const controlCode = `${cause.riskCauseCode}.${ctrl.controlType}.${ctrl.sequenceNumber}`;
                           const formState = controlMonitoringFormValues[ctrl.id] || { realizationKCI: "", controlEffectivenessNotes: "", controlActivityNotes: "", supportingDocumentUrl: "", followUpPlan: ""};
                           return (
                            <Card key={ctrl.id} className="bg-muted/30">
                                <CardHeader className="pb-3 pt-4">
                                    <CardTitle className="text-sm">{controlCode} - {getControlTypeName(ctrl.controlType)}: {ctrl.description}</CardTitle>
                                    <CardDescription className="text-xs">Target KCI: {ctrl.target || "-"} | PJ: {ctrl.responsiblePerson || "-"} | Deadline: {ctrl.deadline ? format(parseISO(ctrl.deadline), "dd/MM/yy") : "-"} | Anggaran: Rp{ctrl.budget?.toLocaleString('id-ID') || "0"}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs">
                                    <div><Label htmlFor={`realizationKCI-${ctrl.id}`}>Realisasi KCI</Label><Textarea id={`realizationKCI-${ctrl.id}`} rows={2} placeholder="Catat realisasi KCI..." value={formState.realizationKCI} onChange={e => handleControlMonitoringInputChange(ctrl.id, 'realizationKCI', e.target.value)} disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'} /></div>
                                    <div><Label htmlFor={`effectivenessNotes-${ctrl.id}`}>Catatan Efektivitas Kontrol</Label><Textarea id={`effectivenessNotes-${ctrl.id}`} rows={2} placeholder="Jelaskan efektivitas kontrol..." value={formState.controlEffectivenessNotes} onChange={e => handleControlMonitoringInputChange(ctrl.id, 'controlEffectivenessNotes', e.target.value)} disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'}/></div>
                                    <div><Label htmlFor={`activityNotes-${ctrl.id}`}>Catatan Aktivitas Pengendalian</Label><Textarea id={`activityNotes-${ctrl.id}`} rows={2} placeholder="Catat detail pelaksanaan kontrol..." value={formState.controlActivityNotes} onChange={e => handleControlMonitoringInputChange(ctrl.id, 'controlActivityNotes', e.target.value)} disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'}/></div>
                                    <div><Label htmlFor={`docUrl-${ctrl.id}`}>URL Data Dukung</Label><Input id={`docUrl-${ctrl.id}`} placeholder="https://linkdokumen.com/..." value={formState.supportingDocumentUrl} onChange={e => handleControlMonitoringInputChange(ctrl.id, 'supportingDocumentUrl', e.target.value)} disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'} /></div>
                                    <div><Label htmlFor={`followUp-${ctrl.id}`}>Rencana Tindak Lanjut</Label><Textarea id={`followUp-${ctrl.id}`} rows={2} placeholder="Jika ada temuan, catat rencana tindak lanjut..." value={formState.followUpPlan} onChange={e => handleControlMonitoringInputChange(ctrl.id, 'followUpPlan', e.target.value)} disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'}/></div>
                                    <Button size="xs" onClick={() => handleSaveControlMonitoring(ctrl.id, cause.id)} disabled={controlSavingStates[ctrl.id] || currentSession.status === 'Selesai'}>{controlSavingStates[ctrl.id] ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : <Save className="mr-1 h-3 w-3"/>}Simpan Pemantauan Kontrol</Button>
                                </CardContent>
                            </Card>
                           );
                        })}
                     </div>)
                    }
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {currentSession.status !== 'Selesai' && monitoredCausesWithControls.length > 0 && (
        <div className="mt-8 flex justify-end">
          <Button onClick={handleCompleteMonitoring} variant="default" size="lg"><CheckCircle2 className="mr-2 h-5 w-5" /> Selesaikan Sesi Pemantauan Ini</Button>
        </div>
      )}
    </div>
  );
}

    