
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Goal, PotentialRisk, RiskCause, RiskCategory, LikelihoodLevelDesc, ImpactLevelDesc, RiskSource, CalculatedRiskLevelCategory } from '@/lib/types';
import {getCalculatedRiskLevel, getRiskLevelColor, RISK_CATEGORIES, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, RISK_SOURCES } from '@/lib/types';
import { Loader2, ListChecks, Search, Filter, BarChart3, Settings2, Trash2, AlertTriangle, CheckCircle2, Columns } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { getGoals } from '@/services/goalService';
import { getPotentialRisksByGoalId } from '@/services/potentialRiskService';
import { getRiskCausesByPotentialRiskId, deleteRiskCauseAndSubCollections } from '@/services/riskCauseService';


interface EnrichedRiskCause extends RiskCause {
  potentialRiskDescription: string;
  potentialRiskCategory: RiskCategory | null;
  goalName: string;
  goalCode: string; 
  potentialRiskSequenceNumber: number; 
  // goalUprId and goalPeriod are no longer needed here as we operate under a single user context
  goalId: string;
}


const ALL_COLUMNS_CONFIG: Array<{ id: keyof ColumnVisibility; label: string; defaultVisible: boolean }> = [
  { id: 'sumber', label: 'Sumber', defaultVisible: true },
  { id: 'kri', label: 'KRI', defaultVisible: true },
  { id: 'toleransi', label: 'Toleransi', defaultVisible: true },
  { id: 'kemungkinan', label: 'Kemungkinan', defaultVisible: true },
  { id: 'dampak', label: 'Dampak', defaultVisible: true },
  { id: 'tingkatRisiko', label: 'Tingkat Risiko', defaultVisible: true },
  { id: 'potensiRisikoInduk', label: 'Potensi Risiko Induk', defaultVisible: false },
  { id: 'sasaranInduk', label: 'Sasaran Induk', defaultVisible: false },
];

type ColumnVisibility = {
  sumber: boolean;
  kri: boolean;
  toleransi: boolean;
  kemungkinan: boolean;
  dampak: boolean;
  tingkatRisiko: boolean;
  potensiRisikoInduk: boolean;
  sasaranInduk: boolean;
};

const ALL_POSSIBLE_CALCULATED_RISK_LEVELS: CalculatedRiskLevelCategory[] = ['Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'];


