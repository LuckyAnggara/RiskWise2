
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ListTree, TableIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, RiskCategory, RiskSource, LikelihoodLevelDesc, ImpactLevelDesc, CalculatedRiskLevelCategory, ControlMeasureTypeKey } from '@/lib/types';
import { getCalculatedRiskLevel, getControlTypeName } from '@/lib/types';
import { ComprehensiveReportTree } from '@/components/risks/comprehensive-report-tree';
import { ComprehensiveReportTable } from '@/components/risks/comprehensive-report-table'; // Komponen baru
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';

export interface FlatReportItem {
  goalCode?: string;
  goalName?: string;
  goalDescription?: string;

  potentialRiskCode?: string;
  potentialRiskSequenceNumber?: number;
  potentialRiskDescription?: string;
  potentialRiskCategory?: RiskCategory | null;
  potentialRiskOwner?: string | null;

  riskCauseCode?: string;
  riskCauseSequenceNumber?: number;
  riskCauseDescription?: string;
  riskCauseSource?: RiskSource;
  riskCauseKRI?: string | null;
  riskCauseTolerance?: string | null;
  riskCauseLikelihood?: LikelihoodLevelDesc | null;
  riskCauseImpact?: ImpactLevelDesc | null;
  riskCauseLevel?: CalculatedRiskLevelCategory | 'N/A';
  riskCauseScore?: number | null;

  controlMeasureCode?: string;
  controlMeasureSequenceNumber?: number;
  controlMeasureDescription?: string;
  controlMeasureType?: ControlMeasureTypeKey | null;
  controlMeasureTypeName?: string | null;
  controlMeasureKCI?: string | null;
  controlMeasureTarget?: string | null;
  controlMeasurePIC?: string | null;
  controlMeasureDeadline?: string | null;
  controlMeasureBudget?: number | null;
}


