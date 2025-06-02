
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
import type { MonitoringSession, RiskCause, PotentialRisk, Goal, RiskExposure, MonitoredControlMeasureData, ControlMeasure } from '@/lib/types'; // Added ControlMeasure
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getControlTypeName } from '@/lib/types';


interface ComparativeDataPoint {
  sessionId: string;
  sessionName: string;
  sessionEndDate: string;
  exposureValue: number | null;
  controlPerformances: Array<{
    controlId: string;
    controlDesc: string;
    performance: number | null;
    controlType: string | null;
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
  
  const store = useAppStore();

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [selectedSessionsDetails, setSelectedSessionsDetails] = useState<MonitoringSession[]>([]);
  const [comparativeData, setComparativeData] = useState<RiskCauseComparativeSummary[]>([]);
  
  const [sessionsDetailLoading, setSessionsDetailLoading] = useState(true);
  const [dependentDataLoading, setDependentDataLoading] = useState(true);
  const [processingComparativeData, setProcessingComparativeData] = useState(true);
  
  const isLoadingPage = useMemo(() => 
    authLoading || sessionsDetailLoading || dependentDataLoading || processingComparativeData || 
    store.goalsLoading || store.potentialRisksLoading || store.riskCausesLoading || store.controlMeasuresLoading ||
    store.riskExposuresLoading || store.monitoredControlMeasuresLoading, // Ditambahkan
    [
      authLoading, sessionsDetailLoading, dependentDataLoading, processingComparativeData, 
      store.goalsLoading, store.potentialRisksLoading, store.riskCausesLoading, store.controlMeasuresLoading,
      store.riskExposuresLoading, store.monitoredControlMeasuresLoading // Ditambahkan
    ]
  );

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);

  // Efek 1: Mengambil dan mengatur selectedSessionIds dari URL
  useEffect(() => {
    const idsQueryParam = searchParams.get('sessionIds');
    console.log("[AnalysisPage E1] sessionIds from URL:", idsQueryParam);
    if (idsQueryParam) {
      const ids = idsQueryParam.split(',').filter(id => id.trim() !== '');
      if (ids.length > 0) {
        setSelectedSessionIds(ids);
      } else if (!authLoading && !isLoadingPage) { // Cek loading untuk mencegah redirect prematur
        toast({ title: "Error", description: "Tidak ada sesi yang valid dipilih untuk analisis.", variant: "destructive" });
        router.push('/comparative-monitoring');
      }
    } else if (!authLoading && !isLoadingPage) {
      toast({ title: "Error", description: "Parameter ID Sesi hilang.", variant: "destructive" });
      router.push('/comparative-monitoring');
    }
  }, [searchParams, router, toast, authLoading, isLoadingPage]); // isLoadingPage ditambahkan

