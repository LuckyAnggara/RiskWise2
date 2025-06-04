
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ListTree, TableIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import type { Goal } from '@/lib/types';
import { ComprehensiveReportTree } from '@/components/risks/comprehensive-report-tree';
// import { ComprehensiveReportTable } from '@/components/risks/comprehensive-report-table'; // Akan di-uncomment nanti
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';

const AUDITED_UPR_ID_KEY = 'riskwise_audited_upr_id';
const AUDITED_UPR_NAME_KEY = 'riskwise_audited_upr_name';

export default function ViewAuditedUprRisksPage() {
  const router = useRouter();
  const { currentUser, appUser, loading: authLoading } = useAuth(); // Auditor role checked by layout
  const { toast } = useToast();
  
  const store = useAppStore();
  const { 
    goals: goalsFromStore, 
    goalsLoading: goalsLoadingFromStore,
    potentialRisksLoading: potentialRisksLoadingFromStore,
    riskCausesLoading: riskCausesLoadingFromStore,
    controlMeasuresLoading: controlMeasuresLoadingFromStore,
    triggerGlobalDataFetch,
    dataFetchedForUprPeriod: storeDataFetchedForUprPeriod,
    resetAllData: resetStoreDataForNewAudit,
  } = store;

  const [auditedUprId, setAuditedUprId] = useState<string | null>(null);
  const [auditedUprName, setAuditedUprName] = useState<string | null>(null);
  const [selectedViewMode, setSelectedViewMode] = useState<'tree' | 'table'>('tree');
  const [isDataLoadingForReport, setIsDataLoadingForReport] = useState<boolean>(true);
  
  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]); 
  const activePeriodFromAuth = useMemo(() => appUser?.activePeriod, [appUser]);
  const auditorDisplayName = useMemo(() => appUser?.displayName || "Auditor", [appUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUprId = localStorage.getItem(AUDITED_UPR_ID_KEY);
      const storedUprName = localStorage.getItem(AUDITED_UPR_NAME_KEY);
      if (storedUprId && storedUprName) {
        setAuditedUprId(storedUprId);
        setAuditedUprName(storedUprName);
      } else {
        toast({ title: "Konteks Audit Hilang", description: "UPR yang akan diaudit tidak ditemukan. Mengarahkan kembali...", variant: "destructive" });
        router.replace('/audit/select-upr');
      }
    }
  }, [router, toast]);

  useEffect(() => {
    // Fetch data when auditedUprId, activePeriodFromAuth, and currentUserId are available
    if (auditedUprId && activePeriodFromAuth && currentUserId && !authLoading) {
      const uniqueContextId = `${auditedUprId}|${activePeriodFromAuth}`;
      // If context is different from what's in store OR if essential data is still marked as loading (meaning a fetch might be in progress or failed)
      if (storeDataFetchedForUprPeriod !== uniqueContextId || goalsLoadingFromStore || potentialRisksLoadingFromStore || riskCausesLoadingFromStore || controlMeasuresLoadingFromStore) {
        console.log(`[ViewAuditedRisksPage] Context for audit is ${uniqueContextId}. Store context is ${storeDataFetchedForUprPeriod}. Triggering data fetch for audit.`);
        setIsDataLoadingForReport(true);
        // It's important to reset store if context is truly different to avoid data mixing
        if (storeDataFetchedForUprPeriod !== null && storeDataFetchedForUprPeriod !== uniqueContextId) {
            resetStoreDataForNewAudit();
        }
        triggerGlobalDataFetch(auditedUprId, activePeriodFromAuth, currentUserId);
      } else {
        // Data for this context is already fetched and no major store components are loading
        console.log(`[ViewAuditedRisksPage] Data for audit context ${uniqueContextId} already fetched and loaded.`);
        setIsDataLoadingForReport(false);
      }
    }
  }, [auditedUprId, activePeriodFromAuth, currentUserId, storeDataFetchedForUprPeriod, triggerGlobalDataFetch, authLoading, resetStoreDataForNewAudit, goalsLoadingFromStore, potentialRisksLoadingFromStore, riskCausesLoadingFromStore, controlMeasuresLoadingFromStore]);
  
  // Secondary effect to monitor if loading flags have turned false after a fetch
  useEffect(() => {
    if(auditedUprId && activePeriodFromAuth){
        const uniqueContextId = `${auditedUprId}|${activePeriodFromAuth}`;
        if (storeDataFetchedForUprPeriod === uniqueContextId && 
            !goalsLoadingFromStore && 
            !potentialRisksLoadingFromStore && 
            !riskCausesLoadingFromStore && 
            !controlMeasuresLoadingFromStore) {
        setIsDataLoadingForReport(false);
        console.log(`[ViewAuditedRisksPage] All data for audit context ${uniqueContextId} is now loaded.`);
        }
    }
  }, [auditedUprId, activePeriodFromAuth, storeDataFetchedForUprPeriod, goalsLoadingFromStore, potentialRisksLoadingFromStore, riskCausesLoadingFromStore, controlMeasuresLoadingFromStore]);


  const goalsForAuditedUpr = useMemo(() => {
    if (!auditedUprId || !activePeriodFromAuth || !currentUserId) return [];
    return goalsFromStore.filter(g => g.uprId === auditedUprId && g.period === activePeriodFromAuth && g.userId === currentUserId);
  }, [goalsFromStore, auditedUprId, activePeriodFromAuth, currentUserId]);

  const handleBackToSelection = () => {
    // Optionally clear local storage for audited UPR if desired upon navigating away
    // localStorage.removeItem(AUDITED_UPR_ID_KEY);
    // localStorage.removeItem(AUDITED_UPR_NAME_KEY);
    router.push('/audit/select-upr');
  };

  if (authLoading || !auditedUprId || !auditedUprName || !activePeriodFromAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mempersiapkan data audit...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dokumen Risiko untuk Audit UPR: ${auditedUprName}`}
        description={`Auditor: ${auditorDisplayName}. Periode Diaudit: ${activePeriodFromAuth}. Mode Tampilan: ${selectedViewMode === 'tree' ? 'Hierarki' : 'Tabel Datar'}.`}
        actions={
          <Button onClick={handleBackToSelection} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Ganti UPR
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
          <p className="text-muted-foreground">Memuat data risiko untuk UPR {auditedUprName} periode {activePeriodFromAuth}...</p>
        </div>
      )}

      {!isDataLoadingForReport && auditedUprId && activePeriodFromAuth && currentUserId && (
        <>
          {selectedViewMode === 'tree' && (
            <ComprehensiveReportTree 
              goals={goalsForAuditedUpr} 
              userId={currentUserId} 
              period={activePeriodFromAuth} 
            />
          )}
          {selectedViewMode === 'table' && (
            <Card>
              <CardHeader>
                <CardTitle>Laporan Tabel Datar - UPR: {auditedUprName}, Periode: {activePeriodFromAuth}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Tampilan tabel datar untuk auditor akan diimplementasikan selanjutnya. (Read-only)</p>
                {/* <ComprehensiveReportTable data={flatDataForTable} period={activePeriodFromAuth} /> */}
              </CardContent>
            </Card>
          )}
           {!isDataLoadingForReport && goalsForAuditedUpr.length === 0 && selectedViewMode === 'tree' && (
             <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">Tidak ada data sasaran ditemukan untuk UPR {auditedUprName} periode {activePeriodFromAuth}.</p>
            </div>
           )}
        </>
      )}
    </div>
  );
}
    