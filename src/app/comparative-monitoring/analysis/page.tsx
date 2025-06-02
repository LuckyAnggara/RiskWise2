
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, AlertTriangle, BarChart2, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import type { MonitoringSession, RiskCause, PotentialRisk, Goal, RiskExposure, MonitoredControlMeasureData } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge'; // Ditambahkan untuk tipe kontrol
import { getControlTypeName } from '@/lib/types'; // Ditambahkan


interface ComparativeDataPoint {
  sessionId: string;
  sessionName: string;
  sessionEndDate: string;
  exposureValue: number | null;
  controlPerformances: Array<{ 
    controlId: string; 
    controlDesc: string; 
    performance: number | null;
    controlType: string | null; // Nama tipe kontrol, mis. "Preventif"
  }>;
}

interface RiskCauseComparativeSummary {
  riskCauseId: string;
  riskCauseCode: string;
  riskCauseDescription: string;
  potentialRiskDescription: string;
  goalDescription: string;
  dataPoints: ComparativeDataPoint[];
}

export default function ComparativeAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  
  const store = useAppStore(); // Gunakan instance store untuk akses konsisten

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [selectedSessionsDetails, setSelectedSessionsDetails] = useState<MonitoringSession[]>([]);
  const [comparativeData, setComparativeData] = useState<RiskCauseComparativeSummary[]>([]);
  
  const [sessionsDetailLoading, setSessionsDetailLoading] = useState(true);
  const [dependentDataLoading, setDependentDataLoading] = useState(true); // Untuk riskExposures & monitoredControlMeasuresData
  const [processingComparativeData, setProcessingComparativeData] = useState(true); // Untuk agregasi akhir
  
  const isLoadingPage = useMemo(() => 
    authLoading || sessionsDetailLoading || dependentDataLoading || processingComparativeData || store.goalsLoading || store.potentialRisksLoading || store.riskCausesLoading || store.controlMeasuresLoading,
    [authLoading, sessionsDetailLoading, dependentDataLoading, processingComparativeData, store.goalsLoading, store.potentialRisksLoading, store.riskCausesLoading, store.controlMeasuresLoading]
  );

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);

  // Efek 1: Mengambil dan mengatur selectedSessionIds dari URL
  useEffect(() => {
    const idsQueryParam = searchParams.get('sessionIds');
    if (idsQueryParam) {
      const ids = idsQueryParam.split(',');
      if (ids.length > 0) {
        setSelectedSessionIds(ids);
      } else {
        toast({ title: "Error", description: "Tidak ada sesi yang dipilih untuk analisis.", variant: "destructive" });
        router.push('/comparative-monitoring');
      }
    } else if (!authLoading && !isLoadingPage) { // Hanya redirect jika tidak sedang loading
      toast({ title: "Error", description: "Parameter ID Sesi hilang.", variant: "destructive" });
      router.push('/comparative-monitoring');
    }
  }, [searchParams, router, toast, authLoading, isLoadingPage]);

  // Efek 2: Memuat detail sesi pemantauan berdasarkan selectedSessionIds
  useEffect(() => {
    if (selectedSessionIds.length === 0 || !currentUserId || !currentPeriod || !isProfileComplete) {
      setSessionsDetailLoading(false);
      setSelectedSessionsDetails([]);
      return;
    }
    let isActive = true;
    const loadSessionDetails = async () => {
      console.log("[AnalysisPage E2] Loading session details for IDs:", selectedSessionIds);
      if(isActive) setSessionsDetailLoading(true);
      try {
        const sessionsFromStore = store.monitoringSessions; // Ambil dari store yang sudah ada
        const details = selectedSessionIds
          .map(id => sessionsFromStore.find(s => s.id === id))
          .filter(s => s !== undefined) as MonitoringSession[];
        
        if (isActive) {
          if (details.length !== selectedSessionIds.length) {
            console.warn("[AnalysisPage E2] Not all selected sessions found in current store state. Waiting for store update or global fetch.");
            // Mungkin perlu pemicu fetch jika data belum lengkap
          }
          setSelectedSessionsDetails(details.sort((a,b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()));
          console.log("[AnalysisPage E2] Session details set:", details.map(d => d.id));
          setSessionsDetailLoading(false);
        }
      } catch (error) {
        if (isActive) {
          console.error("[AnalysisPage E2] Error loading session details:", error);
          toast({ title: "Gagal Memuat Detail Sesi", description: String(error), variant: "destructive" });
          setSessionsDetailLoading(false);
        }
      }
    };
    loadSessionDetails();
    return () => { isActive = false };
  }, [selectedSessionIds, currentUserId, currentPeriod, isProfileComplete, toast, store.monitoringSessions]);


  // Efek 3: Memuat data dependen (RiskExposures, MonitoredControlMeasureData) untuk sesi yang dipilih
  useEffect(() => {
    if (selectedSessionsDetails.length === 0 || !currentUserId || !currentPeriod || sessionsDetailLoading) {
      if (!sessionsDetailLoading) setDependentDataLoading(false);
      return;
    }
    let isActive = true;
    const fetchAllDependentData = async () => {
      console.log("[AnalysisPage E3] Fetching dependent data for sessions:", selectedSessionsDetails.map(s => s.id));
      if(isActive) setDependentDataLoading(true);
      try {
        const fetchPromises = selectedSessionsDetails.flatMap(session => [
          store.fetchRiskExposuresForSession(session.id, currentUserId, currentPeriod),
          store.fetchMonitoredControlMeasuresForSession(session.id, currentUserId, currentPeriod)
        ]);
        await Promise.all(fetchPromises);
        if (isActive) {
          console.log("[AnalysisPage E3] All dependent data fetched.");
          setDependentDataLoading(false);
        }
      } catch (error) {
        if (isActive) {
          console.error("[AnalysisPage E3] Error fetching dependent data:", error);
          toast({ title: "Gagal Memuat Data Pemantauan Detail", description: String(error), variant: "destructive" });
          setDependentDataLoading(false);
        }
      }
    };
    fetchAllDependentData();
    return () => { isActive = false };
  }, [selectedSessionsDetails, currentUserId, currentPeriod, sessionsDetailLoading, store.fetchRiskExposuresForSession, store.fetchMonitoredControlMeasuresForSession, toast]);


  // Efek 4: Agregasi data komparatif
  useEffect(() => {
    let isActive = true;
    const aggregateComparativeData = async () => {
      console.log("[AnalysisPage E4] Attempting to aggregate comparative data.");
      if (isActive) setProcessingComparativeData(true);

      // Ambil state terbaru dari store di dalam fungsi async
      const currentRiskExposures = useAppStore.getState().riskExposures;
      const currentMonitoredControls = useAppStore.getState().monitoredControlMeasuresData;
      const currentControlMeasures = useAppStore.getState().controlMeasures;
      const currentRiskCauses = useAppStore.getState().riskCauses;
      const currentPotentialRisks = useAppStore.getState().potentialRisks;
      const currentGoals = useAppStore.getState().goals;
      
      const allRiskCauseIdsAcrossSessions = new Set<string>();
      selectedSessionsDetails.forEach(s => s.riskCauseIdsToMonitor.forEach(rcId => allRiskCauseIdsAcrossSessions.add(rcId)));

      const aggregatedDataPromises = Array.from(allRiskCauseIdsAcrossSessions).map(async rcId => {
        const riskCause = currentRiskCauses.find(rc => rc.id === rcId && rc.userId === currentUserId && rc.period === currentPeriod);
        if (!riskCause) return null;

        const potentialRisk = currentPotentialRisks.find(pr => pr.id === riskCause.potentialRiskId && pr.userId === currentUserId && pr.period === currentPeriod);
        const goal = potentialRisk ? currentGoals.find(g => g.id === potentialRisk.goalId && g.userId === currentUserId && g.period === currentPeriod) : null;

        const dataPoints: ComparativeDataPoint[] = [];
        for (const session of selectedSessionsDetails) {
          if (!session.riskCauseIdsToMonitor.includes(rcId)) continue;

          const exposure = currentRiskExposures.find(re => re.monitoringSessionId === session.id && re.riskCauseId === rcId);
          const controlsDataForSessionAndCause = currentMonitoredControls.filter(mcmd => mcmd.monitoringSessionId === session.id && mcmd.riskCauseId === rcId);
          
          const controlPerformances = controlsDataForSessionAndCause.map(mcmd => {
              const controlDetail = currentControlMeasures.find(cm => cm.id === mcmd.controlMeasureId);
              return {
                  controlId: mcmd.controlMeasureId,
                  controlDesc: controlDetail?.description || "Pengendalian tidak ditemukan",
                  performance: mcmd.controlPerformance,
                  controlType: controlDetail ? getControlTypeName(controlDetail.controlType) : null,
              };
          });

          dataPoints.push({
            sessionId: session.id,
            sessionName: session.name,
            sessionEndDate: session.endDate,
            exposureValue: exposure?.exposureValue ?? null,
            controlPerformances,
          });
        }
        
        if (dataPoints.length > 0) {
          return {
            riskCauseId: rcId,
            riskCauseCode: `${potentialRisk?.goalCode || 'S?'}.PR${potentialRisk?.sequenceNumber || '?'}.PC${riskCause.sequenceNumber || '?'}`,
            riskCauseDescription: riskCause.description,
            potentialRiskDescription: potentialRisk?.description || "N/A",
            goalDescription: goal?.name || "N/A",
            dataPoints: dataPoints.sort((a,b) => new Date(a.sessionEndDate).getTime() - new Date(b.endDate).getTime()),
          };
        }
        return null;
      });

      try {
        const results = (await Promise.all(aggregatedDataPromises)).filter(item => item !== null) as RiskCauseComparativeSummary[];
        if (isActive) {
          setComparativeData(results.sort((a,b)=> a.riskCauseCode.localeCompare(b.riskCauseCode, undefined, {numeric:true, sensitivity:'base'})));
          console.log("[AnalysisPage E4] Aggregation complete.", results);
        }
      } catch (error) {
        if (isActive) {
          console.error("[AnalysisPage E4] Error during data aggregation:", error);
          toast({ title: "Gagal Memproses Data Komparatif", description: String(error), variant: "destructive" });
        }
      } finally {
        if (isActive) setProcessingComparativeData(false);
      }
    };
    
    // Kondisi untuk menjalankan agregasi
    if (
      !authLoading && isProfileComplete && currentUserId && currentPeriod &&
      selectedSessionsDetails.length > 0 && 
      !sessionsDetailLoading && 
      !dependentDataLoading &&
      !store.riskExposuresLoading && // Pastikan data dependen dari store juga sudah selesai dimuat
      !store.monitoredControlMeasuresLoading &&
      !store.goalsLoading && !store.potentialRisksLoading && !store.riskCausesLoading && !store.controlMeasuresLoading // Pastikan data global juga sudah dimuat
    ) {
      aggregateComparativeData();
    } else {
      // Jika prasyarat belum terpenuhi, pastikan processingComparativeData diset false jika tidak ada proses lain yang berjalan
      if (isActive && !sessionsDetailLoading && !dependentDataLoading && 
          !store.riskExposuresLoading && !store.monitoredControlMeasuresLoading &&
          !store.goalsLoading && !store.potentialRisksLoading && !store.riskCausesLoading && !store.controlMeasuresLoading) {
        setProcessingComparativeData(false);
      }
      console.log("[AnalysisPage E4] Skipping aggregation, prerequisites not met.", {
        authLoading, isProfileComplete, currentUserId, currentPeriod,
        selectedSessionsDetailsLength: selectedSessionsDetails.length,
        sessionsDetailLoading, dependentDataLoading,
        riskExposuresLoading: store.riskExposuresLoading,
        monitoredControlMeasuresLoading: store.monitoredControlMeasuresLoading,
        goalsLoading: store.goalsLoading,
      });
    }
    return () => {isActive = false;};
  }, [
    // Kondisi Pemicu Utama
    selectedSessionsDetails, 
    // Data Store yang Digunakan Langsung dalam Agregasi atau sebagai tanda selesainya fetch dependen
    store.riskExposures, 
    store.monitoredControlMeasuresData,
    store.controlMeasures,
    store.riskCauses,
    store.potentialRisks,
    store.goals,
    // State loading dari store untuk data dependen dan global
    store.riskExposuresLoading,
    store.monitoredControlMeasuresLoading,
    store.goalsLoading,
    store.potentialRisksLoading,
    store.riskCausesLoading,
    store.controlMeasuresLoading,
    // Konteks & state lokal
    currentUserId, currentPeriod, isProfileComplete, authLoading,
    sessionsDetailLoading, dependentDataLoading,
    toast // toast stabil
  ]);


  if (isLoadingPage) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data analisis komparatif...</p>
      </div>
    );
  }

  if (!currentUser || !isProfileComplete) {
     return (
       <div className="text-center py-10">
        <p className="text-muted-foreground">Profil belum lengkap atau sesi tidak valid.</p>
        <Button onClick={() => router.push(currentUser ? '/settings' : '/login')} className="mt-4">
            {currentUser ? "Ke Pengaturan" : "Ke Halaman Login"}
        </Button>
      </div>
    )
  }
  
  if (selectedSessionIds.length === 0 && !isLoadingPage) {
    return (
         <div className="text-center py-10">
            <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Tidak ada ID sesi yang valid ditemukan di URL.</p>
            <Link href="/comparative-monitoring" passHref>
                <Button variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Pemilihan Sesi</Button>
            </Link>
        </div>
    );
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Hasil Analisis Pemantauan Komparatif"
        description={`Membandingkan ${selectedSessionsDetails.length} sesi pemantauan. UPR: ${appUser?.displayName || '...'}, Periode Aplikasi: ${currentPeriod || '...'}.`}
        actions={
          <Link href="/comparative-monitoring" passHref>
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Pemilihan Sesi</Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Sesi yang Dibandingkan</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedSessionsDetails.length > 0 ? (
            <ul className="list-disc list-inside text-sm space-y-1">
              {selectedSessionsDetails.map(s => (
                <li key={s.id}>{s.name} (Selesai: {format(parseISO(s.endDate), "dd MMM yyyy", { locale: localeID })}, Periode Sesi: {s.period})</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Detail sesi belum termuat atau tidak ada sesi yang dipilih.</p>
          )}
        </CardContent>
      </Card>
      
      {comparativeData.length === 0 && !isLoadingPage && (
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Tidak ada data komparatif yang dapat ditampilkan untuk sesi yang dipilih.</p>
            <p className="text-sm text-muted-foreground">Ini mungkin karena tidak ada penyebab risiko yang sama dipantau di semua sesi yang dipilih, atau belum ada data paparan/kontrol yang tercatat.</p>
          </CardContent>
        </Card>
      )}

      {comparativeData.map(summary => (
        <Card key={summary.riskCauseId}>
          <CardHeader>
            <CardTitle className="text-lg">{summary.riskCauseCode} - {summary.riskCauseDescription}</CardTitle>
            <CardDescription className="text-xs">
              Potensi Risiko: {summary.potentialRiskDescription} <br />
              Sasaran: {summary.goalDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Tren Paparan Risiko (Nilai KRI Penyebab Risiko)</h4>
              {/* Placeholder untuk Chart Paparan Risiko */}
              <div className="p-4 border rounded-md bg-muted/30 text-center text-sm text-muted-foreground">
                <BarChart2 className="inline-block h-5 w-5 mr-2" /> Visualisasi Tren Paparan Risiko akan ditampilkan di sini.
              </div>
              <ul className="text-xs mt-2 space-y-1">
                {summary.dataPoints.map(dp => (
                    <li key={dp.sessionId}>
                        <strong>{dp.sessionName}</strong> ({format(parseISO(dp.sessionEndDate), "dd MMM yy", { locale: localeID })}): Paparan = {dp.exposureValue ?? <span className="italic text-muted-foreground">N/A</span>}
                    </li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2">Tren Kinerja Pengendalian (%)</h4>
              <div className="p-4 border rounded-md bg-muted/30 text-center text-sm text-muted-foreground">
                <BarChart2 className="inline-block h-5 w-5 mr-2" /> Visualisasi Tren Kinerja Pengendalian akan ditampilkan di sini.
              </div>
               <ul className="text-xs mt-2 space-y-1">
                {summary.dataPoints.map(dp => (
                  <li key={`${dp.sessionId}-controls`}>
                    <strong>{dp.sessionName}</strong> ({format(parseISO(dp.sessionEndDate), "dd MMM yy", { locale: localeID })}):
                    {dp.controlPerformances.length > 0 ? (
                      <ul className="list-disc list-inside pl-4 mt-0.5 space-y-0.5">
                        {dp.controlPerformances.map(cp => (
                          <li key={cp.controlId} title={cp.controlDesc}>
                            <Badge variant="secondary" className="text-[10px] mr-1">{cp.controlType || 'N/A'}</Badge>
                            {cp.controlDesc.substring(0,40)}... : {cp.performance !== null ? `${cp.performance}%` : <span className="italic text-muted-foreground">N/A</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="ml-2 text-muted-foreground italic">Tidak ada data kinerja kontrol.</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2">Pembahasan / Observasi (AI Placeholder)</h4>
              <div className="p-4 border rounded-md bg-muted/30 text-sm text-muted-foreground">
                <FileText className="inline-block h-5 w-5 mr-2 align-text-bottom" />
                Area ini akan menampilkan ringkasan atau observasi yang dihasilkan AI mengenai tren paparan risiko dan efektivitas pengendalian untuk penyebab risiko ini, serta bagaimana hal tersebut berkontribusi terhadap minimalisasi risiko.
                <p className="mt-2 text-xs">Contoh: 
                "Terlihat tren penurunan paparan risiko dari sesi A ke sesi C, berkorelasi dengan peningkatan kinerja pengendalian X. Namun, pengendalian Y masih menunjukkan kinerja rendah dan perlu perhatian."
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

