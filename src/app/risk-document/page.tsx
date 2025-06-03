
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Loader2, ListTree, TableIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore'; // Menggunakan Zustand store
import { ComprehensiveReportTree } from '@/components/risks/comprehensive-report-tree';
import type { Goal } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ComprehensiveReportPage() {
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  const router = useRouter();
  
  const goalsFromStore = useAppStore(state => state.goals);
  const goalsLoadingFromStore = useAppStore(state => state.goalsLoading);
  const triggerGlobalDataFetch = useAppStore(state => state.triggerGlobalDataFetch);
  const dataFetchedForPeriod = useAppStore(state => state.dataFetchedForPeriod);

  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  
  const currentUserId = useMemo(() => appUser?.uid, [appUser]);
  const availablePeriods = useMemo(() => appUser?.availablePeriods || [], [appUser]);
  const activePeriod = useMemo(() => appUser?.activePeriod, [appUser]);

  useEffect(() => {
    if (!authLoading && currentUser && appUser && activePeriod) {
      setSelectedPeriod(activePeriod);
    }
  }, [authLoading, currentUser, appUser, activePeriod]);
  
  useEffect(() => {
    if (!authLoading && currentUserId && selectedPeriod) {
      const storeContextIdentifier = `${currentUserId}|${selectedPeriod}`;
      // Trigger fetch if context changes or not fetched for selected period
      if (dataFetchedForPeriod !== storeContextIdentifier || goalsFromStore.filter(g=> g.period === selectedPeriod).length === 0) {
        console.log(`[CompReportPage] Triggering global fetch for ${storeContextIdentifier}`);
        setIsLoadingPage(true);
        triggerGlobalDataFetch(currentUserId, selectedPeriod).finally(() => {
           // Cek lagi apakah setelah fetch, goals untuk periode terpilih sudah ada
           // Ini penting karena triggerGlobalDataFetch mungkin asinkron dan goalsLoading bisa berubah
           const updatedGoals = useAppStore.getState().goals;
           if (updatedGoals.filter(g => g.period === selectedPeriod && g.userId === currentUserId).length > 0) {
             setIsLoadingPage(false);
           } else {
             // Jika setelah fetch data store masih kosong untuk periode dan user ini, kemungkinan memang tidak ada data
             // atau ada masalah fetch. Untuk UI, kita anggap loading selesai jika tidak ada lagi flag loading aktif.
             const stillLoading = useAppStore.getState().goalsLoading || useAppStore.getState().potentialRisksLoading || useAppStore.getState().riskCausesLoading || useAppStore.getState().controlMeasuresLoading;
             if(!stillLoading) setIsLoadingPage(false);
           }
        });
      } else {
         setIsLoadingPage(goalsLoadingFromStore);
      }
    } else if (!authLoading && (!currentUser || !isProfileComplete)) {
      router.push(currentUser ? '/settings' : '/login');
    }
  }, [authLoading, currentUser, currentUserId, selectedPeriod, triggerGlobalDataFetch, dataFetchedForPeriod, goalsFromStore, goalsLoadingFromStore, isProfileComplete, router]);


  const handlePeriodChange = (newPeriod: string) => {
    if (newPeriod && newPeriod !== selectedPeriod) {
      setSelectedPeriod(newPeriod);
      // Fetching akan di-trigger oleh useEffect di atas
    }
  };
  
  const goalsForSelectedPeriod = useMemo(() => {
    if (!selectedPeriod || !currentUserId) return [];
    return goalsFromStore.filter(g => g.userId === currentUserId && g.period === selectedPeriod);
  }, [goalsFromStore, selectedPeriod, currentUserId]);


  if (authLoading || (currentUser && !appUser) || (!selectedPeriod && isProfileComplete) ) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data pengguna dan laporan...</p>
      </div>
    );
  }

  if (!currentUser || !isProfileComplete) {
    // AppLayout akan menghandle redirect, ini hanya fallback
    return <p>Mengarahkan...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Dokumen Risiko Komprehensif"
        description={`Tampilan menyeluruh dari Sasaran hingga Tindakan Pengendalian untuk UPR: ${appUser?.displayName || '...'}, Periode: ${selectedPeriod || '...'}.`}
      />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border rounded-lg bg-card shadow">
        <div className="flex items-center gap-2">
          <Label htmlFor="reportPeriod" className="text-sm font-medium">Periode Laporan:</Label>
          <Select 
            value={selectedPeriod || ""} 
            onValueChange={handlePeriodChange}
            disabled={availablePeriods.length === 0}
          >
            <SelectTrigger id="reportPeriod" className="w-full sm:w-[180px]">
              <SelectValue placeholder="Pilih periode" />
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
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'tree' ? 'default' : 'outline'}
            onClick={() => setViewMode('tree')}
            size="sm"
          >
            <ListTree className="mr-2 h-4 w-4" />
            Mode Hierarki
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
            disabled // Fitur tabel datar belum diimplementasikan
            size="sm"
          >
            <TableIcon className="mr-2 h-4 w-4" />
            Mode Tabel Datar
          </Button>
        </div>
      </div>

      {isLoadingPage && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Memuat data laporan untuk periode {selectedPeriod}...</p>
        </div>
      )}

      {!isLoadingPage && viewMode === 'tree' && (
        <ComprehensiveReportTree 
          goals={goalsForSelectedPeriod} 
          userId={currentUserId || ""} 
          period={selectedPeriod || ""}
        />
      )}

      {!isLoadingPage && viewMode === 'table' && (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <p className="text-muted-foreground">Mode Tabel Datar sedang dalam pengembangan.</p>
        </div>
      )}
       {!isLoadingPage && goalsForSelectedPeriod.length === 0 && selectedPeriod && (
         <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <p className="text-muted-foreground">Tidak ada data sasaran ditemukan untuk periode {selectedPeriod} pada UPR ini.</p>
        </div>
       )}
    </div>
  );
}
    