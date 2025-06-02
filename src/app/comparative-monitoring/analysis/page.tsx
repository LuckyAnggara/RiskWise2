
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, AlertTriangle, BarChart2, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import type { MonitoringSession, RiskCause, RiskExposure, MonitoredControlMeasureData, PotentialRisk, Goal } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getRiskLevelColor, getCalculatedRiskLevel, getControlTypeName } from '@/lib/types';

interface ComparativeDataPoint {
  sessionId: string;
  sessionName: string;
  sessionEndDate: string;
  exposureValue: number | null;
  controlPerformances: Array<{ controlId: string; controlDesc: string; performance: number | null }>;
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
  
  const { 
    getMonitoringSessionByIdFromState,
    fetchRiskExposuresForSession,
    riskExposures,
    fetchMonitoredControlMeasuresForSession,
    monitoredControlMeasuresData,
    getRiskCauseById,
    getPotentialRiskById,
    getGoalById,
  } = useAppStore();

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [selectedSessionsDetails, setSelectedSessionsDetails] = useState<MonitoringSession[]>([]);
  const [comparativeData, setComparativeData] = useState<RiskCauseComparativeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);

  useEffect(() => {
    const idsQueryParam = searchParams.get('sessionIds');
    if (idsQueryParam) {
      setSelectedSessionIds(idsQueryParam.split(','));
    } else {
      toast({ title: "Error", description: "Tidak ada sesi yang dipilih untuk analisis.", variant: "destructive" });
      router.push('/comparative-monitoring');
    }
  }, [searchParams, router, toast]);

  useEffect(() => {
    const loadAnalysisData = async () => {
      if (selectedSessionIds.length === 0 || !currentUserId || !currentPeriod) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      try {
        const sessionDetailsPromises = selectedSessionIds.map(id => getMonitoringSessionByIdFromState(id));
        const sessions = (await Promise.all(sessionDetailsPromises)).filter(s => s !== null) as MonitoringSession[];
        setSelectedSessionsDetails(sessions.sort((a,b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()));

        // Fetch exposures and control data for all selected sessions
        for (const session of sessions) {
          await fetchRiskExposuresForSession(session.id, currentUserId, currentPeriod);
          await fetchMonitoredControlMeasuresForSession(session.id, currentUserId, currentPeriod);
        }
        
        // Aggregate data after all fetches are complete
        const allRiskCauseIdsAcrossSessions = new Set<string>();
        sessions.forEach(s => s.riskCauseIdsToMonitor.forEach(rcId => allRiskCauseIdsAcrossSessions.add(rcId)));

        const aggregatedData: RiskCauseComparativeSummary[] = [];

        for (const rcId of Array.from(allRiskCauseIdsAcrossSessions)) {
          const riskCause = await getRiskCauseById(rcId, currentUserId, currentPeriod);
          if (!riskCause) continue;

          const potentialRisk = await getPotentialRiskById(riskCause.potentialRiskId, currentUserId, currentPeriod);
          const goal = potentialRisk ? await getGoalById(potentialRisk.goalId, currentUserId, currentPeriod) : null;

          const dataPoints: ComparativeDataPoint[] = [];
          for (const session of sessions) {
            if (!session.riskCauseIdsToMonitor.includes(rcId)) continue; // Skip if this cause wasn't monitored in this session

            const exposure = riskExposures.find(re => re.monitoringSessionId === session.id && re.riskCauseId === rcId);
            const controlsData = monitoredControlMeasuresData.filter(mcmd => mcmd.monitoringSessionId === session.id && mcmd.riskCauseId === rcId);
            
            const controlPerformances = controlsData.map(mcmd => {
                // Potentially fetch control details if needed for description, for now use ID
                const controlDetail = useAppStore.getState().controlMeasures.find(cm => cm.id === mcmd.controlMeasureId);
                return {
                    controlId: mcmd.controlMeasureId,
                    controlDesc: controlDetail?.description || "Pengendalian tidak ditemukan",
                    performance: mcmd.controlPerformance
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
          
          if (dataPoints.length > 0) { // Only add if there's data for this cause in at least one selected session
            aggregatedData.push({
              riskCauseId: rcId,
              riskCauseCode: `${potentialRisk?.goalCode || 'S?'}.PR${potentialRisk?.sequenceNumber || '?'}.PC${riskCause.sequenceNumber || '?'}`,
              riskCauseDescription: riskCause.description,
              potentialRiskDescription: potentialRisk?.description || "N/A",
              goalDescription: goal?.name || "N/A",
              dataPoints: dataPoints.sort((a,b) => new Date(a.sessionEndDate).getTime() - new Date(b.sessionEndDate).getTime()),
            });
          }
        }
        setComparativeData(aggregatedData.sort((a,b)=> a.riskCauseCode.localeCompare(b.riskCauseCode, undefined, {numeric:true, sensitivity:'base'})));

      } catch (error: any) {
        toast({ title: "Gagal Memuat Data Analisis", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
        console.error("Error loading comparative analysis data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedSessionIds.length > 0 && currentUserId && currentPeriod && isProfileComplete) {
      loadAnalysisData();
    }
  }, [selectedSessionIds, currentUserId, currentPeriod, isProfileComplete, getMonitoringSessionByIdFromState, fetchRiskExposuresForSession, fetchMonitoredControlMeasuresForSession, riskExposures, monitoredControlMeasuresData, getRiskCauseById, getPotentialRiskById, getGoalById, toast]);

  if (authLoading || isLoading) {
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
          <ul className="list-disc list-inside text-sm">
            {selectedSessionsDetails.map(s => (
              <li key={s.id}>{s.name} (Selesai: {format(parseISO(s.endDate), "dd MMM yyyy", { locale: localeID })})</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      
      {comparativeData.length === 0 && !isLoading && (
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
              <h4 className="font-semibold text-sm mb-2">Tren Paparan Risiko (Nilai KRI)</h4>
              {/* Placeholder untuk Chart Paparan Risiko */}
              <div className="p-4 border rounded-md bg-muted/30 text-center text-sm text-muted-foreground">
                <BarChart2 className="inline-block h-5 w-5 mr-2" /> Visualisasi Tren Paparan Risiko akan ditampilkan di sini.
              </div>
              <ul className="text-xs mt-2 space-y-1">
                {summary.dataPoints.map(dp => (
                    <li key={dp.sessionId}>
                        <strong>{dp.sessionName}</strong> ({format(parseISO(dp.sessionEndDate), "dd MMM yy", { locale: localeID })}): Nilai Paparan = {dp.exposureValue ?? 'N/A'}
                    </li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2">Tren Kinerja Pengendalian (%)</h4>
              {/* Placeholder untuk Chart Kinerja Pengendalian */}
              <div className="p-4 border rounded-md bg-muted/30 text-center text-sm text-muted-foreground">
                <BarChart2 className="inline-block h-5 w-5 mr-2" /> Visualisasi Tren Kinerja Pengendalian akan ditampilkan di sini.
              </div>
               <ul className="text-xs mt-2 space-y-1">
                {summary.dataPoints.map(dp => (
                  <li key={`${dp.sessionId}-controls`}>
                    <strong>{dp.sessionName}</strong> ({format(parseISO(dp.sessionEndDate), "dd MMM yy", { locale: localeID })}):
                    {dp.controlPerformances.length > 0 ? (
                      <ul className="list-disc list-inside pl-4">
                        {dp.controlPerformances.map(cp => (
                          <li key={cp.controlId}>{cp.controlDesc.substring(0,50)}... : {cp.performance !== null ? `${cp.performance}%` : 'N/A'}</li>
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
                <FileText className="inline-block h-5 w-5 mr-2" />
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
