
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ListTree, TableIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import type { Goal } from '@/lib/types';
import { ComprehensiveReportTree } from '@/components/risks/comprehensive-report-tree';
// import { ComprehensiveReportTable } from '@/components/risks/comprehensive-report-table'; // Akan di-uncomment nanti
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';

export default function ComprehensiveReportPage() {
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const store = useAppStore();
  const { 
    goals: goalsFromStore, 
    goalsLoading: goalsLoadingFromStore,
    triggerGlobalDataFetch,
    dataFetchedForPeriod: storeDataFetchedForPeriod
  } = store;

  const [selectedPeriodForReport, setSelectedPeriodForReport] = useState<string | null>(null);
  const [selectedViewMode, setSelectedViewMode] = useState<'tree' | 'table'>('tree');
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);
  const [isLoadingReportData, setIsLoadingReportData] = useState<boolean>(false);
  
  const currentUserId = useMemo(() => appUser?.uid, [appUser]); // Menggunakan appUser.uid sebagai userId untuk UPR
  const availablePeriods = useMemo(() => appUser?.availablePeriods || [], [appUser]);
  const activePeriodFromAuth = useMemo(() => appUser?.activePeriod, [appUser]);

  useEffect(() => {
    if (!authLoading && currentUser && appUser && activePeriodFromAuth && !selectedPeriodForReport) {
      setSelectedPeriodForReport(activePeriodFromAuth);
    }
  }, [authLoading, currentUser, appUser, activePeriodFromAuth, selectedPeriodForReport]);
  
  useEffect(() => {
    // Effect ini akan memantau perubahan setelah reportSubmitted dan loading store
    if (reportSubmitted && currentUserId && selectedPeriodForReport) {
      const uniqueId = `${currentUserId}|${selectedPeriodForReport}`;
      // Cek apakah data untuk konteks ini sudah selesai dimuat dari store
      if (storeDataFetchedForPeriod === uniqueId && !goalsLoadingFromStore) { // Ditambah !potentialRisksLoadingFromStore, dst. saat mode tabel diimplementasi
        setIsLoadingReportData(false);
        console.log(`[CompReportPage] Report data ready for ${uniqueId}.`);
      }
    }
  }, [reportSubmitted, currentUserId, selectedPeriodForReport, storeDataFetchedForPeriod, goalsLoadingFromStore]);


  const handleShowReport = async () => {
    if (!currentUserId || !selectedPeriodForReport) {
      toast({ title: "Error", description: "Pengguna atau periode tidak valid.", variant: "destructive"});
      return;
    }
    if (!selectedPeriodForReport) {
        toast({ title: "Periode Belum Dipilih", description: "Silakan pilih periode laporan terlebih dahulu.", variant: "warning"});
        return;
    }
    setReportSubmitted(true);
    setIsLoadingReportData(true);

    try {
        // Jika data untuk periode ini belum pernah di-fetch atau berbeda dari yang sudah ada, fetch ulang.
        const uniqueId = `${currentUserId}|${selectedPeriodForReport}`;
        if (storeDataFetchedForPeriod !== uniqueId) {
            console.log(`[CompReportPage] Triggering global data fetch for ${uniqueId} on report submission.`);
            await triggerGlobalDataFetch(currentUserId, selectedPeriodForReport, currentUserId); // Pass currentUserId as actualUserId for now
        } else {
            // Data sudah ada, mungkin tidak perlu fetch ulang, kecuali jika ada mekanisme refresh
            // Untuk saat ini, kita anggap data di store sudah up-to-date
            console.log(`[CompReportPage] Data for ${uniqueId} already marked as fetched. Proceeding to render.`);
            // Jika mode tree, data goals sudah cukup. Jika tabel, perlu semua data.
            if (selectedViewMode === 'tree' && !goalsLoadingFromStore) {
                setIsLoadingReportData(false);
            }
            // Untuk mode tabel, kita perlu menunggu semua data terkait (PR, RC, CM)
            // Logika ini akan lebih kompleks dan ditambahkan saat implementasi mode tabel
        }
    } catch (error) {
        console.error("[CompReportPage] Error triggering global data fetch:", error);
        toast({ title: "Gagal Memuat Data", description: "Terjadi kesalahan saat memulai pengambilan data laporan.", variant: "destructive"});
        setIsLoadingReportData(false);
        setReportSubmitted(false); // Reset agar pengguna bisa mencoba lagi
    }
  };
  
  const goalsForSelectedPeriod = useMemo(() => {
    if (!selectedPeriodForReport || !currentUserId) return [];
    return goalsFromStore.filter(g => g.userId === currentUserId && g.period === selectedPeriodForReport);
  }, [goalsFromStore, selectedPeriodForReport, currentUserId]);

  if (authLoading || (currentUser && !appUser) ) { // Menunggu appUser terisi
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
              period={selectedPeriodForReport} // Gunakan selectedPeriodForReport untuk konsistensi
            />
          )}
          {selectedViewMode === 'table' && (
            <Card>
              <CardHeader>
                <CardTitle>Laporan Tabel Datar - Periode: {selectedPeriodForReport}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Mode tabel datar akan diimplementasikan selanjutnya.</p>
                {/* Placeholder untuk <ComprehensiveReportTable data={flatTableData} /> */}
              </CardContent>
            </Card>
          )}
           {!isLoadingReportData && goalsForSelectedPeriod.length === 0 && selectedViewMode === 'tree' && (
             <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">Tidak ada data sasaran ditemukan untuk periode {selectedPeriodForReport} pada UPR ini.</p>
            </div>
           )}
        </>
      )}
    </div>
  );
}

    