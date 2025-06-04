
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ListTree, TableIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, FlatReportItem, RiskCategory } from '@/lib/types';
import { ComprehensiveReportTree } from '@/components/risks/comprehensive-report-tree';
import { ComprehensiveReportTable } from '@/components/risks/comprehensive-report-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { getControlTypeName, getCalculatedRiskLevel } from '@/lib/types'; // Import helper

const REVIEWED_UPR_ID_KEY = 'riskwise_reviewed_upr_id';
const REVIEWED_UPR_NAME_KEY = 'riskwise_reviewed_upr_name';
const REVIEWED_PERIOD_KEY = 'riskwise_reviewed_period';

export default function DataRisikoReviuPage() {
  const router = useRouter();
  const { currentUser, appUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const store = useAppStore();
  const { 
    goals: goalsFromStore, 
    potentialRisks: potentialRisksFromStore,
    riskCauses: riskCausesFromStore,
    controlMeasures: controlMeasuresFromStore,
    goalsLoading,
    potentialRisksLoading,
    riskCausesLoading,
    controlMeasuresLoading,
    triggerGlobalDataFetch,
    dataFetchedForUprPeriod: storeDataFetchedForUprPeriod,
    resetAllData: resetStoreDataForNewReview,
  } = store;

  const [uprIdForReview, setUprIdForReview] = useState<string | null>(null);
  const [uprNameForReview, setUprNameForReview] = useState<string | null>(null);
  const [periodForReview, setPeriodForReview] = useState<string | null>(null);
  
  const [selectedViewMode, setSelectedViewMode] = useState<'tree' | 'table'>('tree');
  const [isDataLoadingForReport, setIsDataLoadingForReport] = useState<boolean>(true);
  
  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]); // The auditor's UID
  const reviewerDisplayName = useMemo(() => appUser?.displayName || "Auditor/Reviu Internal", [appUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUprId = localStorage.getItem(REVIEWED_UPR_ID_KEY);
      const storedUprName = localStorage.getItem(REVIEWED_UPR_NAME_KEY);
      const storedPeriod = localStorage.getItem(REVIEWED_PERIOD_KEY);

      if (storedUprId && storedUprName && storedPeriod) {
        setUprIdForReview(storedUprId);
        setUprNameForReview(storedUprName);
        setPeriodForReview(storedPeriod);
      } else {
        toast({ title: "Konteks Reviu Hilang", description: "UPR atau Periode yang akan direviu tidak ditemukan. Mengarahkan kembali...", variant: "destructive" });
        router.replace('/reviu/pilih-konteks');
      }
    }
  }, [router, toast]);

  useEffect(() => {
    if (uprIdForReview && periodForReview && currentUserId && !authLoading) {
      const uniqueContextId = `${uprIdForReview}|${periodForReview}`;
      if (storeDataFetchedForUprPeriod !== uniqueContextId || goalsLoading || potentialRisksLoading || riskCausesLoading || controlMeasuresLoading) {
        console.log(`[DataRisikoReviuPage] Context for review is ${uniqueContextId}. Store context is ${storeDataFetchedForUprPeriod}. Triggering data fetch for review.`);
        setIsDataLoadingForReport(true);
        if (storeDataFetchedForUprPeriod !== null && storeDataFetchedForUprPeriod !== uniqueContextId) {
            resetStoreDataForNewReview();
        }
        // Pass currentUserId as the 'actualUserId' performing the fetch, even if data is for another UPR
        triggerGlobalDataFetch(uprIdForReview, periodForReview, currentUserId);
      } else {
        console.log(`[DataRisikoReviuPage] Data for review context ${uniqueContextId} already fetched and loaded.`);
        setIsDataLoadingForReport(false);
      }
    }
  }, [uprIdForReview, periodForReview, currentUserId, storeDataFetchedForUprPeriod, triggerGlobalDataFetch, authLoading, resetStoreDataForNewReview, goalsLoading, potentialRisksLoading, riskCausesLoading, controlMeasuresLoading]);
  
  useEffect(() => {
    if(uprIdForReview && periodForReview){
        const uniqueContextId = `${uprIdForReview}|${periodForReview}`;
        if (storeDataFetchedForUprPeriod === uniqueContextId && 
            !goalsLoading && 
            !potentialRisksLoading && 
            !riskCausesLoading && 
            !controlMeasuresLoading) {
        setIsDataLoadingForReport(false);
        console.log(`[DataRisikoReviuPage] All data for review context ${uniqueContextId} is now loaded.`);
        }
    }
  }, [uprIdForReview, periodForReview, storeDataFetchedForUprPeriod, goalsLoading, potentialRisksLoading, riskCausesLoading, controlMeasuresLoading]);

  const goalsForSelectedContext = useMemo(() => {
    if (!uprIdForReview || !periodForReview || !currentUserId) return [];
    // Filter goals by the UPR ID and Period being reviewed, NOT by the auditor's userId
    return goalsFromStore.filter(g => g.uprId === uprIdForReview && g.period === periodForReview);
  }, [goalsFromStore, uprIdForReview, periodForReview, currentUserId]);

  const flattenDataForTable = useCallback((): FlatReportItem[] => {
    if (!uprIdForReview || !periodForReview || !currentUserId || goalsForSelectedContext.length === 0) return [];
    console.log("[DataRisikoReviuPage] Flattening data for table...");

    const flatData: FlatReportItem[] = [];

    goalsForSelectedContext.forEach(goal => {
      const prs = potentialRisksFromStore.filter(pr => pr.goalId === goal.id && pr.uprId === uprIdForReview && pr.period === periodForReview);
      if (prs.length === 0) {
        flatData.push({
          goalCode: goal.code,
          goalName: goal.name,
          goalDescription: goal.description,
        });
      } else {
        prs.forEach(pr => {
          const rcs = riskCausesFromStore.filter(rc => rc.potentialRiskId === pr.id && rc.uprId === uprIdForReview && rc.period === periodForReview);
          if (rcs.length === 0) {
            flatData.push({
              goalCode: goal.code,
              goalName: goal.name,
              goalDescription: goal.description,
              potentialRiskCode: `${goal.code || 'S?'}.PR${pr.sequenceNumber || '?'}`,
              potentialRiskSequenceNumber: pr.sequenceNumber,
              potentialRiskDescription: pr.description,
              potentialRiskCategory: pr.category,
              potentialRiskOwner: pr.owner,
            });
          } else {
            rcs.forEach(rc => {
              const { level: rcLevel, score: rcScore } = getCalculatedRiskLevel(rc.likelihood, rc.impact);
              const cms = controlMeasuresFromStore.filter(cm => cm.riskCauseId === rc.id && cm.uprId === uprIdForReview && cm.period === periodForReview);
              if (cms.length === 0) {
                flatData.push({
                  goalCode: goal.code,
                  goalName: goal.name,
                  goalDescription: goal.description,
                  potentialRiskCode: `${goal.code || 'S?'}.PR${pr.sequenceNumber || '?'}`,
                  potentialRiskSequenceNumber: pr.sequenceNumber,
                  potentialRiskDescription: pr.description,
                  potentialRiskCategory: pr.category,
                  potentialRiskOwner: pr.owner,
                  riskCauseCode: `${goal.code || 'S?'}.PR${pr.sequenceNumber || '?'}.PC${rc.sequenceNumber || '?'}`,
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
              } else {
                cms.forEach(cm => {
                  flatData.push({
                    goalCode: goal.code,
                    goalName: goal.name,
                    goalDescription: goal.description,
                    potentialRiskCode: `${goal.code || 'S?'}.PR${pr.sequenceNumber || '?'}`,
                    potentialRiskSequenceNumber: pr.sequenceNumber,
                    potentialRiskDescription: pr.description,
                    potentialRiskCategory: pr.category,
                    potentialRiskOwner: pr.owner,
                    riskCauseCode: `${goal.code || 'S?'}.PR${pr.sequenceNumber || '?'}.PC${rc.sequenceNumber || '?'}`,
                    riskCauseSequenceNumber: rc.sequenceNumber,
                    riskCauseDescription: rc.description,
                    riskCauseSource: rc.source,
                    riskCauseKRI: rc.keyRiskIndicator,
                    riskCauseTolerance: rc.riskTolerance,
                    riskCauseLikelihood: rc.likelihood,
                    riskCauseImpact: rc.impact,
                    riskCauseLevel: rcLevel,
                    riskCauseScore: rcScore,
                    controlMeasureCode: `${goal.code || 'S?'}.PR${pr.sequenceNumber || '?'}.PC${rc.sequenceNumber || '?'}.${cm.controlType}.${cm.sequenceNumber || '?'}`,
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
              }
            });
          }
        });
      }
    });
    console.log(`[DataRisikoReviuPage] Flattened data generated: ${flatData.length} rows.`);
    return flatData;
  }, [uprIdForReview, periodForReview, currentUserId, goalsForSelectedContext, potentialRisksFromStore, riskCausesFromStore, controlMeasuresFromStore]);

  const flatTableData = useMemo(() => flattenDataForTable(), [flattenDataForTable]);

  const handleBackToSelection = () => {
    router.push('/reviu/pilih-konteks');
  };

  if (authLoading || !uprIdForReview || !uprNameForReview || !periodForReview) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mempersiapkan data reviu...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Laporan Risiko untuk Reviu - UPR: ${uprNameForReview}`}
        description={`Reviu Internal: ${reviewerDisplayName}. Periode Direviu: ${periodForReview}. Mode Tampilan: ${selectedViewMode === 'tree' ? 'Hierarki' : 'Tabel Datar'}.`}
        actions={
          <Button onClick={handleBackToSelection} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Ganti Konteks UPR/Periode
          </Button>
        }
      />

      <Card>
        <CardHeader>
            <CardTitle>Pilih Mode Tampilan Laporan</CardTitle>
        </CardHeader>
        <CardContent>
            <Tabs value={selectedViewMode} onValueChange={(value) => setSelectedViewMode(value as 'tree' | 'table')}>
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 h-auto max-w-md">
                    <TabsTrigger value="tree" disabled={isDataLoadingForReport} className="py-2 text-xs sm:text-sm"><ListTree className="mr-1 sm:mr-2 h-4 w-4" />Tampilan Hierarki</TabsTrigger>
                    <TabsTrigger value="table" disabled={isDataLoadingForReport} className="py-2 text-xs sm:text-sm"><TableIcon className="mr-1 sm:mr-2 h-4 w-4" />Tampilan Tabel Datar</TabsTrigger>
                </TabsList>
            </Tabs>
        </CardContent>
      </Card>

      {isDataLoadingForReport && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Memuat data risiko untuk UPR {uprNameForReview} periode {periodForReview}...</p>
        </div>
      )}

      {!isDataLoadingForReport && uprIdForReview && periodForReview && currentUserId && (
        <>
          {selectedViewMode === 'tree' && (
            <ComprehensiveReportTree 
              goals={goalsForSelectedContext} 
              userId={uprIdForReview} // For tree, we view data of the UPR, not the auditor's
              period={periodForReview} 
            />
          )}
          {selectedViewMode === 'table' && (
             <ComprehensiveReportTable data={flatTableData} period={periodForReview} />
          )}
           {!isDataLoadingForReport && goalsForSelectedContext.length === 0 && selectedViewMode === 'tree' && (
             <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">Tidak ada data sasaran ditemukan untuk UPR {uprNameForReview} periode {periodForReview}.</p>
            </div>
           )}
        </>
      )}
    </div>
  );
}
    