  // Efek 2: Memuat detail sesi pemantauan berdasarkan selectedSessionIds
  useEffect(() => {
    let isActive = true;
    const loadSessionDetails = async () => {
      if (selectedSessionIds.length === 0 || !currentUserId || !currentPeriod || !isProfileComplete) {
        if (isActive) {
          setSessionsDetailLoading(false);
          setSelectedSessionsDetails([]);
        }
        return;
      }
      console.log("[AnalysisPage E2] Loading session details for IDs:", selectedSessionIds);
      if(isActive) setSessionsDetailLoading(true);
      try {
        // Ambil dari store, jika tidak ada, bisa panggil service (tapi store harusnya sudah diisi oleh triggerGlobalDataFetch)
        const allSessionsFromStore = store.monitoringSessions; 
        const details = selectedSessionIds
          .map(id => allSessionsFromStore.find(s => s.id === id && s.userId === currentUserId && s.period === currentPeriod))
          .filter(s => s !== undefined) as MonitoringSession[];
        
        if (isActive) {
          if (details.length !== selectedSessionIds.length) {
            console.warn("[AnalysisPage E2] Not all selected sessions found in current store state or context mismatch.");
          }
          const sortedDetails = details.sort((a,b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
          setSelectedSessionsDetails(sortedDetails);
          console.log("[AnalysisPage E2] Session details set (count):", sortedDetails.length);
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
    let isActive = true;
    const fetchAllDependentData = async () => {
      if (selectedSessionsDetails.length === 0 || !currentUserId || !currentPeriod || sessionsDetailLoading) {
        if (isActive && !sessionsDetailLoading) setDependentDataLoading(false);
        return;
      }
      console.log("[AnalysisPage E3] Fetching dependent data for sessions (count):", selectedSessionsDetails.length);
      if(isActive) setDependentDataLoading(true);
      try {
        // Pastikan data global (goals, potentialRisks, riskCauses, controlMeasures) sudah atau sedang dimuat oleh triggerGlobalDataFetch
        // Kita hanya perlu fetch data spesifik sesi di sini.
        if (store.dataFetchedForPeriod !== `${currentUserId}|${currentPeriod}`) {
          console.log("[AnalysisPage E3] Global data not yet fetched for current context. Waiting for AppLayout's triggerGlobalDataFetch.");
          // Ini bisa terjadi jika user langsung ke halaman ini. AppLayout akan handle global fetch.
          // Kita tidak set dependentDataLoading ke false di sini, biarkan efek lain yang handle
          return;
        }

        const fetchPromises = selectedSessionsDetails.flatMap(session => [
          store.fetchRiskExposuresForSession(session.id, currentUserId, currentPeriod),
          store.fetchMonitoredControlMeasuresForSession(session.id, currentUserId, currentPeriod)
        ]);
        await Promise.all(fetchPromises);
        if (isActive) {
          console.log("[AnalysisPage E3] All dependent data fetch initiated.");
          setDependentDataLoading(false); // Set false karena fetch telah selesai dipicu.
        }
      } catch (error) {
        if (isActive) {
          console.error("[AnalysisPage E3] Error initiating dependent data fetch:", error);
          toast({ title: "Gagal Memuat Data Pemantauan Detail", description: String(error), variant: "destructive" });
          setDependentDataLoading(false);
        }
      }
    };
    fetchAllDependentData();
    return () => { isActive = false };
  }, [selectedSessionsDetails, currentUserId, currentPeriod, sessionsDetailLoading, store.fetchRiskExposuresForSession, store.fetchMonitoredControlMeasuresForSession, toast, store.dataFetchedForPeriod]);


  // Efek 4: Agregasi data komparatif
  useEffect(() => {
    let isActive = true;
    const aggregateComparativeData = async () => {
      console.log("[AnalysisPage E4] Attempting to aggregate comparative data.");
      if (isActive) setProcessingComparativeData(true);

      const currentRiskExposures = store.riskExposures;
      const currentMonitoredControls = store.monitoredControlMeasuresData;
      const currentControlMeasures = store.controlMeasures;
      const currentRiskCauses = store.riskCauses;
      const currentPotentialRisks = store.potentialRisks;
      const currentGoals = store.goals;
      
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

          const exposure = currentRiskExposures.find(re => re.monitoringSessionId === session.id && re.riskCauseId === rcId && re.userId === currentUserId && re.period === currentPeriod);
          const controlsDataForSessionAndCause = currentMonitoredControls.filter(mcmd => mcmd.monitoringSessionId === session.id && mcmd.riskCauseId === rcId && mcmd.userId === currentUserId && mcmd.period === currentPeriod);
          
          const controlPerformances = controlsDataForSessionAndCause.map(mcmd => {
              const controlDetail = currentControlMeasures.find(cm => cm.id === mcmd.controlMeasureId && cm.userId === currentUserId && cm.period === currentPeriod);
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
            dataPoints: dataPoints.sort((a,b) => new Date(a.sessionEndDate).getTime() - new Date(b.sessionEndDate).getTime()),
          };
        }
        return null;
      });

      try {
        const results = (await Promise.all(aggregatedDataPromises)).filter(item => item !== null) as RiskCauseComparativeSummary[];
        if (isActive) {
          setComparativeData(results.sort((a,b)=> a.riskCauseCode.localeCompare(b.riskCauseCode, undefined, {numeric:true, sensitivity:'base'})));
          console.log("[AnalysisPage E4] Aggregation complete. Result count:", results.length);
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
    
    const prerequisitesMet = 
      !authLoading && isProfileComplete && currentUserId && currentPeriod &&
      selectedSessionsDetails.length > 0 && 
      !sessionsDetailLoading && 
      !dependentDataLoading &&
      !store.riskExposuresLoading && 
      !store.monitoredControlMeasuresLoading &&
      !store.goalsLoading && 
      !store.potentialRisksLoading && 
      !store.riskCausesLoading && 
      !store.controlMeasuresLoading;

    console.log("[AnalysisPage E4] Prerequisites for aggregation:", {
        authLoading, isProfileComplete, currentUserId, currentPeriod,
        selectedSessionsDetailsLength: selectedSessionsDetails.length,
        sessionsDetailLoading, dependentDataLoading,
        riskExposuresLoading: store.riskExposuresLoading,
        monitoredControlMeasuresLoading: store.monitoredControlMeasuresLoading,
        goalsLoading: store.goalsLoading, potentialRisksLoading: store.potentialRisksLoading, 
        riskCausesLoading: store.riskCausesLoading, controlMeasuresLoading: store.controlMeasuresLoading,
        allPrerequisitesMet: prerequisitesMet
    });

    if (prerequisitesMet) {
      aggregateComparativeData();
    } else {
      if (isActive && !authLoading && !sessionsDetailLoading && !dependentDataLoading) {
        // If main page loadings are done but store loadings might still be pending,
        // keep processingComparativeData true until store loadings are also false.
        // If all loadings (page and store specific) are false and selectedSessionsDetails is empty, then processing can be false.
        if (selectedSessionsDetails.length === 0 && 
            !store.riskExposuresLoading && !store.monitoredControlMeasuresLoading &&
            !store.goalsLoading && !store.potentialRisksLoading && 
            !store.riskCausesLoading && !store.controlMeasuresLoading) {
            setProcessingComparativeData(false);
        }
      }
    }
    return () => {isActive = false;};
  }, [
    // Page specific state
    selectedSessionsDetails, sessionsDetailLoading, dependentDataLoading,
    // Auth context
    authLoading, isProfileComplete, currentUserId, currentPeriod,
    // Store data arrays (trigger re-run if these actual data arrays change)
    store.riskExposures, store.monitoredControlMeasuresData,
    store.controlMeasures, store.riskCauses, store.potentialRisks, store.goals,
    // Store loading flags (trigger re-run if loading state changes)
    store.riskExposuresLoading, store.monitoredControlMeasuresLoading,
    store.goalsLoading, store.potentialRisksLoading,
    store.riskCausesLoading, store.controlMeasuresLoading,
    toast // toast is stable
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
            <p className="text-muted-foreground">Tidak ada ID sesi yang valid ditemukan di URL atau sesi tidak ditemukan.</p>
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


    