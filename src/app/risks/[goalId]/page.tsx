
"use client";

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RiskIdentificationCard } from '@/components/risks/risk-identification-card';
import { RiskListItem } from '@/components/risks/risk-list-item';
import type { Goal, PotentialRisk, RiskCause, RiskCategory } from '@/lib/types';
import { RISK_CATEGORIES } from '@/lib/types';
import { ArrowLeft, ShieldAlert, Loader2, Edit, Trash2, Settings2, PlusCircle, Copy, Search, Filter, LayoutGrid, List, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/auth-context';
import { getGoalById } from '@/services/goalService'; 
import { getPotentialRisksByGoalId, addPotentialRisk, deletePotentialRiskAndSubCollections } from '@/services/potentialRiskService';
import { getRiskCausesByPotentialRiskId } from '@/services/riskCauseService';

const DEFAULT_PERIOD = new Date().getFullYear().toString();

export default function GoalRisksPage() {
  const router = useRouter();
  const params = useParams();
  const searchParamsHook = useSearchParams();
  const goalId = params.goalId as string;
  const { currentUser, appUser, loading: authLoading } = useAuth();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [potentialRisks, setPotentialRisks] = useState<PotentialRisk[]>([]);
  const [riskCauseCounts, setRiskCauseCounts] = useState<Record<string, number>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]);
  const [allRiskOwnersForGoal, setAllRiskOwnersForGoal] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<PotentialRisk | null>(null);
  const [isSingleDeleteDialogOpen, setIsSingleDeleteDialogOpen] = useState(false);

  const [deletingRiskId, setDeletingRiskId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  const { toast } = useToast();
  
  const currentUprId = useMemo(() => appUser?.uprId || null, [appUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || DEFAULT_PERIOD, [appUser]);

  const loadData = useCallback(async () => {
    if (!currentUser || !goalId || !currentUprId || !currentPeriod) {
        setIsLoading(false);
        setGoal(null);
        setPotentialRisks([]);
        setAllRiskOwnersForGoal([]);
        setRiskCauseCounts({});
        return;
    }
    setIsLoading(true);
    try {
      // Fetch goal using currentUprId (derived from appUser.uprId) and currentPeriod
      const currentGoalResult = await getGoalById(goalId, currentUprId, currentPeriod); 

      const uniqueOwners = new Set<string>();
      const causeCounts: Record<string,number> = {};

      // Validate if the fetched goal matches the context
      if (currentGoalResult && currentGoalResult.uprId === currentUprId && currentGoalResult.period === currentPeriod) {
        setGoal(currentGoalResult);
        const currentPotentialRisks = await getPotentialRisksByGoalId(goalId, currentUprId, currentPeriod);
        setPotentialRisks(currentPotentialRisks);
        for (const pRisk of currentPotentialRisks) {
          if (pRisk.owner) uniqueOwners.add(pRisk.owner);
          // Pass currentUprId and currentPeriod to fetch risk causes, ensuring context consistency
          const causes = await getRiskCausesByPotentialRiskId(pRisk.id, currentUprId, currentPeriod);
          causeCounts[pRisk.id] = causes.length;
        }
      } else if (currentGoalResult) { 
        // Goal found but doesn't match context (e.g., wrong UPR/period)
        toast({
          title: "Konteks Tidak Cocok",
          description: `Sasaran "${currentGoalResult.name}" (ID: ${goalId}) tidak termasuk dalam konteks UPR ${currentUprId} dan periode ${currentPeriod} yang aktif.`,
          variant: "warning",
          duration: 7000,
        });
        setGoal(null); 
        setPotentialRisks([]);
      } else { 
         // Goal not found at all for the given ID, UPR, and Period
         setGoal(null);
         setPotentialRisks([]);
         toast({title: "Sasaran Tidak Ditemukan", description: `Sasaran dengan ID ${goalId} tidak ditemukan dalam konteks UPR ${currentUprId} dan periode ${currentPeriod}.`, variant: "destructive"});
         router.push("/goals");
      }
      setAllRiskOwnersForGoal(Array.from(uniqueOwners).sort());
      setRiskCauseCounts(causeCounts);
      setSelectedRiskIds([]); 
    } catch (error: any) {
        console.error("Error loading data for GoalRisksPage:", error.message);
        toast({title: "Gagal Memuat Data", description: `Tidak dapat mengambil data sasaran dan risiko: ${error.message}`, variant: "destructive"});
        setGoal(null); 
    } finally {
        setIsLoading(false);
    }
  }, [goalId, currentUprId, currentPeriod, currentUser, toast, router]);

  useEffect(() => {
    // Ensure all necessary context from appUser is available before loading data
    if (currentUser && appUser && appUser.uprId && appUser.activePeriod && goalId) {
      loadData();
    } else if (!authLoading && !currentUser) {
      setIsLoading(false); 
      router.push('/login'); 
    } else if (currentUser && appUser && (!appUser.uprId || !appUser.activePeriod) && !authLoading) {
        // User is logged in, appUser profile exists, but uprId or activePeriod is missing.
        setIsLoading(false);
        toast({ title: "Konteks Tidak Lengkap", description: "UPR atau periode aktif pengguna tidak ditemukan. Harap periksa pengaturan profil Anda.", variant: "warning"});
        router.push('/settings');
    } else if (currentUser && !goalId && !authLoading) { // Goal ID is missing
        setIsLoading(false);
        toast({ title: "ID Sasaran Hilang", description: "Tidak ada ID sasaran yang diberikan untuk ditampilkan.", variant: "destructive"});
        router.push('/goals');
    }
    // else, if authLoading or appUser is still loading, isLoading remains true or is handled by the initial state.
  }, [loadData, currentUser, appUser, authLoading, goalId, router, toast]);


  const handlePotentialRisksIdentified = (newlyCreatedPRsFromAI: PotentialRisk[]) => {
    if (!goal) return;
    loadData(); 
    toast({
        title: "Potensi Risiko Disimpan!",
        description: `${newlyCreatedPRsFromAI.length} potensi risiko baru dari AI telah ditambahkan dan disimpan.`,
    });
  };
  
  const handleDeleteSingleRisk = (pRisk: PotentialRisk) => {
    if(!currentUser || !currentUprId || !currentPeriod) {
      toast({ title: "Aksi Dibatalkan", description: "Konteks pengguna tidak lengkap.", variant: "warning"});
      return;
    }
    setRiskToDelete(pRisk);
    setIsSingleDeleteDialogOpen(true);
  };
  
  const confirmDeleteSingleRisk = async () => {
    if (!goal || !riskToDelete || !currentUser || !currentUprId || !currentPeriod) return;
    
    setDeletingRiskId(riskToDelete.id);
    try {
      await deletePotentialRiskAndSubCollections(riskToDelete.id, currentUprId, currentPeriod);
      toast({ title: "Potensi Risiko Dihapus", description: `Potensi risiko "${riskToDelete.description}" (${goal?.code || 'S?'}.PR${riskToDelete.sequenceNumber}) dan semua data terkait telah dihapus.`, variant: "destructive" });
      loadData(); 
    } catch (error: any) {
        console.error("Error deleting single potential risk:", error.message);
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus potensi risiko.";
        toast({ title: "Gagal Menghapus", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSingleDeleteDialogOpen(false);
        setRiskToDelete(null);
        setDeletingRiskId(null);
    }
  };

  const filteredPotentialRisks = useMemo(() => {
    let tempRisks = Array.isArray(potentialRisks) ? [...potentialRisks] : [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    if (searchTerm) {
      tempRisks = tempRisks.filter(pr =>
        (pr.sequenceNumber && `${goal?.code || ''}.PR${pr.sequenceNumber || ''}`.toLowerCase().includes(lowerSearchTerm)) ||
        pr.description.toLowerCase().includes(lowerSearchTerm) ||
        (pr.category && pr.category.toLowerCase().includes(lowerSearchTerm)) ||
        (pr.owner && pr.owner.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (selectedCategories.length > 0) {
      tempRisks = tempRisks.filter(pr => pr.category && selectedCategories.includes(pr.category));
    }
    if (selectedOwners.length > 0) {
      tempRisks = tempRisks.filter(pr => pr.owner && selectedOwners.includes(pr.owner));
    }
    return tempRisks.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
  }, [potentialRisks, searchTerm, selectedCategories, selectedOwners, goal?.code]);

  const handleSelectRisk = (riskId: string, checked: boolean) => {
    setSelectedRiskIds(prev =>
      checked ? [...prev, riskId] : prev.filter(id => id !== riskId)
    );
  };

  const handleSelectAllVisibleRisks = (checked: boolean) => {
    if (checked) {
      setSelectedRiskIds(filteredPotentialRisks.map(risk => risk.id));
    } else {
      setSelectedRiskIds([]);
    }
  };

  const handleDeleteSelectedRisks = () => {
    if (!currentUser || !currentUprId || !currentPeriod || selectedRiskIds.length === 0) {
        toast({ title: "Tidak Ada Risiko Dipilih", description: "Harap pilih setidaknya satu risiko untuk dihapus.", variant: "destructive" });
        return;
    }
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmDeleteSelectedRisks = async () => {
    if (!goal || !currentUser || !currentUprId || !currentPeriod ) return;
    setIsBulkDeleting(true);
    let deletedCount = 0;
    
    const deletionPromises = selectedRiskIds.map(riskId => {
        return deletePotentialRiskAndSubCollections(riskId, currentUprId, currentPeriod)
            .then(() => {
                deletedCount++;
            })
            .catch(err => {
                console.error(`Gagal menghapus risiko ${riskId}:`, err);
                 const risk = potentialRisks.find(r => r.id === riskId);
                toast({ title: "Gagal Sebagian", description: `Gagal menghapus potensi risiko "${risk?.description || riskId}". Pesan: err.message`, variant: "destructive" });
            });
    });

    try {
        await Promise.all(deletionPromises);
        if (deletedCount > 0) {
           toast({ title: "Hapus Massal Berhasil", description: `${deletedCount} potensi risiko dan data terkait telah dihapus.`, variant: "destructive" });
        }
        loadData(); 
    } catch (error: any) {
        console.error("Error during bulk delete selected risks:", error.message);
        toast({title: "Gagal Proses Hapus Massal", description: error.message, variant: "destructive"});
    } finally {
        setIsBulkDeleteDialogOpen(false);
        setSelectedRiskIds([]);
        setIsBulkDeleting(false);
    }
  };

  const handleDuplicateRisk = async (riskToDuplicateId: string) => {
    if (!goal || !currentUser || !currentUprId || !currentPeriod) return;
    const riskToDuplicate = potentialRisks.find(pr => pr.id === riskToDuplicateId);
    if (!riskToDuplicate) {
        toast({ title: "Gagal Menduplikasi", description: "Potensi risiko asli tidak ditemukan.", variant: "destructive" });
        return;
    }
    setIsLoading(true); 
    try {
        const existingPRsForGoal = await getPotentialRisksByGoalId(goal.id, currentUprId, currentPeriod);
        const newSequenceNumber = existingPRsForGoal.length + 1;

        const newPRData: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'userId' | 'period' | 'sequenceNumber' | 'uprId' | 'goalId'> = {
            description: `${riskToDuplicate.description} (Salinan)`,
            category: riskToDuplicate.category,
            owner: riskToDuplicate.owner,
        };
        // For addPotentialRisk service, creatorUserId is currentUprId IF data is owned by UPR, or currentUser.uid if creator matters separately
        // Assuming here, the creator for a duplicated risk is the current user, and it belongs to the current active UPR.
        const newPotentialRisk = await addPotentialRisk(newPRData, goal.id, currentUprId, currentPeriod, currentUser.uid, newSequenceNumber);
        
        toast({ title: "Risiko Diduplikasi", description: `Potensi risiko "${newPotentialRisk.description}" telah berhasil diduplikasi. Penyebab dan kontrol belum disalin.`});
        loadData(); 
    } catch (error: any) {
        console.error("Error duplicating risk:", error.message);
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat menduplikasi potensi risiko.";
        toast({ title: "Gagal Menduplikasi", description: errorMessage, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const toggleExpandRisk = (riskId: string) => {
    setExpandedRiskId(currentId => (currentId === riskId ? null : riskId));
  };

  if (authLoading || (currentUser && !appUser)) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data...</p>
      </div>
    );
  }
  
  if (!currentUser && !authLoading) {
     // Handled by useEffect redirect
    return null; 
  }

  if (isLoading && !goal) { 
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data sasaran...</p>
      </div>
    );
  }
  
  if (!goal && !isLoading) { 
    // Error message is shown by loadData via toast, useEffect handles redirect
    return (
       <div className="flex flex-col items-center justify-center h-screen">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">Mengalihkan atau menunggu data sasaran...</p>
        <Button onClick={() => router.push('/goals')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Sasaran
        </Button>
      </div>
    );
  }
  
  if (!goal) return null; 

  const totalTableColumns = 8; 

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Potensi Risiko untuk Sasaran: ${goal.code || '[Tanpa Kode]'} - ${goal.name}`}
        description={`${goal.description}`}
        actions={
          <div className="flex space-x-2">
            <Button onClick={() => router.push('/goals')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Sasaran
            </Button>
            {currentUser && goal && currentUprId && currentPeriod && ( // Check currentUprId and currentPeriod
              <NextLink href={`/all-risks/manage/new?goalId=${goal.id}&from=${encodeURIComponent(`/risks/${goal.id}`)}`} passHref>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Tambah Potensi Risiko Baru
                </Button>
              </NextLink>
            )}
          </div>
        }
      />

      {goal && currentUprId && currentUser && ( // Ensure goal, UPR context, and user exist for AI card
          <RiskIdentificationCard 
            goal={goal} 
            onPotentialRisksIdentified={handlePotentialRisksIdentified} 
            existingPotentialRisksCount={potentialRisks.length}
          />
      )}
      
      <Separator />

      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold whitespace-nowrap">Potensi Risiko Teridentifikasi ({filteredPotentialRisks.length} dari {potentialRisks.length})</h2>
              <div className="flex items-center space-x-1">
                  <Button 
                      variant={viewMode === 'card' ? 'secondary' : 'outline'} 
                      size="icon" 
                      onClick={() => setViewMode('card')}
                      aria-label="Tampilan Kartu"
                      disabled={isLoading}
                  >
                      <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button 
                      variant={viewMode === 'table' ? 'secondary' : 'outline'} 
                      size="icon" 
                      onClick={() => setViewMode('table')}
                      aria-label="Tampilan Tabel"
                      disabled={isLoading}
                  >
                      <List className="h-4 w-4" />
                  </Button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-grow md:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari kode, deskripsi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full md:w-64"
                        disabled={isLoading}
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto" disabled={isLoading}>
                            <Filter className="mr-2 h-4 w-4" />
                            Filter Kategori {selectedCategories.length > 0 ? `(${selectedCategories.length})` : ''}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[250px]">
                        <DropdownMenuLabel>Pilih Kategori</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <ScrollArea className="h-[200px]">
                        {RISK_CATEGORIES.map((category) => (
                            <DropdownMenuCheckboxItem
                                key={category}
                                checked={selectedCategories.includes(category)}
                                onCheckedChange={() => setSelectedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category])}
                            >
                                {category}
                            </DropdownMenuCheckboxItem>
                        ))}
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto" disabled={isLoading || allRiskOwnersForGoal.length === 0}>
                            <Filter className="mr-2 h-4 w-4" />
                            Filter Pemilik {selectedOwners.length > 0 ? `(${selectedOwners.length})` : ''}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[250px]">
                        <DropdownMenuLabel>Pilih Pemilik</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {allRiskOwnersForGoal.length > 0 ? (
                            <ScrollArea className="h-[200px]">
                            {allRiskOwnersForGoal.map((owner) => (
                                <DropdownMenuCheckboxItem
                                    key={owner}
                                    checked={selectedOwners.includes(owner)}
                                    onCheckedChange={() => setSelectedOwners(prev => prev.includes(owner) ? prev.filter(o => o !== owner) : [...prev, owner])}
                                >
                                    {owner}
                                </DropdownMenuCheckboxItem>
                            ))}
                            </ScrollArea>
                        ) : <DropdownMenuItem disabled>Tidak ada pemilik.</DropdownMenuItem>}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        
        {(selectedRiskIds.length > 0 || (filteredPotentialRisks.length > 0 && viewMode === 'table') ) && (
             <div className="flex items-center justify-between mb-4 border-b pb-2">
                {viewMode === 'table' && filteredPotentialRisks.length > 0 && (
                  <div className="flex items-center gap-2">
                      <Checkbox
                          id="selectAllVisibleRisksGoalPage"
                          checked={selectedRiskIds.length === filteredPotentialRisks.length && filteredPotentialRisks.length > 0}
                          onCheckedChange={(checked) => handleSelectAllVisibleRisks(Boolean(checked))}
                          disabled={filteredPotentialRisks.length === 0 || !currentUser || isLoading || isBulkDeleting}
                          aria-label="Pilih Semua Risiko yang Terlihat"
                      />
                      <label htmlFor="selectAllVisibleRisksGoalPage" className="text-sm font-medium text-muted-foreground cursor-pointer">
                          Pilih Semua ({selectedRiskIds.length} dipilih)
                      </label>
                  </div>
                )}
                {selectedRiskIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelectedRisks} disabled={!currentUser || isLoading || isBulkDeleting}>
                       {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Hapus ({selectedRiskIds.length}) yang Dipilih
                    </Button>
                )}
            </div>
        )}

        {isLoading && potentialRisks.length === 0 && ( 
             <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">Memuat potensi risiko...</p>
            </div>
        )}

        {!isLoading && filteredPotentialRisks.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">
                {potentialRisks.length === 0 ? "Belum ada potensi risiko yang teridentifikasi" : "Tidak ada potensi risiko yang cocok dengan filter"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {potentialRisks.length === 0 ? "Gunakan alat AI di atas untuk brainstorming potensi risiko untuk sasaran ini, atau tambah manual." : "Coba sesuaikan filter Anda."}
            </p>
          </div>
        )}

        {!isLoading && filteredPotentialRisks.length > 0 && viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPotentialRisks.map((pRisk) => (
              <RiskListItem
                key={pRisk.id}
                potentialRisk={pRisk}
                goalCode={goal.code}
                riskCausesCount={riskCauseCounts[pRisk.id] || 0}
                onEditDetails={() => router.push(`/all-risks/manage/${pRisk.id}?from=${encodeURIComponent(`/risks/${goal.id}`)}`)} 
                onDeletePotentialRisk={() => handleDeleteSingleRisk(pRisk)}
                isSelected={selectedRiskIds.includes(pRisk.id)}
                onSelectRisk={(checked) => handleSelectRisk(pRisk.id, checked)}
                onDuplicateRisk={() => handleDuplicateRisk(pRisk.id)} 
                canDelete={!!currentUser && !deletingRiskId && !isBulkDeleting}
                isDeleting={deletingRiskId === pRisk.id || (isBulkDeleting && selectedRiskIds.includes(pRisk.id))}
              />
            ))}
          </div>
        )}
        {!isLoading && filteredPotentialRisks.length > 0 && viewMode === 'table' && (
           <Card className="w-full">
            <CardContent className="p-0">
              <div className="relative w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] sticky left-0 bg-background z-10">
                        <Checkbox
                            checked={selectedRiskIds.length === filteredPotentialRisks.length && filteredPotentialRisks.length > 0}
                            onCheckedChange={(checked) => handleSelectAllVisibleRisks(Boolean(checked))}
                            aria-label="Pilih semua risiko yang terlihat"
                            disabled={filteredPotentialRisks.length === 0 || !currentUser || isBulkDeleting}
                        />
                      </TableHead>
                      <TableHead className="w-[40px] sticky left-10 bg-background z-10"></TableHead> 
                      <TableHead className="min-w-[120px] sticky left-[72px] bg-background z-10">Kode PR</TableHead>
                      <TableHead className="min-w-[300px]">Deskripsi</TableHead>
                      <TableHead className="min-w-[120px]">Kategori</TableHead>
                      <TableHead className="min-w-[150px]">Pemilik</TableHead>
                      <TableHead className="min-w-[100px] text-center">Penyebab</TableHead>
                      
                      <TableHead className="text-right min-w-[100px] sticky right-0 bg-background z-10">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPotentialRisks.map((pRisk) => {
                      const isExpanded = expandedRiskId === pRisk.id;
                      const potentialRiskCodeDisplay = `${goal?.code || 'S?'}.PR${pRisk.sequenceNumber || 'N/A'}`;
                      const returnPath = `/risks/${goal.id}`;
                      const isCurrentlyDeletingThis = deletingRiskId === pRisk.id || (isBulkDeleting && selectedRiskIds.includes(pRisk.id));
                      return (
                        <Fragment key={pRisk.id}>
                          <TableRow className={isCurrentlyDeletingThis ? "opacity-50" : ""}>
                            <TableCell className="sticky left-0 bg-background z-10">
                              <Checkbox
                                  checked={selectedRiskIds.includes(pRisk.id)}
                                  onCheckedChange={(checked) => handleSelectRisk(pRisk.id, Boolean(checked))}
                                  aria-label={`Pilih risiko ${pRisk.description}`}
                                  disabled={!currentUser || isCurrentlyDeletingThis}
                              />
                            </TableCell>
                            <TableCell className="sticky left-10 bg-background z-10">
                              <Button variant="ghost" size="icon" onClick={() => toggleExpandRisk(pRisk.id)} aria-label={isExpanded ? "Sembunyikan deskripsi" : "Tampilkan deskripsi"} className="h-8 w-8" disabled={isCurrentlyDeletingThis}>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell className="font-mono text-xs sticky left-[72px] bg-background z-10">{potentialRiskCodeDisplay}</TableCell>
                            <TableCell className="font-medium text-xs max-w-xs truncate" title={pRisk.description}>
                                {pRisk.description}
                            </TableCell>
                            <TableCell><Badge variant={pRisk.category ? "secondary" : "outline"} className="text-xs">{pRisk.category || 'N/A'}</Badge></TableCell>
                            <TableCell className="text-xs truncate max-w-[150px]" title={pRisk.owner || ''}>{pRisk.owner || 'N/A'}</TableCell>
                            <TableCell className="text-center text-xs">{riskCauseCounts[pRisk.id] || 0}</TableCell>
                            
                            <TableCell className="text-right sticky right-0 bg-background z-10">
                             {isCurrentlyDeletingThis ? (
                                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!currentUser}>
                                      <Settings2 className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => router.push(`/all-risks/manage/${pRisk.id}?from=${encodeURIComponent(returnPath)}`)}>
                                      <Edit className="mr-2 h-4 w-4" /> Edit Detail & Penyebab
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => router.push(`/risk-analysis?potentialRiskId=${pRisk.id}&from=${encodeURIComponent(returnPath)}`)}>
                                        <BarChart3 className="mr-2 h-4 w-4" /> Analisis Semua Penyebab
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicateRisk(pRisk.id)} disabled={!currentUser}>
                                      <Copy className="mr-2 h-4 w-4" /> Duplikat Risiko
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteSingleRisk(pRisk)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={!currentUser}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Hapus Potensi Risiko
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-muted/30 hover:bg-muted/40">
                              <TableCell className="sticky left-0 bg-muted/30 z-10" /> 
                              <TableCell className="sticky left-10 bg-muted/30 z-10" />
                              <TableCell className="sticky left-[72px] bg-muted/30 z-10" />
                              <TableCell colSpan={totalTableColumns - 3} className="p-0"> 
                                <div className="p-3 space-y-1 text-xs">
                                  <h4 className="font-semibold text-foreground">Deskripsi Lengkap:</h4>
                                  <p className="text-muted-foreground whitespace-pre-wrap">{pRisk.description}</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={isSingleDeleteDialogOpen} onOpenChange={setIsSingleDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus potensi risiko "{riskToDelete?.description}" ({goal?.code || 'S?'}.PR{riskToDelete?.sequenceNumber || 'N/A'})? Semua penyebab dan tindakan pengendalian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setIsSingleDeleteDialogOpen(false); setRiskToDelete(null);}}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSingleRisk} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Massal</AlertDialogTitle>
            <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus {selectedRiskIds.length} potensi risiko yang dipilih? Semua penyebab dan kontrol terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsBulkDeleteDialogOpen(false)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelectedRisks} className="bg-destructive hover:bg-destructive/90">Hapus ({selectedRiskIds.length})</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