export default function ComprehensiveReportPage() {
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const store = useAppStore();
  const { 
    goals: goalsFromStore, 
    potentialRisks: potentialRisksFromStore,
    riskCauses: riskCausesFromStore,
    controlMeasures: controlMeasuresFromStore,
    goalsLoading: goalsLoadingFromStore,
    potentialRisksLoading: potentialRisksLoadingFromStore,
    riskCausesLoading: riskCausesLoadingFromStore,
    controlMeasuresLoading: controlMeasuresLoadingFromStore,
    triggerGlobalDataFetch,
    dataFetchedForPeriod: storeDataFetchedForPeriod
  } = store;

  const [selectedPeriodForReport, setSelectedPeriodForReport] = useState<string | null>(null);
  const [selectedViewMode, setSelectedViewMode] = useState<'tree' | 'table'>('tree');
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);
  const [isLoadingReportData, setIsLoadingReportData] = useState<boolean>(false);
  const [flatTableData, setFlatTableData] = useState<FlatReportItem[]>([]);
  
  const currentUserId = useMemo(() => appUser?.uid, [appUser]);
  const availablePeriods = useMemo(() => appUser?.availablePeriods || [], [appUser]);
  const activePeriodFromAuth = useMemo(() => appUser?.activePeriod, [appUser]);

  useEffect(() => {
    if (!authLoading && currentUser && appUser && activePeriodFromAuth && !selectedPeriodForReport) {
      setSelectedPeriodForReport(activePeriodFromAuth);
    }
  }, [authLoading, currentUser, appUser, activePeriodFromAuth, selectedPeriodForReport]);
  
  const processDataForTable = () => {
    if (!selectedPeriodForReport || !currentUserId) return [];
    
    const processedData: FlatReportItem[] = [];
    const relevantGoals = goalsFromStore.filter(g => g.userId === currentUserId && g.period === selectedPeriodForReport);

    relevantGoals.forEach(goal => {
      const relevantPRs = potentialRisksFromStore.filter(pr => pr.goalId === goal.id && pr.userId === currentUserId && pr.period === selectedPeriodForReport);
      if (relevantPRs.length === 0) {
        processedData.push({
          goalCode: goal.code,
          goalName: goal.name,
          goalDescription: goal.description,
        });
        return;
      }

      relevantPRs.forEach(pr => {
        const relevantRCs = riskCausesFromStore.filter(rc => rc.potentialRiskId === pr.id && rc.userId === currentUserId && rc.period === selectedPeriodForReport);
        const prCode = `${goal.code || 'S?'}.PR${pr.sequenceNumber || '?'}`;
        if (relevantRCs.length === 0) {
          processedData.push({
            goalCode: goal.code,
            goalName: goal.name,
            goalDescription: goal.description,
            potentialRiskCode: prCode,
            potentialRiskSequenceNumber: pr.sequenceNumber,
            potentialRiskDescription: pr.description,
            potentialRiskCategory: pr.category,
            potentialRiskOwner: pr.owner,
          });
          return;
        }

        relevantRCs.forEach(rc => {
          const { level: rcLevel, score: rcScore } = getCalculatedRiskLevel(rc.likelihood, rc.impact);
          const rcCode = `${prCode}.PC${rc.sequenceNumber || '?'}`;
          const relevantCMs = controlMeasuresFromStore.filter(cm => cm.riskCauseId === rc.id && cm.userId === currentUserId && cm.period === selectedPeriodForReport);

          if (relevantCMs.length === 0) {
            processedData.push({
              goalCode: goal.code,
              goalName: goal.name,
              goalDescription: goal.description,
              potentialRiskCode: prCode,
              potentialRiskSequenceNumber: pr.sequenceNumber,
              potentialRiskDescription: pr.description,
              potentialRiskCategory: pr.category,
              potentialRiskOwner: pr.owner,
              riskCauseCode: rcCode,
              riskCauseSequenceNumber: rc.sequenceNumber,
              riskCauseDescription: rc.description,
              riskCauseSource: rc.source,
              riskCauseKRI: rc.keyRiskIndicator,
              riskCauseTolerance: rc.riskTolerance,
              riskCauseLikelihood: rc.likelihood,
              riskCauseImpact: rc.impact,
              riskCauseLevel: rcLevel,
              riskCauseScore: rcScore,
            });
            return;
          }

          relevantCMs.forEach(cm => {
            const cmCode = `${rcCode}.${cm.controlType}.${cm.sequenceNumber || '?'}`;
            processedData.push({
              goalCode: goal.code,
              goalName: goal.name,
              goalDescription: goal.description,
              potentialRiskCode: prCode,
              potentialRiskSequenceNumber: pr.sequenceNumber,
              potentialRiskDescription: pr.description,
              potentialRiskCategory: pr.category,
              potentialRiskOwner: pr.owner,
              riskCauseCode: rcCode,
              riskCauseSequenceNumber: rc.sequenceNumber,
              riskCauseDescription: rc.description,
              riskCauseSource: rc.source,
              riskCauseKRI: rc.keyRiskIndicator,
              riskCauseTolerance: rc.riskTolerance,
              riskCauseLikelihood: rc.likelihood,
              riskCauseImpact: rc.impact,
              riskCauseLevel: rcLevel,
              riskCauseScore: rcScore,
              controlMeasureCode: cmCode,
              controlMeasureSequenceNumber: cm.sequenceNumber,
              controlMeasureDescription: cm.description,
              controlMeasureType: cm.controlType,
              controlMeasureTypeName: getControlTypeName(cm.controlType),
              controlMeasureKCI: cm.keyControlIndicator,
              controlMeasureTarget: cm.target,
              controlMeasurePIC: cm.responsiblePerson,
              controlMeasureDeadline: cm.deadline,
              controlMeasureBudget: cm.budget,
            });
          });
        });
      });
    });
    return processedData;
  };

  useEffect(() => {
    if (reportSubmitted && currentUserId && selectedPeriodForReport) {
      const uniqueId = `${currentUserId}|${selectedPeriodForReport}`;
      const allDataLoaded = !goalsLoadingFromStore && !potentialRisksLoadingFromStore && !riskCausesLoadingFromStore && !controlMeasuresLoadingFromStore;
      
      if (storeDataFetchedForPeriod === uniqueId && allDataLoaded) {
        if (selectedViewMode === 'table') {
          console.log(`[CompReportPage] Processing data for table view for ${uniqueId}`);
          const processedData = processDataForTable();
          setFlatTableData(processedData);
        }
        setIsLoadingReportData(false);
        console.log(`[CompReportPage] Report data ready for ${uniqueId}.`);
      } else if (storeDataFetchedForPeriod !== uniqueId && !isLoadingReportData) {
        // This case might happen if user changes period *after* submitting a report for a different period.
        // The triggerGlobalDataFetch should handle this if handleShowReport is called again.
        console.log(`[CompReportPage] Data fetched for ${storeDataFetchedForPeriod}, but report is for ${uniqueId}. Waiting for correct data.`);
        // Data might still be loading if triggerGlobalDataFetch was just called.
      }
    }
  }, [
    reportSubmitted, currentUserId, selectedPeriodForReport, selectedViewMode,
    storeDataFetchedForPeriod, goalsLoadingFromStore, potentialRisksLoadingFromStore, 
    riskCausesLoadingFromStore, controlMeasuresLoadingFromStore,
    goalsFromStore, potentialRisksFromStore, riskCausesFromStore, controlMeasuresFromStore // Added dependencies for processDataForTable
  ]);


  const handleShowReport = async () => {
    if (!currentUserId || !selectedPeriodForReport) {
      toast({ title: "Error", description: "Pengguna atau periode tidak valid.", variant: "destructive"});
      return;
    }
    if (!selectedPeriodForReport) {
        toast({ title: "Periode Belum Dipilih", description: "Silakan pilih periode laporan terlebih dahulu.", variant: "warning"});
        return;
    }
    console.log(`[CompReportPage] handleShowReport: Period=${selectedPeriodForReport}, Mode=${selectedViewMode}`);
    setReportSubmitted(true);
    setIsLoadingReportData(true);
    setFlatTableData([]); // Clear previous table data

    try {
        // Always trigger fetch; store will manage if data for this context is already loaded
        await triggerGlobalDataFetch(currentUserId, selectedPeriodForReport);
        // The useEffect above will handle setting isLoadingReportData to false 
        // and processing table data once all necessary store data is loaded.
    } catch (error) {
        console.error("[CompReportPage] Error triggering global data fetch:", error);
        toast({ title: "Gagal Memuat Data", description: "Terjadi kesalahan saat memulai pengambilan data laporan.", variant: "destructive"});
        setIsLoadingReportData(false);
        setReportSubmitted(false);
    }
  };
  
  const goalsForSelectedPeriod = useMemo(() => {
    if (!selectedPeriodForReport || !currentUserId) return [];
    return goalsFromStore.filter(g => g.userId === currentUserId && g.period === selectedPeriodForReport);
  }, [goalsFromStore, selectedPeriodForReport, currentUserId]);

  if (authLoading || (currentUser && !appUser) ) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }

  if (!currentUser || !isProfileComplete) {
    return (
        <div className="text-center py-10">
            <p className="text-muted-foreground">
                {!currentUser ? "Silakan login." : "Harap lengkapi profil Anda di Pengaturan."}
            </p>
            <Button onClick={() => router.push(currentUser ? '/settings' : '/login')} className="mt-4">
                {!currentUser ? "Ke Halaman Login" : "Ke Pengaturan"}
            </Button>
        </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Dokumen Risiko Komprehensif"
        description={`Pilih periode dan mode tampilan untuk melihat laporan risiko. UPR: ${appUser?.displayName || '...'}, Periode Aplikasi Aktif: ${appUser?.activePeriod || '...'}.`}
      />

      <Card>
        <CardHeader>
            <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                    <Label htmlFor="reportPeriod">Periode Laporan</Label>
                    <Select 
                        value={selectedPeriodForReport || ""} 
                        onValueChange={setSelectedPeriodForReport}
                        disabled={availablePeriods.length === 0 || isLoadingReportData}
                    >
                        <SelectTrigger id="reportPeriod" className="w-full">
                        <SelectValue placeholder="Pilih periode laporan" />
                        </SelectTrigger>
                        <SelectContent>
                        {availablePeriods.length > 0 ? (
                            availablePeriods.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="no-periods" disabled>Belum ada periode.</SelectItem>
                        )}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="space-y-1.5">
                    <Label>Mode Tampilan</Label>
                    <Tabs value={selectedViewMode} onValueChange={(value) => setSelectedViewMode(value as 'tree' | 'table')}>
                        <TabsList className="grid w-full grid-cols-2 h-auto">
                            <TabsTrigger value="tree" disabled={isLoadingReportData} className="py-2 text-xs sm:text-sm"><ListTree className="mr-1 sm:mr-2 h-4 w-4" />Hierarki</TabsTrigger>
                            <TabsTrigger value="table" disabled={isLoadingReportData} className="py-2 text-xs sm:text-sm"><TableIcon className="mr-1 sm:mr-2 h-4 w-4" />Tabel Datar</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                
                <Button onClick={handleShowReport} disabled={!selectedPeriodForReport || isLoadingReportData} className="w-full md:w-auto">
                    {isLoadingReportData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Tampilkan Laporan
                </Button>
            </div>
        </CardContent>
      </Card>

      {reportSubmitted && isLoadingReportData && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Memuat data laporan untuk periode {selectedPeriodForReport}...</p>
        </div>
      )}

      {reportSubmitted && !isLoadingReportData && selectedPeriodForReport && currentUserId && (
        <>
          {selectedViewMode === 'tree' && (
            <ComprehensiveReportTree 
              goals={goalsForSelectedPeriod} 
              userId={currentUserId} 
              period={selectedPeriodForReport}
            />
          )}
          {selectedViewMode === 'table' && (
             <ComprehensiveReportTable data={flatTableData} period={selectedPeriodForReport} />
          )}
           {!isLoadingReportData && goalsForSelectedPeriod.length === 0 && selectedViewMode === 'tree' && (
             <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">Tidak ada data sasaran ditemukan untuk periode {selectedPeriodForReport} pada UPR ini untuk ditampilkan dalam mode hierarki.</p>
            </div>
           )}
           {!isLoadingReportData && flatTableData.length === 0 && selectedViewMode === 'table' && (
             <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">Tidak ada data yang dapat ditampilkan dalam mode tabel datar untuk periode {selectedPeriodForReport} pada UPR ini, atau semua data belum termuat sepenuhnya.</p>
            </div>
           )}
        </>
      )}
    </div>
  );
}
