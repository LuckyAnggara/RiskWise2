
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
import type { RiskCause, MonitoringSession, RiskExposure, MonitoredRiskCauseView, MonitoringSessionStatus } from '@/lib/types';
import { ArrowLeft, Loader2, Save, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { getCalculatedRiskLevel, getRiskLevelColor, getControlGuidance } from '@/app/risk-cause-analysis/[riskCauseId]/page';
import { Separator } from '@/components/ui/separator';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

const parseToleranceValue = (toleranceText: string | null): number | null => {
    if (!toleranceText) return null;
    const match = toleranceText.match(/(\d+([.,]\d+)?)/); // Handles integers and decimals
    return match ? parseFloat(match[1].replace(',', '.')) : null;
};

export default function ConductMonitoringPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  
  const store = useAppStore();
  const { 
    getMonitoringSessionById, 
    riskCauses: allRiskCausesFromStore, 
    fetchRiskCauses, 
    riskCausesLoading,
    riskExposures,
    fetchRiskExposuresForSession,
    riskExposuresLoading,
    upsertRiskExposureInState,
    updateMonitoringSessionStatusInState,
  } = store;

  const sessionId = params.sessionId as string;

  const [currentSession, setCurrentSession] = useState<MonitoringSession | null>(null);
  const [monitoredCauses, setMonitoredCauses] = useState<MonitoredRiskCauseView[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({}); 

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || "UPR Pengguna", [appUser]);

  const [exposureValues, setExposureValues] = useState<Record<string, string>>({});
  const [exposureNotes, setExposureNotes] = useState<Record<string, string>>({});

  const loadInitialData = useCallback(async () => {
    if (!sessionId || !currentUserId || !currentPeriod) {
      console.log("[ConductMonitoringPage] Missing session/user context for loading.");
      setPageIsLoading(false);
      return;
    }
    setPageIsLoading(true);
    console.log(`[ConductMonitoringPage] Loading data for session: ${sessionId}, User: ${currentUserId}, Period: ${currentPeriod}`);

    try {
      let session = await getMonitoringSessionById(sessionId, currentUserId, currentPeriod);
      
      if (!session) {
        toast({ title: "Sesi Pemantauan Tidak Ditemukan", description: `Sesi dengan ID ${sessionId} tidak ditemukan atau tidak cocok konteks.`, variant: "destructive" });
        router.push("/monitoring");
        setPageIsLoading(false);
        return;
      }
      setCurrentSession(session);

      if (session.status === 'Direncanakan') {
        const updatedSession = await updateMonitoringSessionStatusInState(sessionId, 'Aktif');
        if(updatedSession) setCurrentSession(updatedSession);
      }
      
      // Ensure Risk Causes are loaded if not already
      if (allRiskCausesFromStore.length === 0 && !riskCausesLoading) {
        console.log("[ConductMonitoringPage] Risk causes not in store, fetching...");
        await fetchRiskCauses(currentUserId, currentPeriod);
      }
      
      await fetchRiskExposuresForSession(sessionId, currentUserId, currentPeriod);

    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[ConductMonitoringPage] Error loading initial data:", errorMessage);
      toast({ title: "Gagal Memuat Data Sesi", description: errorMessage, variant: "destructive" });
    } finally {
      setPageIsLoading(false);
    }
  }, [sessionId, currentUserId, currentPeriod, getMonitoringSessionById, toast, router, allRiskCausesFromStore.length, riskCausesLoading, fetchRiskCauses, fetchRiskExposuresForSession, updateMonitoringSessionStatusInState]);

  useEffect(() => {
    if (!authLoading && currentUser && isProfileComplete && currentUserId && currentPeriod) {
        loadInitialData();
    } else if (!authLoading && (!currentUser || !isProfileComplete)) {
        router.push(currentUser ? '/settings' : '/login');
    }
  }, [authLoading, currentUser, isProfileComplete, currentUserId, currentPeriod, loadInitialData, router]);

  useEffect(() => {
    if (currentSession && allRiskCausesFromStore.length > 0) {
      const causesToDisplay = allRiskCausesFromStore
        .filter(rc => currentSession.riskCauseIdsToMonitor.includes(rc.id))
        .map(rc => {
          const exposure = riskExposures.find(re => re.riskCauseId === rc.id && re.monitoringSessionId === currentSession.id);
          // Untuk mendapatkan potentialRiskDescription, goalCode, dll., kita perlu data PotentialRisk dan Goal.
          // Asumsi ini sudah ada di store atau bisa diambil/diperkaya.
          // Untuk sementara, kita buat placeholder jika tidak ada.
          const potentialRisk = store.potentialRisks.find(pr => pr.id === rc.potentialRiskId);
          const goal = potentialRisk ? store.goals.find(g => g.id === potentialRisk.goalId) : undefined;
          
          return {
            ...rc,
            potentialRiskDescription: potentialRisk?.description || "Potensi Risiko Induk Tidak Diketahui",
            goalCode: goal?.code || "S?",
            potentialRiskCode: `${goal?.code || 'S?'}.PR${potentialRisk?.sequenceNumber || '?'}`,
            riskCauseCode: `${goal?.code || 'S?'}.PR${potentialRisk?.sequenceNumber || '?'}.PC${rc.sequenceNumber || '?'}`,
            riskExposure: exposure || null,
          };
        })
        .sort((a,b) => (a.riskCauseCode || "").localeCompare(b.riskCauseCode || "", undefined, {numeric: true, sensitivity: 'base'}));
        
      setMonitoredCauses(causesToDisplay);

      const initialExposureValues: Record<string, string> = {};
      const initialExposureNotes: Record<string, string> = {};
      causesToDisplay.forEach(mc => {
        if (mc.riskExposure && mc.riskExposure.exposureValue !== null && mc.riskExposure.exposureValue !== undefined) {
          initialExposureValues[mc.id] = String(mc.riskExposure.exposureValue);
        } else {
          initialExposureValues[mc.id] = '';
        }
        initialExposureNotes[mc.id] = mc.riskExposure.exposureNotes || '';
      });
      setExposureValues(initialExposureValues);
      setExposureNotes(initialExposureNotes);
    }
  }, [currentSession, allRiskCausesFromStore, riskExposures, store.potentialRisks, store.goals]);


  const handleExposureValueChange = (riskCauseId: string, value: string) => {
    setExposureValues(prev => ({ ...prev, [riskCauseId]: value }));
  };

  const handleExposureNotesChange = (riskCauseId: string, value: string) => {
    setExposureNotes(prev => ({ ...prev, [riskCauseId]: value }));
  };

  const handleSaveExposure = async (riskCauseId: string) => {
    if (!currentSession || !currentUserId || !currentPeriod) {
      toast({ title: "Konteks Tidak Lengkap", description: "Sesi, User ID, atau Periode aplikasi tidak tersedia.", variant: "destructive" });
      return;
    }
    setSavingStates(prev => ({ ...prev, [riskCauseId]: true }));

    const exposureValueStr = exposureValues[riskCauseId];
    const exposureValueNum = exposureValueStr !== '' ? parseFloat(exposureValueStr.replace(',', '.')) : null; // Handle comma decimal

    if (exposureValueStr !== '' && (isNaN(Number(exposureValueNum)) || exposureValueNum === null)) {
        toast({ title: "Input Tidak Valid", description: "Nilai risiko yang terjadi harus berupa angka.", variant: "destructive" });
        setSavingStates(prev => ({ ...prev, [riskCauseId]: false }));
        return;
    }
    
    const notes = exposureNotes[riskCauseId] || null;

    const exposureData: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt'| 'userId' | 'period'> = {
      monitoringSessionId: sessionId,
      riskCauseId: riskCauseId,
      exposureValue: exposureValueNum,
      exposureNotes: notes,
    };

    try {
      await upsertRiskExposureInState(exposureData, currentUserId, currentPeriod);
      toast({ title: "Data Paparan Disimpan", description: `Data paparan untuk penyebab risiko berhasil disimpan.` });
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      toast({ title: "Gagal Menyimpan Paparan", description: errorMessage, variant: "destructive" });
    } finally {
      setSavingStates(prev => ({ ...prev, [riskCauseId]: false }));
    }
  };
  
  const handleCompleteMonitoring = async () => {
    if (!currentSession || !currentUserId) return;
    setIsSubmitting(true);
    try {
      await updateMonitoringSessionStatusInState(currentSession.id, 'Selesai');
      toast({ title: "Sesi Pemantauan Selesai", description: `Sesi "${currentSession.name}" telah ditandai selesai.`});
      router.push('/monitoring');
    } catch (error: any) {
      toast({ title: "Gagal Menyelesaikan Sesi", description: error.message || String(error), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSessionCompleted = currentSession?.status === 'Selesai';

  if (authLoading || pageIsLoading || riskCausesLoading || riskExposuresLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          {authLoading ? "Memuat data pengguna..." : (pageIsLoading || riskCausesLoading || riskExposuresLoading ? "Memuat data sesi pemantauan..." : "Menyiapkan...")}
        </p>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Sesi pemantauan tidak ditemukan atau tidak dapat dimuat.</p>
        <Link href="/monitoring">
          <Button variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" />Kembali ke Daftar Sesi</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pelaksanaan Pemantauan: ${currentSession.name}`}
        description={`UPR: ${uprDisplayName}, Periode Sesi: ${format(parseISO(currentSession.startDate), "dd MMM yyyy", { locale: localeID })} - ${format(parseISO(currentSession.endDate), "dd MMM yyyy", { locale: localeID })}. Status: ${currentSession.status}`}
        actions={
          <Link href="/monitoring" passHref>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Sesi
            </Button>
          </Link>
        }
      />

      {monitoredCauses.length === 0 && !riskCausesLoading && (
        <Card>
            <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Tidak ada penyebab risiko yang dipilih untuk dipantau dalam sesi ini, atau data penyebab risiko belum termuat.</p>
            </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {monitoredCauses.map((cause) => {
          const { level: currentRiskLevelText, score: currentRiskScore } = getCalculatedRiskLevel(cause.likelihood, cause.impact);
          const toleranceValue = parseToleranceValue(cause.riskTolerance);
          const exposureValueNum = exposureValues[cause.id] && exposureValues[cause.id] !== '' ? parseFloat(String(exposureValues[cause.id]).replace(',', '.')) : null;

          let comparisonResultText = "";
          let guidanceText = "";
          let isExceeded: boolean | null = null;

          if (exposureValueNum !== null && toleranceValue !== null) {
            const difference = exposureValueNum - toleranceValue;
            if (difference >= 0) { // Termasuk jika sama dengan (>=)
              isExceeded = true;
              comparisonResultText = `Paparan (${exposureValueNum}) >= Toleransi (${toleranceValue}). Selisih: +${difference.toFixed(2)}. Potensi Risiko Telah Menjadi Risiko.`;
              guidanceText = "Segera lakukan tindakan pengendalian (Risk Mitigation) dan susun/perbaiki Tindakan Korektif (Corrective Action).";
            } else {
              isExceeded = false;
              comparisonResultText = `Paparan (${exposureValueNum}) < Toleransi (${toleranceValue}). Selisih: ${difference.toFixed(2)}. Pengendalian Preventif Berjalan Baik.`;
              guidanceText = "Lakukan pengendalian risiko sesuai rencana. Tinjau dan perbaiki rencana pengendalian Risiko jika diperlukan.";
            }
          }

          return (
            <Card key={cause.id}>
              <CardHeader>
                <CardTitle className="text-base">{cause.riskCauseCode} - {cause.description}</CardTitle>
                <CardDescription className="text-xs">
                  Sumber: <Badge variant="outline">{cause.source}</Badge> | 
                  Potensi Risiko Induk: {cause.potentialRiskCode} - {cause.potentialRiskDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <Label className="font-semibold">Tingkat Risiko Saat Ini</Label>
                    <p><Badge className={`${getRiskLevelColor(currentRiskLevelText)}`}>{currentRiskLevelText === 'N/A' ? 'N/A' : `${currentRiskLevelText} (${currentRiskScore ?? 'N/A'})`}</Badge></p>
                  </div>
                  <div>
                    <Label className="font-semibold">KRI/Indikator Utama Risiko</Label>
                    <p className="text-muted-foreground">{cause.keyRiskIndicator || "-"}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Toleransi Risiko</Label>
                    <p className="text-muted-foreground">{cause.riskTolerance || "-"} {toleranceValue !== null ? `(Nilai Numerik: ${toleranceValue})` : ''}</p>
                  </div>
                </div>
                
                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor={`exposureValue-${cause.id}`}>Risiko yang Terjadi (Nilai Risk Exposure)</Label>
                            <Input
                            id={`exposureValue-${cause.id}`}
                            type="text" // Ubah ke text untuk mengakomodasi koma
                            placeholder="Masukkan nilai (angka)"
                            value={exposureValues[cause.id] ?? ''}
                            onChange={(e) => handleExposureValueChange(cause.id, e.target.value)}
                            disabled={savingStates[cause.id] || isSessionCompleted}
                            />
                        </div>
                        <div>
                            <Label htmlFor={`exposureNotes-${cause.id}`}>Catatan/Deskripsi Paparan Risiko</Label>
                            <Textarea
                            id={`exposureNotes-${cause.id}`}
                            placeholder="Jelaskan konteks atau detail paparan risiko..."
                            rows={3}
                            value={exposureNotes[cause.id] ?? ''}
                            onChange={(e) => handleExposureNotesChange(cause.id, e.target.value)}
                            disabled={savingStates[cause.id] || isSessionCompleted}
                            />
                        </div>
                        {!isSessionCompleted && (
                           <Button 
                              onClick={() => handleSaveExposure(cause.id)} 
                              disabled={savingStates[cause.id]}
                              size="sm"
                          >
                              {savingStates[cause.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                              Simpan Paparan
                          </Button>
                        )}
                    </div>
                    
                    {comparisonResultText && (
                        <Alert variant={isExceeded ? "destructive" : "default"} className={`${isExceeded === false ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700" : ""} mt-2 md:mt-0`}>
                            {isExceeded ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            <AlertTitle className={`${isExceeded === false ? "text-green-800 dark:text-green-200" : ""}`}>
                                {isExceeded ? "Risiko Melebihi Toleransi!" : "Risiko Terkendali (dalam Toleransi)"}
                            </AlertTitle>
                            <AlertDescription className={`${isExceeded === false ? "text-green-700 dark:text-green-300" : ""} text-xs`}>
                                <p className="font-semibold">{comparisonResultText}</p>
                                <p className="mt-1">{guidanceText}</p>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
                {/* Placeholder untuk Pemantauan Pelaksanaan Pengendalian Risiko - Tahap Berikutnya */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Pemantauan Pelaksanaan Pengendalian (Akan Datang)</h4>
                </div>

              </CardContent>
            </Card>
          ))}
      </div>
      
      {!isSessionCompleted && monitoredCauses.length > 0 && (
        <div className="mt-8 flex justify-end">
          <Button onClick={handleCompleteMonitoring} variant="default" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
             Selesaikan Sesi Pemantauan Ini
          </Button>
        </div>
      )}
       {isSessionCompleted && (
          <Alert variant="default" className="mt-8 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
            <Info className="h-4 w-4 text-blue-700 dark:text-blue-300" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">Sesi Selesai</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              Sesi pemantauan ini telah selesai. Input tidak dapat diubah lagi.
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
}
