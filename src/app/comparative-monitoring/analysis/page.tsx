
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
import type { MonitoringSession, RiskCause, PotentialRisk, Goal, RiskExposure, MonitoredControlMeasureData, ControlMeasure } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getControlTypeName } from '@/lib/types';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";


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

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
];


export default function ComparativeAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  
  const store = useAppStore();

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [selectedSessionsDetails, setSelectedSessionsDetails] = useState<MonitoringSession[]>([]);
  const [comparativeData, setComparativeData] = useState<RiskCauseComparativeSummary[]>([]);
  
  const [sessionsDetailLoadingState, setSessionsDetailLoadingState] = useState(true);
  const [dependentDataLoadingState, setDependentDataLoadingState] = useState(true);
  const [processingComparativeDataState, setProcessingComparativeDataState] = useState(true);
  
  const isLoadingPage = useMemo(() => 
    authLoading || sessionsDetailLoadingState || dependentDataLoadingState || processingComparativeDataState,
    [authLoading, sessionsDetailLoadingState, dependentDataLoadingState, processingComparativeDataState]
  );

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);

  useEffect(() => {
    console.log("[AnalysisPage E1] Initializing session IDs from URL.");
    const idsQueryParam = searchParams.get('sessionIds');
    if (idsQueryParam) {
      const ids = idsQueryParam.split(',').filter(id => id.trim() !== '');
      if (ids.length > 0) {
        setSelectedSessionIds(ids);
        console.log("[AnalysisPage E1] Session IDs set from URL:", ids);
      } else if (!authLoading) { 
        toast({ title: "Error", description: "Tidak ada sesi yang valid dipilih untuk analisis.", variant: "destructive" });
        router.push('/comparative-monitoring');
      }
    } else if (!authLoading) {
      toast({ title: "Error", description: "Parameter ID Sesi hilang.", variant: "destructive" });
      router.push('/comparative-monitoring');
    }
  }, [searchParams, router, toast, authLoading]);

  useEffect(() => {
    let isActive = true;
    const loadSessionDetails = async () => {
      console.log("[AnalysisPage E2] Attempting to load session details. Selected IDs:", selectedSessionIds, "Context:", {currentUserId, currentPeriod, isProfileComplete});
      if (selectedSessionIds.length === 0 || !currentUserId || !currentPeriod || !isProfileComplete) {
        if (isActive) {
          setSessionsDetailLoadingState(false);
          setSelectedSessionsDetails([]);
           console.log("[AnalysisPage E2] Bailed: Missing pre-requisites for loading session details.");
        }
        return;
      }
      if(isActive) setSessionsDetailLoadingState(true);
      
      if (store.monitoringSessionsLoading) {
        console.log("[AnalysisPage E2] Waiting for global monitoring sessions to load from store.");
        return;
      }

      try {
        const allSessionsFromStore = store.monitoringSessions;
        console.log("[AnalysisPage E2] All sessions from store (count):", allSessionsFromStore.length);
        if (allSessionsFromStore.length === 0 && !store.monitoringSessionsLoading) {
          console.warn("[AnalysisPage E2] Monitoring sessions in store are empty, and store is not loading.");
           if (isActive) {
            setSelectedSessionsDetails([]);
           }
        } else {
            const details = selectedSessionIds
            .map(id => {
              const session = allSessionsFromStore.find(s => s.id === id && s.userId === currentUserId && s.period === currentPeriod);
              // console.log(`[AnalysisPage E2] Finding session ${id} for user ${currentUserId} period ${currentPeriod}:`, session ? 'Found' : 'Not Found');
              return session;
            })
            .filter(s => s !== undefined) as MonitoringSession[];
            
            if (isActive) {
            if (details.length !== selectedSessionIds.length) {
                console.warn(`[AnalysisPage E2] Not all selected sessions found or context mismatch. Expected ${selectedSessionIds.length}, found ${details.length}.`);
            }
            const sortedDetails = details.sort((a,b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
            setSelectedSessionsDetails(sortedDetails);
            console.log("[AnalysisPage E2] Session details successfully set (count):", sortedDetails.length);
            }
        }
      } catch (error) {
        if (isActive) {
          console.error("[AnalysisPage E2] Error loading session details:", error);
          toast({ title: "Gagal Memuat Detail Sesi", description: String(error), variant: "destructive" });
        }
      } finally {
        if(isActive) setSessionsDetailLoadingState(false);
      }
    };
    
    if (!authLoading) {
        loadSessionDetails();
    } else {
        console.log("[AnalysisPage E2] Skipping session detail load: auth is loading.");
    }
    return () => { isActive = false };
  }, [selectedSessionIds, currentUserId, currentPeriod, isProfileComplete, toast, store.monitoringSessions, store.monitoringSessionsLoading, authLoading]);


  useEffect(() => {
    let isActive = true;
    const fetchAllDependentData = async () => {
      console.log("[AnalysisPage E3] Attempting to fetch dependent data. Selected sessions count:", selectedSessionsDetails.length, "Sessions detail loading:", sessionsDetailLoadingState);
      if (selectedSessionsDetails.length === 0 || !currentUserId || !currentPeriod || sessionsDetailLoadingState) {
        if (isActive && !sessionsDetailLoadingState) {
            setDependentDataLoadingState(false);
            console.log("[AnalysisPage E3] Bailed: Missing pre-requisites for fetching dependent data or session details still loading.");
        }
        return;
      }
      if(isActive) setDependentDataLoadingState(true);
      
      try {
        const uniquePeriodIdentifier = `${currentUserId}|${currentPeriod}`;
        if (store.dataFetchedForPeriod !== uniquePeriodIdentifier) {
          console.warn(`[AnalysisPage E3] Global data for context ${uniquePeriodIdentifier} not yet marked as fetched. Current store.dataFetchedForPeriod: ${store.dataFetchedForPeriod}. This might lead to incomplete data for aggregation if global data (goals, PRs, etc.) is not ready.`);
        }

        const fetchPromises = selectedSessionsDetails.flatMap(session => {
          console.log(`[AnalysisPage E3] Initiating fetch for session ID: ${session.id}`);
          return [
            store.fetchRiskExposuresForSession(session.id, currentUserId, currentPeriod),
            store.fetchMonitoredControlMeasuresForSession(session.id, currentUserId, currentPeriod)
          ];
        });
        
        await Promise.all(fetchPromises);
        
        if (isActive) {
          console.log("[AnalysisPage E3] All dependent data fetch calls initiated/completed.");
        }
      } catch (error) {
        if (isActive) {
          console.error("[AnalysisPage E3] Error initiating dependent data fetch:", error);
          toast({ title: "Gagal Memuat Data Detail Pemantauan", description: String(error), variant: "destructive" });
        }
      } finally {
        if(isActive) setDependentDataLoadingState(false);
      }
    };
    fetchAllDependentData();
    return () => { isActive = false };
  }, [selectedSessionsDetails, currentUserId, currentPeriod, sessionsDetailLoadingState, store.fetchRiskExposuresForSession, store.fetchMonitoredControlMeasuresForSession, toast, store.dataFetchedForPeriod]);

 useEffect(() => {
    let isActive = true;
    
    const aggregateComparativeData = async () => {
      if(isActive) setProcessingComparativeDataState(true);

      const {
        riskExposures, monitoredControlMeasuresData, controlMeasures,
        riskCauses, potentialRisks, goals,
        riskExposuresLoading, monitoredControlMeasuresLoading, controlMeasuresLoading,
        riskCausesLoading, potentialRisksLoading, goalsLoading
      } = store;

      const globalDataStoresLoading = goalsLoading || potentialRisksLoading || riskCausesLoading || controlMeasuresLoading;
      const sessionSpecificDataStoresLoading = riskExposuresLoading || monitoredControlMeasuresLoading;

      const prerequisitesMet = 
        !authLoading && isProfileComplete && currentUserId && currentPeriod &&
        selectedSessionsDetails.length > 0 && 
        !sessionsDetailLoadingState && 
        !dependentDataLoadingState;

      console.log("[AnalysisPage E4] Checking prerequisites for aggregation. PrerequisitesMet:", prerequisitesMet, "GlobalStoresLoading:", globalDataStoresLoading, "SessionSpecificStoresLoading:", sessionSpecificDataStoresLoading, "Details:", {
          authLoading, isProfileComplete, currentUserIdP: !!currentUserId, currentPeriodP: !!currentPeriod,
          selectedSessionsDetailsLength: selectedSessionsDetails.length,
          sessionsDetailLoadingState, dependentDataLoadingState,
          riskExposuresLoading, monitoredControlMeasuresLoading,
          goalsLoading, potentialRisksLoading, riskCausesLoading, controlMeasuresLoading,
      });
      
      if (!prerequisitesMet || globalDataStoresLoading || sessionSpecificDataStoresLoading) {
        if(isActive) {
           console.log("[AnalysisPage E4] Skipping aggregation, prerequisites not met or data stores still loading.");
           if (!prerequisitesMet && !authLoading && !sessionsDetailLoadingState && !dependentDataLoadingState && !globalDataStoresLoading && !sessionSpecificDataStoresLoading) {
             console.log("[AnalysisPage E4] All loading complete, but other prerequisites failed. Setting processing to false.");
             setProcessingComparativeDataState(false);
             setComparativeData([]);
           }
        }
        return;
      }
      
      console.log("[AnalysisPage E4] Prerequisites MET and all data stores loaded. Proceeding with aggregation.");
      
      const allRiskCauseIdsAcrossSessions = new Set<string>();
      selectedSessionsDetails.forEach(s => s.riskCauseIdsToMonitor.forEach(rcId => allRiskCauseIdsAcrossSessions.add(rcId)));
      console.log("[AnalysisPage E4] Unique risk cause IDs to process:", Array.from(allRiskCauseIdsAcrossSessions));

      const aggregatedDataPromises = Array.from(allRiskCauseIdsAcrossSessions).map(async rcId => {
        const riskCause = riskCauses.find(rc => rc.id === rcId && rc.userId === currentUserId && rc.period === currentPeriod);
        if (!riskCause) {
          console.warn(`[AnalysisPage E4 - Aggregation] RiskCause with ID ${rcId} not found in store for current context.`);
          return null;
        }

        const potentialRisk = potentialRisks.find(pr => pr.id === riskCause.potentialRiskId && pr.userId === currentUserId && pr.period === currentPeriod);
        const goal = potentialRisk ? goals.find(g => g.id === potentialRisk.goalId && g.userId === currentUserId && g.period === currentPeriod) : null;

        const dataPoints: ComparativeDataPoint[] = [];
        for (const session of selectedSessionsDetails) {
          if (!session.riskCauseIdsToMonitor.includes(rcId)) continue;

          const exposure = riskExposures.find(re => re.monitoringSessionId === session.id && re.riskCauseId === rcId && re.userId === currentUserId && re.period === currentPeriod);
          const controlsDataForSessionAndCause = monitoredControlMeasuresData.filter(mcmd => mcmd.monitoringSessionId === session.id && mcmd.riskCauseId === rcId && mcmd.userId === currentUserId && mcmd.period === currentPeriod);
          // console.log(`[AnalysisPage E4 - Aggregation] For RC ${rcId}, Session ${session.id}: Found Exposure:`, exposure, `Found MonitoredControls:`, controlsDataForSessionAndCause.length);
          
          const controlPerformances = controlsDataForSessionAndCause.map(mcmd => {
              const controlDetail = controlMeasures.find(cm => cm.id === mcmd.controlMeasureId && cm.userId === currentUserId && cm.period === currentPeriod);
              // console.log(`[AnalysisPage E4 - Aggregation] Mapping MCMD ${mcmd.id} (Control ID: ${mcmd.controlMeasureId}): Performance ${mcmd.controlPerformance}, Control Detail:`, controlDetail);
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
           // console.log(`[AnalysisPage E4 - Aggregation] Generated dataPoints for RC ${rcId}:`, JSON.stringify(dataPoints));
          return {
            riskCauseId: rcId,
            riskCauseCode: `${potentialRisk?.goalCode || 'S?'}.PR${potentialRisk?.sequenceNumber || '?'}.PC${riskCause.sequenceNumber || '?'}`,
            riskCauseDescription: riskCause.description,
            potentialRiskDescription: potentialRisk?.description || "N/A",
            goalDescription: goal?.name || "N/A",
            dataPoints: dataPoints.sort((a,b) => new Date(a.sessionEndDate).getTime() - new Date(b.sessionEndDate).getTime()),
          };
        }
        console.warn(`[AnalysisPage E4 - Aggregation] No data points generated for RiskCause ID ${rcId}.`);
        return null;
      });

      try {
        const results = (await Promise.all(aggregatedDataPromises)).filter(item => item !== null) as RiskCauseComparativeSummary[];
        if (isActive) {
          setComparativeData(results.sort((a,b)=> a.riskCauseCode.localeCompare(b.riskCauseCode, undefined, {numeric:true, sensitivity:'base'})));
          console.log("[AnalysisPage E4] Aggregation complete. Final comparativeData (count):", results.length, "Data:", JSON.stringify(results));
        }
      } catch (error) {
        if (isActive) {
          console.error("[AnalysisPage E4] Error during data aggregation:", error);
          toast({ title: "Gagal Memproses Data Komparatif", description: String(error), variant: "destructive" });
        }
      } finally {
        if (isActive) setProcessingComparativeDataState(false);
      }
    };
    
    aggregateComparativeData();

    return () => {isActive = false;};
  }, [
    selectedSessionsDetails, sessionsDetailLoadingState, dependentDataLoadingState,
    authLoading, isProfileComplete, currentUserId, currentPeriod,
    store.riskExposures, store.monitoredControlMeasuresData,
    store.controlMeasures, store.riskCauses, store.potentialRisks, store.goals,
    store.riskExposuresLoading, store.monitoredControlMeasuresLoading,
    store.goalsLoading, store.potentialRisksLoading,
    store.riskCausesLoading, store.controlMeasuresLoading,
    toast 
  ]);


  if (isLoadingPage) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data analisis komparatif...</p>
        <p className="text-xs text-muted-foreground mt-2">Loading States: Auth({String(authLoading)}), Sessions({String(sessionsDetailLoadingState)}), Dependents({String(dependentDataLoadingState)}), Processing({String(processingComparativeDataState)})</p>
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

  const exposureChartConfig = {
    exposure: {
      label: "Paparan Risiko",
      color: chartColors[0],
    },
  } satisfies ChartConfig;


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
      
      {comparativeData.length === 0 && !isLoadingPage && selectedSessionsDetails.length > 0 && ( 
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Tidak ada data komparatif yang dapat ditampilkan untuk sesi yang dipilih.</p>
            <p className="text-sm text-muted-foreground">Ini mungkin karena tidak ada penyebab risiko yang sama dipantau di semua sesi yang dipilih, atau belum ada data paparan/kontrol yang tercatat.</p>
          </CardContent>
        </Card>
      )}

      {comparativeData.map(summary => {
        const exposureChartData = summary.dataPoints.map(dp => ({
          name: format(parseISO(dp.sessionEndDate), "dd MMM yy", { locale: localeID }),
          exposure: dp.exposureValue,
        }));
        // console.log(`[ChartData - ${summary.riskCauseCode}] Exposure Chart Data:`, JSON.stringify(exposureChartData));

        const uniqueControls: Map<string, { desc: string, type: string | null }> = new Map();
        summary.dataPoints.forEach(dp => {
          dp.controlPerformances.forEach(cp => {
            if (!uniqueControls.has(cp.controlId)) {
              uniqueControls.set(cp.controlId, { desc: cp.controlDesc, type: cp.controlType });
            }
          });
        });
        
        const controlPerformanceChartData = summary.dataPoints.map(dp => {
          const sessionData: { name: string; [key: string]: any } = {
            name: format(parseISO(dp.sessionEndDate), "dd MMM yy", { locale: localeID }),
          };
          uniqueControls.forEach((controlDetails, controlId) => {
            const perf = dp.controlPerformances.find(cp => cp.controlId === controlId);
            sessionData[controlDetails.desc] = perf ? perf.performance : null; 
          });
          return sessionData;
        });
        // console.log(`[ChartData - ${summary.riskCauseCode}] Control Performance Chart Data:`, JSON.stringify(controlPerformanceChartData));
        // console.log(`[ChartData - ${summary.riskCauseCode}] Unique Controls for Legend:`, Array.from(uniqueControls.entries()));

        const controlPerformanceChartConfig: ChartConfig = {};
        Array.from(uniqueControls.values()).forEach((controlDetails, index) => {
            controlPerformanceChartConfig[controlDetails.desc] = { 
                label: `${controlDetails.desc} (${controlDetails.type || 'N/A'})`,
                color: chartColors[index % chartColors.length],
            };
        });

        const hasAnyExposureData = exposureChartData.some(d => d.exposure !== null && d.exposure !== undefined);
        const hasAnyControlData = uniqueControls.size > 0 && controlPerformanceChartData.some(
          sessionData => Array.from(uniqueControls.values()).some(
            controlDetails => {
              const perfValue = sessionData[controlDetails.desc];
              return perfValue !== null && perfValue !== undefined;
            }
          )
        );

        return (
          <Card key={summary.riskCauseId}>
            <CardHeader>
              <CardTitle className="text-lg">{summary.riskCauseCode} - {summary.riskCauseDescription}</CardTitle>
              <CardDescription className="text-xs">
                Potensi Risiko: {summary.potentialRiskDescription} <br />
                Sasaran: {summary.goalDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-sm mb-2">Tren Paparan Risiko (Nilai KRI Penyebab Risiko)</h4>
                {exposureChartData.length > 0 && hasAnyExposureData ? (
                    <ChartContainer config={exposureChartConfig} className="h-[250px] w-full">
                    <LineChart data={exposureChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <RechartsLegend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="exposure" stroke={exposureChartConfig.exposure.color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={exposureChartConfig.exposure.label as string} connectNulls/>
                    </LineChart>
                    </ChartContainer>
                ) : (
                     <div className="p-4 border rounded-md bg-muted/30 text-center text-sm text-muted-foreground">
                        <BarChart2 className="inline-block h-5 w-5 mr-2" /> Tidak ada data paparan risiko untuk ditampilkan pada chart.
                    </div>
                )}
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
                 {controlPerformanceChartData.length > 0 && uniqueControls.size > 0 && hasAnyControlData ? (
                    <ChartContainer config={controlPerformanceChartConfig} className="h-[300px] w-full">
                    <LineChart data={controlPerformanceChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis domain={[0, 'dataMax + 10']} tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <RechartsLegend content={<ChartLegendContent wrapperStyle={{paddingTop: 10}} />} verticalAlign="bottom" />
                        {Array.from(uniqueControls.entries()).map(([controlId, controlDetails], index) => ( 
                        <Line
                            key={controlId} 
                            type="monotone"
                            dataKey={controlDetails.desc} 
                            stroke={chartColors[index % chartColors.length]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            name={`${controlDetails.desc} (${controlDetails.type || 'N/A'})`}
                            connectNulls
                        />
                        ))}
                    </LineChart>
                    </ChartContainer>
                ) : (
                     <div className="p-4 border rounded-md bg-muted/30 text-center text-sm text-muted-foreground">
                        <BarChart2 className="inline-block h-5 w-5 mr-2" /> Tidak ada data kinerja pengendalian untuk ditampilkan pada chart.
                    </div>
                )}
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
          );
        })}
    </div>
  );
}
        