export default function RiskAnalysisPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, appUser, loading: authLoading } = useAuth(); // Menggunakan appUser dari context
  
  const [allEnrichedRiskCauses, setAllEnrichedRiskCauses] = useState<EnrichedRiskCause[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]); 
  
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]); 
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]); 
  const [selectedSources, setSelectedSources] = useState<RiskSource[]>([]);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<string[]>([]);
  
  const [selectedCauseIds, setSelectedCauseIds] = useState<string[]>([]);
  const [causeToDelete, setCauseToDelete] = useState<EnrichedRiskCause | null>(null);
  const [isSingleDeleteDialogOpen, setIsSingleDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    ALL_COLUMNS_CONFIG.reduce((acc, col) => {
      acc[col.id] = col.defaultVisible;
      return acc;
    }, {} as ColumnVisibility)
  );

  const toggleColumnVisibility = (columnId: keyof ColumnVisibility) => {
    setColumnVisibility(prev => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);

  const loadData = useCallback(async () => {
    console.log("[RiskAnalysisPage] loadData triggered. AuthLoading:", authLoading, "CurrentUser:", !!currentUser, "AppUser:", !!appUser);
    if (authLoading) {
      console.log("[RiskAnalysisPage] Auth is still loading, loadData will wait.");
      setIsLoading(true); // Ensure loading state is true if auth is loading
      return;
    }

    if (!currentUser || !currentUserId || !currentPeriod) {
        console.warn("[RiskAnalysisPage] loadData: currentUser, currentUserId, or currentPeriod is missing. Aborting.", { currentUserId, currentPeriod });
        setIsLoading(false);
        setAllEnrichedRiskCauses([]);
        setAllGoals([]);
        return;
    }
    console.log(`[RiskAnalysisPage] loadData: Starting data fetch for userId: ${currentUserId}, period: ${currentPeriod}`);
    setIsLoading(true);
    setAllEnrichedRiskCauses([]); // Reset before fetching
    setAllGoals([]); // Reset before fetching

    try {
        const goalsResult = await getGoals(currentUserId, currentPeriod);
        console.log("[RiskAnalysisPage] loadData: getGoals result:", goalsResult);

        let loadedGoals: Goal[] = [];
        if (goalsResult.success && goalsResult.goals) {
            loadedGoals = goalsResult.goals;
        } else {
            console.warn("[RiskAnalysisPage] loadData: Failed to load goals or no goals found:", goalsResult.message);
            toast({ title: "Peringatan Data Sasaran", description: goalsResult.message || "Tidak dapat memuat daftar sasaran.", variant: "default" });
            // Tidak melempar error, lanjutkan dengan array kosong untuk goals
        }
        setAllGoals(loadedGoals);
        console.log(`[RiskAnalysisPage] loadData: ${loadedGoals.length} goals loaded.`);

        let collectedEnrichedRiskCauses: EnrichedRiskCause[] = [];
        for (const goal of loadedGoals) {
            console.log(`[RiskAnalysisPage] loadData: Processing goal ID: ${goal.id}, Name: ${goal.name}`);
            const pRisks = await getPotentialRisksByGoalId(goal.id, currentUserId, currentPeriod);
            console.log(`[RiskAnalysisPage] loadData: Found ${pRisks.length} potential risks for goal ${goal.id}.`);

            for (const pRisk of pRisks) {
                console.log(`[RiskAnalysisPage] loadData: Processing potential risk ID: ${pRisk.id}, Description: ${pRisk.description}`);
                const causes = await getRiskCausesByPotentialRiskId(pRisk.id, currentUserId, currentPeriod);
                console.log(`[RiskAnalysisPage] loadData: Found ${causes.length} risk causes for potential risk ${pRisk.id}.`);

                const enrichedCauses = causes.map(cause => ({
                    ...cause,
                    potentialRiskDescription: pRisk.description,
                    potentialRiskCategory: pRisk.category,
                    potentialRiskSequenceNumber: pRisk.sequenceNumber || 0,
                    goalName: goal.name,
                    goalCode: goal.code || "", 
                    goalId: goal.id,
                }));
                collectedEnrichedRiskCauses.push(...enrichedCauses);
            }
        }
        console.log(`[RiskAnalysisPage] loadData: Total ${collectedEnrichedRiskCauses.length} enriched risk causes collected.`);
        setAllEnrichedRiskCauses(collectedEnrichedRiskCauses);
        setSelectedCauseIds([]);
    } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error("[RiskAnalysisPage] Error loading data for Risk Analysis page:", errorMessage);
        toast({ title: "Gagal Memuat Data", description: errorMessage || "Terjadi kesalahan saat memuat data analisis risiko.", variant: "destructive" });
        setAllEnrichedRiskCauses([]); // Pastikan reset jika ada error
        setAllGoals([]); // Pastikan reset jika ada error
    } finally {
        console.log("[RiskAnalysisPage] loadData finished, setting isLoading to false.");
        setIsLoading(false);
    }
  }, [currentUser, currentUserId, currentPeriod, toast, authLoading]); // authLoading ditambahkan sebagai dependensi

  useEffect(() => {
    // Efek ini akan berjalan saat komponen pertama kali dimuat dan setiap kali dependensi berubah.
    // authLoading ditambahkan untuk memastikan kita tidak mencoba loadData sebelum status auth siap.
    if (!authLoading && currentUserId && currentPeriod) {
      console.log("[RiskAnalysisPage] useEffect: Context ready (authLoading false, currentUserId, currentPeriod available). Calling loadData.");
      loadData();
    } else if (!authLoading && (!currentUser || !currentUserId || !currentPeriod)) {
        console.warn("[RiskAnalysisPage] useEffect: Context not fully ready after auth check. Clearing data and stopping loading.", { currentUser:!!currentUser, currentUserId, currentPeriod });
        setIsLoading(false); // Pastikan loading dihentikan jika konteks tidak siap
        setAllEnrichedRiskCauses([]);
        setAllGoals([]);
    } else if (authLoading) {
        console.log("[RiskAnalysisPage] useEffect: Auth is loading, waiting to call loadData.");
        setIsLoading(true); // Set loading true while auth is in progress
    }
  }, [loadData, currentUserId, currentPeriod, currentUser, authLoading]);

  const toggleCategoryFilter = (category: RiskCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const toggleGoalFilter = (goalId: string) => {
    setSelectedGoalIds(prev =>
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };
  
  const toggleSourceFilter = (source: RiskSource) => {
    setSelectedSources(prev =>
        prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const toggleRiskLevelFilter = (level: string) => {
    setSelectedRiskLevels(prev =>
        prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const filteredAndSortedCauses = useMemo(() => {
    let tempCauses = [...allEnrichedRiskCauses];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempCauses = tempCauses.filter(cause => 
        cause.description.toLowerCase().includes(lowerSearchTerm) ||
        (cause.keyRiskIndicator && cause.keyRiskIndicator.toLowerCase().includes(lowerSearchTerm)) ||
        cause.potentialRiskDescription.toLowerCase().includes(lowerSearchTerm) ||
        cause.goalName.toLowerCase().includes(lowerSearchTerm) ||
        `${cause.goalCode || ''}.PR${cause.potentialRiskSequenceNumber || ''}.PC${cause.sequenceNumber || ''}`.toLowerCase().includes(lowerSearchTerm)
      );
    }

    if (selectedCategories.length > 0) {
      tempCauses = tempCauses.filter(cause =>
        cause.potentialRiskCategory && selectedCategories.includes(cause.potentialRiskCategory)
      );
    }
    
    if (selectedGoalIds.length > 0) {
        tempCauses = tempCauses.filter(cause => selectedGoalIds.includes(cause.goalId));
    }

    if (selectedSources.length > 0) {
        tempCauses = tempCauses.filter(cause => selectedSources.includes(cause.source));
    }

    if (selectedRiskLevels.length > 0) {
        tempCauses = tempCauses.filter(cause => {
            const { level } = getCalculatedRiskLevel(cause.likelihood, cause.impact);
            return selectedRiskLevels.includes(level);
        });
    }

    return tempCauses.sort((a, b) => {
        const codeA = `${a.goalCode || 'S?'}.PR${a.potentialRiskSequenceNumber || 0}.PC${a.sequenceNumber || 0}`;
        const codeB = `${b.goalCode || 'S?'}.PR${b.potentialRiskSequenceNumber || 0}.PC${b.sequenceNumber || 0}`;
        return codeA.localeCompare(codeB, undefined, {numeric: true, sensitivity: 'base'});
    });
  }, [allEnrichedRiskCauses, searchTerm, selectedCategories, selectedGoalIds, selectedSources, selectedRiskLevels]);

  const handleSelectCause = (causeId: string, checked: boolean) => {
    setSelectedCauseIds(prev =>
      checked ? [...prev, causeId] : prev.filter(id => id !== causeId)
    );
  };

  const handleSelectAllVisibleCauses = (checked: boolean) => {
    if (checked) {
      setSelectedCauseIds(filteredAndSortedCauses.map(cause => cause.id));
    } else {
      setSelectedCauseIds([]);
    }
  };


  const handleDeleteSingleCause = (cause: EnrichedRiskCause) => {
    setCauseToDelete(cause);
    setIsSingleDeleteDialogOpen(true);
  };

  const confirmDeleteSingleCause = async () => {
    if (!causeToDelete || !currentUser || !currentUserId || !currentPeriod) {
      toast({ title: "Gagal Menghapus", description: "Konteks pengguna atau data penyebab tidak lengkap.", variant: "destructive" });
      return;
    }
    try {
      await deleteRiskCauseAndSubCollections(causeToDelete.id, currentUserId, currentPeriod);
      toast({ title: "Penyebab Risiko Dihapus", description: `Penyebab "${causeToDelete.description}" (Kode: ${causeToDelete.goalCode}.PR${causeToDelete.potentialRiskSequenceNumber}.PC${causeToDelete.sequenceNumber}) dan semua data pengendalian terkait telah dihapus.`, variant: "destructive" });
      loadData(); 
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("Error deleting single risk cause:", errorMessage);
      toast({ title: "Gagal Menghapus", description: errorMessage || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSingleDeleteDialogOpen(false);
      setCauseToDelete(null);
    }
  };

  const handleDeleteSelectedCauses = () => {
    if (selectedCauseIds.length === 0) {
      toast({ title: "Tidak Ada Penyebab Dipilih", description: "Harap pilih setidaknya satu penyebab risiko untuk dihapus.", variant: "destructive" });
      return;
    }
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmDeleteSelectedCauses = async () => {
    if (!currentUser || !currentUserId || !currentPeriod) {
      toast({ title: "Gagal Hapus Massal", description: "Konteks pengguna tidak lengkap.", variant: "destructive" });
      return;
    }
    let deletedCount = 0;
    const errors: string[] = [];

    for (const causeId of selectedCauseIds) {
        try {
            await deleteRiskCauseAndSubCollections(causeId, currentUserId, currentPeriod);
            deletedCount++;
        } catch (error: any) {
            const cause = allEnrichedRiskCauses.find(c => c.id === causeId);
            const errorMessage = error.message || String(error);
            console.error(`Gagal menghapus penyebab ${cause?.description || causeId}:`, errorMessage);
            errors.push(cause?.description || causeId);
        }
    }

    if (deletedCount > 0) {
        toast({ title: "Hapus Massal Selesai", description: `${deletedCount} penyebab risiko berhasil dihapus.`, variant: deletedCount === selectedCauseIds.length ? "default" : "warning" });
    }
    if (errors.length > 0) {
        toast({ title: "Gagal Menghapus Sebagian", description: `Gagal menghapus penyebab: ${errors.join(', ')}. Pesan: ${errors.length > 0 ? errors[0] : ''}`, variant: "destructive" });
    }
    
    loadData(); 
    setIsBulkDeleteDialogOpen(false);
  };

  const { totalCauses, completeCauses, incompleteCauses } = useMemo(() => {
    const total = allEnrichedRiskCauses.length;
    const complete = allEnrichedRiskCauses.filter(
      c => c.keyRiskIndicator && c.riskTolerance && c.likelihood && c.impact
    ).length;
    return {
      totalCauses: total,
      completeCauses: complete,
      incompleteCauses: total - complete,
    };
  }, [allEnrichedRiskCauses]);

  if (authLoading || (currentUser && !appUser)) { 
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data pengguna dan konteks...</p>
      </div>
    );
  }
  
  if (!currentUser && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-medium">Akses Dibatasi</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Silakan login untuk mengakses halaman Analisis Risiko.
        </p>
        <Button onClick={() => router.push('/login')} className="mt-6">
            Ke Halaman Login
        </Button>
      </div>
    );
  }
  
  if (isLoading && !authLoading) { // Hanya tampilkan loading spesifik halaman jika auth sudah selesai
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data analisis penyebab risiko...</p>
      </div>
    );
  }

  const relevantGoalsForFilter = Array.isArray(allGoals) ? allGoals.filter(g => g.userId === currentUserId && g.period === currentPeriod) : [];


  return (
    <div className="space-y-6">
      <PageHeader
        title={`Analisis Detail Penyebab Risiko`}
        description={`Lakukan analisis KRI, Toleransi, Kemungkinan, Dampak, dan Rencana Pengendalian untuk setiap penyebab risiko di UPR: ${appUser?.displayName || '...'}, Periode: ${currentPeriod || '...'}.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penyebab Risiko</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCauses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analisis Lengkap</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completeCauses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analisis Belum Lengkap</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incompleteCauses}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-4 justify-between items-center">
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
            <div className="relative flex-grow md:flex-grow-0 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Cari kode, penyebab, KRI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
            />
            </div>
            <div className="flex gap-2 flex-wrap">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Kategori PR {selectedCategories.length > 0 ? `(${selectedCategories.length})` : ''}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[250px]">
                <DropdownMenuLabel>Pilih Kategori Potensi Risiko</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[200px]">
                    {RISK_CATEGORIES.map((category) => (
                    <DropdownMenuCheckboxItem
                        key={category}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => toggleCategoryFilter(category)}
                    >
                        {category}
                    </DropdownMenuCheckboxItem>
                    ))}
                </ScrollArea>
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={relevantGoalsForFilter.length === 0}>
                    <Filter className="mr-2 h-4 w-4" />
                    Sasaran {selectedGoalIds.length > 0 ? `(${selectedGoalIds.length})` : ''}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[300px]">
                <DropdownMenuLabel>Pilih Sasaran Terkait</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {relevantGoalsForFilter.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                    {relevantGoalsForFilter.map((goal) => (
                        <DropdownMenuCheckboxItem
                        key={goal.id}
                        checked={selectedGoalIds.includes(goal.id)}
                        onCheckedChange={() => toggleGoalFilter(goal.id)}
                        >
                        {goal.code || '[Tanpa Kode]'} - {goal.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                    </ScrollArea>
                ) : (
                    <DropdownMenuItem disabled>Tidak ada sasaran tersedia</DropdownMenuItem>
                )}
                </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Sumber {selectedSources.length > 0 ? `(${selectedSources.length})` : ''}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Pilih Sumber Penyebab</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {RISK_SOURCES.map((source) => (
                    <DropdownMenuCheckboxItem
                    key={source}
                    checked={selectedSources.includes(source)}
                    onCheckedChange={() => toggleSourceFilter(source)}
                    >
                    {source}
                    </DropdownMenuCheckboxItem>
                ))}
                </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Level Risiko {selectedRiskLevels.length > 0 ? `(${selectedRiskLevels.length})` : ''}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Pilih Level Risiko Penyebab</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_POSSIBLE_CALCULATED_RISK_LEVELS.map((level) => (
                    <DropdownMenuCheckboxItem
                    key={level}
                    checked={selectedRiskLevels.includes(level)}
                    onCheckedChange={() => toggleRiskLevelFilter(level)}
                    >
                    {level}
                    </DropdownMenuCheckboxItem>
                ))}
                 <DropdownMenuCheckboxItem 
                    key="N/A"
                    checked={selectedRiskLevels.includes("N/A")}
                    onCheckedChange={() => toggleRiskLevelFilter("N/A")}
                    >
                    N/A (Belum Dianalisis)
                </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Columns className="mr-2 h-4 w-4" />
                  Kolom
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_COLUMNS_CONFIG.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={columnVisibility[col.id]}
                    onCheckedChange={() => toggleColumnVisibility(col.id)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
        </div>
         {selectedCauseIds.length > 0 && (
            <Button variant="destructive" onClick={handleDeleteSelectedCauses} className="mt-2 md:mt-0" disabled={!currentUser}>
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus ({selectedCauseIds.length}) yang Dipilih
            </Button>
        )}
      </div>

      {filteredAndSortedCauses.length === 0 && !isLoading && (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">
            {allEnrichedRiskCauses.length === 0 
              ? "Belum ada penyebab risiko yang teridentifikasi untuk dianalisis."
              : "Tidak ada penyebab risiko yang cocok dengan kriteria filter Anda."}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {allEnrichedRiskCauses.length === 0
              ? "Identifikasi potensi risiko dan penyebabnya terlebih dahulu di menu Identifikasi Risiko."
              : "Coba sesuaikan pencarian atau filter Anda."}
          </p>
        </div>
      )}

      {filteredAndSortedCauses.length > 0 && !isLoading && (
        <Card className="w-full">
          <CardContent className="p-0">
            <div className="relative w-full overflow-x-auto"> {/* Wrapper untuk scroll tabel */}
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[40px] sticky left-0 bg-background z-10">
                        <Checkbox
                            checked={selectedCauseIds.length === filteredAndSortedCauses.length && filteredAndSortedCauses.length > 0}
                            onCheckedChange={(checked) => handleSelectAllVisibleCauses(Boolean(checked))}
                            aria-label="Pilih semua penyebab yang terlihat"
                            disabled={filteredAndSortedCauses.length === 0 || !currentUser}
                        />
                    </TableHead>
                    <TableHead className="min-w-[120px] sticky left-10 bg-background z-10">Kode</TableHead>
                    <TableHead className="min-w-[250px] max-w-xs sticky left-[170px] bg-background z-10">Penyebab Potensi Risiko</TableHead>
                    {columnVisibility.sumber && <TableHead className="min-w-[100px]">Sumber</TableHead>}
                    {columnVisibility.kri && <TableHead className="min-w-[180px] max-w-xs">KRI</TableHead>}
                    {columnVisibility.toleransi && <TableHead className="min-w-[180px] max-w-xs">Toleransi</TableHead>}
                    {columnVisibility.kemungkinan && <TableHead className="min-w-[150px]">Kemungkinan</TableHead>}
                    {columnVisibility.dampak && <TableHead className="min-w-[150px]">Dampak</TableHead>}
                    {columnVisibility.tingkatRisiko && <TableHead className="min-w-[150px]">Tingkat Risiko</TableHead>}
                    {columnVisibility.potensiRisikoInduk && <TableHead className="min-w-[250px] max-w-xs">Potensi Risiko Induk</TableHead>}
                    {columnVisibility.sasaranInduk && <TableHead className="min-w-[200px] max-w-sm">Sasaran Induk</TableHead>}
                    <TableHead className="text-right w-[100px] sticky right-0 bg-background z-10 pr-4">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredAndSortedCauses.map((cause) => {
                    const {level: causeRiskLevelText, score: causeRiskScore} = getCalculatedRiskLevel(cause.likelihood, cause.impact);
                    const goalCodeDisplay = (cause.goalCode && cause.goalCode.trim() !== '') ? cause.goalCode : '[Tanpa Kode]';
                    const causeCode = `${goalCodeDisplay}.PR${cause.potentialRiskSequenceNumber || 'N/A'}.PC${cause.sequenceNumber || 'N/A'}`;
                    const returnPath = `/risk-analysis`;
                    return (
                        <Fragment key={cause.id}>
                        <TableRow>
                            <TableCell className="sticky left-0 bg-background z-10">
                            <Checkbox
                                checked={selectedCauseIds.includes(cause.id)}
                                onCheckedChange={(checked) => handleSelectCause(cause.id, Boolean(checked))}
                                aria-label={`Pilih penyebab ${cause.description}`}
                                disabled={!currentUser}
                            />
                            </TableCell>
                            <TableCell className="text-xs font-mono sticky left-10 bg-background z-10">{causeCode}</TableCell>
                            <TableCell className="font-medium text-xs max-w-xs truncate sticky left-[170px] bg-background z-10" title={cause.description}>{cause.description}</TableCell>
                            {columnVisibility.sumber && <TableCell className="text-xs"><Badge variant="outline">{cause.source}</Badge></TableCell>}
                            {columnVisibility.kri && <TableCell className="text-xs max-w-xs truncate" title={cause.keyRiskIndicator || ''}>{cause.keyRiskIndicator || '-'}</TableCell>}
                            {columnVisibility.toleransi && <TableCell className="text-xs max-w-xs truncate" title={cause.riskTolerance || ''}>{cause.riskTolerance || '-'}</TableCell>}
                            {columnVisibility.kemungkinan && <TableCell><Badge variant={cause.likelihood ? "outline" : "ghost"} className={`text-xs ${!cause.likelihood ? "text-muted-foreground" : ""}`}>{cause.likelihood ? `${cause.likelihood} (${LIKELIHOOD_LEVELS_DESC_MAP[cause.likelihood]})` : 'N/A'}</Badge></TableCell>}
                            {columnVisibility.dampak && <TableCell><Badge variant={cause.impact ? "outline" : "ghost"} className={`text-xs ${!cause.impact ? "text-muted-foreground" : ""}`}>{cause.impact ? `${cause.impact} (${IMPACT_LEVELS_DESC_MAP[cause.impact]})` : 'N/A'}</Badge></TableCell>}
                            {columnVisibility.tingkatRisiko && <TableCell><Badge className={`${getRiskLevelColor(causeRiskLevelText)} text-xs`}>{causeRiskLevelText === 'N/A' ? 'N/A' : `${causeRiskLevelText} (${causeRiskScore || 'N/A'})`}</Badge></TableCell>}
                            {columnVisibility.potensiRisikoInduk && 
                              <TableCell className="text-xs max-w-xs truncate" title={cause.potentialRiskDescription}>
                                PR{cause.potentialRiskSequenceNumber || 'N/A'} - {cause.potentialRiskDescription} 
                                {cause.potentialRiskCategory && <Badge variant="secondary" className="ml-1 text-[10px]">{cause.potentialRiskCategory}</Badge>}
                              </TableCell>
                            }
                            {columnVisibility.sasaranInduk && 
                              <TableCell className="text-xs max-w-sm truncate text-muted-foreground" title={cause.goalName}>
                                {goalCodeDisplay} - {cause.goalName}
                              </TableCell>
                            }
                            <TableCell className="text-right sticky right-0 bg-background z-10 pr-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Settings2 className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/risk-cause-analysis/${cause.id}?from=${encodeURIComponent(returnPath)}`}>
                                    <BarChart3 className="mr-2 h-4 w-4" /> Analisis Detail
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteSingleCause(cause)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={!currentUser}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus Penyebab
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        </Fragment>
                    );
                    })}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isSingleDeleteDialogOpen} onOpenChange={setIsSingleDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus penyebab risiko "{causeToDelete?.description}" (Kode: {causeToDelete?.goalCode}.PR{causeToDelete?.potentialRiskSequenceNumber}.PC{causeToDelete?.sequenceNumber})? Semua rencana pengendalian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setIsSingleDeleteDialogOpen(false); setCauseToDelete(null);}}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSingleCause} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Massal</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus {selectedCauseIds.length} penyebab risiko yang dipilih? Semua rencana pengendalian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsBulkDeleteDialogOpen(false)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelectedCauses} className="bg-destructive hover:bg-destructive/90">Hapus ({selectedCauseIds.length})</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


    