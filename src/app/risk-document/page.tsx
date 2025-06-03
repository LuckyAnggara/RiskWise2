
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ListTree, TableIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import { ComprehensiveReportTree } from '@/components/risks/comprehensive-report-tree';
import type { Goal } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';

export default function ComprehensiveReportPage() {
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const goalsFromStore = useAppStore(state => state.goals);
  const goalsLoadingFromStore = useAppStore(state => state.goalsLoading); // Initial loading of goals for the *selected* period
  const triggerGlobalDataFetch = useAppStore(state => state.triggerGlobalDataFetch);
  const storeDataFetchedForPeriod = useAppStore(state => state.dataFetchedForPeriod);

  const [selectedPeriodForReport, setSelectedPeriodForReport] = useState<string | null>(null);
  const [selectedViewMode, setSelectedViewMode] = useState<'tree' | 'table'>('tree');
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false); // Loading specifically after "Show Report" is clicked
  
  const currentUserId = useMemo(() => appUser?.uid, [appUser]);
  const availablePeriods = useMemo(() => appUser?.availablePeriods || [], [appUser]);
  const activePeriodFromAuth = useMemo(() => appUser?.activePeriod, [appUser]);

  useEffect(() => {
    if (!authLoading && currentUser && appUser && activePeriodFromAuth && !selectedPeriodForReport) {
      setSelectedPeriodForReport(activePeriodFromAuth);
    }
  }, [authLoading, currentUser, appUser, activePeriodFromAuth, selectedPeriodForReport]);
  
  // Effect to set isLoadingReport to false once goals for the selected period are loaded (or failed to load)
  useEffect(() => {
    if (reportSubmitted && !goalsLoadingFromStore) {
        // Check if dataFetchedForPeriod matches the one we requested
        if (currentUserId && selectedPeriodForReport && storeDataFetchedForPeriod === `${currentUserId}|${selectedPeriodForReport}`) {
            setIsLoadingReport(false);
            console.log(`[CompReportPage] Report loading finished for ${currentUserId}|${selectedPeriodForReport}. Goals loaded: ${goalsFromStore.filter(g => g.period === selectedPeriodForReport).length}`);
        } else if (currentUserId && selectedPeriodForReport && storeDataFetchedForPeriod !== null && storeDataFetchedForPeriod !== `${currentUserId}|${selectedPeriodForReport}`) {
            // This means a fetch for a *different* period completed. We are still waiting for ours.
            console.log(`[CompReportPage] Goals for a different period loaded (${storeDataFetchedForPeriod}). Waiting for ${currentUserId}|${selectedPeriodForReport}.`);
        } else if (currentUserId && selectedPeriodForReport && storeDataFetchedForPeriod === null && !goalsLoadingFromStore){
            // Fetch completed, but dataFetchedForPeriod not set (could be error in fetchGoals)
            setIsLoadingReport(false);
            console.warn(`[CompReportPage] Report loading finished for ${currentUserId}|${selectedPeriodForReport}, but dataFetchedForPeriod is null. Check for fetch errors.`);
        }
    }
  }, [reportSubmitted, goalsLoadingFromStore, currentUserId, selectedPeriodForReport, storeDataFetchedForPeriod, goalsFromStore]);


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
    setIsLoadingReport(true);
    // Trigger fetch for the *selected* period. 
    // The useEffect above will monitor goalsLoadingFromStore for this specific context.
    try {
        await triggerGlobalDataFetch(currentUserId, selectedPeriodForReport);
        // isLoadingReport will be set to false by the useEffect when goalsLoadingFromStore becomes false
        // for the context of currentUserId and selectedPeriodForReport
    } catch (error) {
        console.error("[CompReportPage] Error triggering global data fetch:", error);
        toast({ title: "Gagal Memuat Data", description: "Terjadi kesalahan saat memulai pengambilan data laporan.", variant: "destructive"});
        setIsLoadingReport(false);
        setReportSubmitted(false); // Allow user to try again
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
                        disabled={availablePeriods.length === 0 || isLoadingReport}
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
                            <TabsTrigger value="tree" disabled={isLoadingReport} className="py-2 text-xs sm:text-sm"><ListTree className="mr-1 sm:mr-2 h-4 w-4" />Hierarki</TabsTrigger>
                            <TabsTrigger value="table" disabled={isLoadingReport} className="py-2 text-xs sm:text-sm"><TableIcon className="mr-1 sm:mr-2 h-4 w-4" />Tabel Datar</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                
                <Button onClick={handleShowReport} disabled={!selectedPeriodForReport || isLoadingReport} className="w-full md:w-auto">
                    {isLoadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Tampilkan Laporan
                </Button>
            </div>
        </CardContent>
      </Card>

      {reportSubmitted && isLoadingReport && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Memuat data laporan untuk periode {selectedPeriodForReport}...</p>
        </div>
      )}

      {reportSubmitted && !isLoadingReport && selectedPeriodForReport && currentUserId && (
        <>
          {selectedViewMode === 'tree' && (
            <ComprehensiveReportTree 
              goals={goalsForSelectedPeriod} 
              userId={currentUserId} 
              period={selectedPeriodForReport}
            />
          )}
          {selectedViewMode === 'table' && (
            <Card>
              <CardHeader><CardTitle>Mode Tabel Datar</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-10">
                  Mode Tabel Datar sedang dalam pengembangan dan akan tersedia segera.
                </p>
              </CardContent>
            </Card>
          )}
           {!isLoadingReport && goalsForSelectedPeriod.length === 0 && (
             <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">Tidak ada data sasaran ditemukan untuk periode {selectedPeriodForReport} pada UPR ini.</p>
            </div>
           )}
        </>
      )}
    </div>
  );
}
