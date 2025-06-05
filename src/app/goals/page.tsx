
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { GoalCard } from '@/components/goals/goal-card';
import { AddGoalDialog } from '@/components/goals/add-goal-dialog';
import type { Goal } from '@/lib/types';
import { PlusCircle, Target, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAppStore } from '@/stores/useAppStore'; // Import useAppStore

export default function GoalsPage() {
  const store = useAppStore(); // Gunakan hook store
  const { goals: goalsFromStore, goalsLoading: goalsLoadingFromStore, fetchGoals, addGoalToStore, updateGoalInStore, deleteGoalFromStore, setAppContext } = store;

  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  const router = useRouter();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // Konteks UPR dan Periode utama untuk halaman ini diambil dari appUser
  const uprIdForPage = useMemo(() => appUser?.uprId, [appUser]);
  const periodForPage = useMemo(() => appUser?.activePeriod, [appUser]);
  const creatorUserIdForPage = useMemo(() => currentUser?.uid, [currentUser]); // UID pengguna yang login

  const loadGoalsData = useCallback(async () => {
    if (uprIdForPage && periodForPage && creatorUserIdForPage) {
      console.log(`[GoalsPage] loadGoalsData: Fetching goals for UPR: ${uprIdForPage}, Period: ${periodForPage}, by User: ${creatorUserIdForPage}`);
      // Panggil fetchGoals dari store dengan konteks yang benar
      await fetchGoals(uprIdForPage, periodForPage, creatorUserIdForPage);
    } else {
      console.warn("[GoalsPage] loadGoalsData: Missing uprIdForPage, periodForPage, or creatorUserIdForPage. Cannot fetch goals.", {uprIdForPage, periodForPage, creatorUserIdForPage});
      // Jika konteks tidak ada (misalnya userSatker belum di-assign UPR), goalsFromStore akan tetap kosong.
    }
  }, [uprIdForPage, periodForPage, creatorUserIdForPage, fetchGoals]);

  useEffect(() => {
    if (!authLoading && currentUser && isProfileComplete && uprIdForPage && periodForPage) {
      loadGoalsData();
    } else if (!authLoading && (!currentUser || !isProfileComplete)) {
      router.push(currentUser ? '/settings' : '/login');
    }
  }, [authLoading, currentUser, isProfileComplete, uprIdForPage, periodForPage, loadGoalsData, router]);

  const handleGoalSave = async (goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'uprId' | 'period' | 'userId'>, existingGoalId?: string) => {
    if (!uprIdForPage || !periodForPage || !creatorUserIdForPage) {
      toast({ title: "Konteks Tidak Lengkap", description: "UPR, Periode, atau Pengguna tidak valid untuk menyimpan sasaran.", variant: "destructive" });
      return;
    }

    // Pastikan konteks store sesuai sebelum operasi
    if (store.activeUprId !== uprIdForPage || store.activePeriod !== periodForPage || store.activeUserId !== creatorUserIdForPage) {
        console.log(`[GoalsPage] handleGoalSave: Aligning store context. Current UPR: ${store.activeUprId}, Target UPR: ${uprIdForPage}`);
        setAppContext(uprIdForPage, periodForPage, creatorUserIdForPage);
    }

    try {
      if (existingGoalId) {
        const updatedGoal = await updateGoalInStore(existingGoalId, goalData);
        if (updatedGoal) {
            toast({ title: "Sasaran Diperbarui", description: `Sasaran "${updatedGoal.name}" (${updatedGoal.code}) telah berhasil diperbarui.` });
        } else {
            toast({ title: "Gagal Memperbarui", description: "Sasaran tidak ditemukan di store atau gagal diperbarui.", variant: "destructive"});
        }
      } else {
        const newGoal = await addGoalToStore(goalData);
        if (newGoal) {
            toast({ title: "Sasaran Ditambahkan", description: `Sasaran baru "${newGoal.name}" (${newGoal.code}) telah berhasil ditambahkan.` });
        } else {
             toast({ title: "Gagal Menambah", description: "Gagal menambahkan sasaran baru ke store.", variant: "destructive"});
        }
      }
      // Tidak perlu panggil loadGoalsData() lagi karena store sudah update state goals secara otomatis
    } catch (error: any) {
      console.error("Gagal menyimpan sasaran:", error.message);
      toast({ title: "Kesalahan", description: (error instanceof Error ? error.message : "Gagal menyimpan sasaran."), variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!goalToDelete || !uprIdForPage || !periodForPage || !creatorUserIdForPage) {
        toast({ title: "Gagal Menghapus", description: "Konteks tidak lengkap untuk menghapus sasaran.", variant: "destructive" });
        setIsDeleteDialogOpen(false);
        setGoalToDelete(null);
        return;
    }
    
    // Pastikan konteks store sesuai
    if (store.activeUprId !== uprIdForPage || store.activePeriod !== periodForPage || store.activeUserId !== creatorUserIdForPage) {
        console.log(`[GoalsPage] confirmDelete: Aligning store context before delete.`);
        setAppContext(uprIdForPage, periodForPage, creatorUserIdForPage);
    }

    try {
      await deleteGoalFromStore(goalToDelete.id);
      toast({ title: "Sasaran Dihapus", description: `Sasaran "${goalToDelete.name}" (${goalToDelete.code}) dan semua data terkait telah dihapus.`, variant: "destructive" });
    } catch (error: any) {
      console.error("Gagal menghapus sasaran:", error.message);
      toast({ title: "Kesalahan", description: (error instanceof Error ? error.message : "Gagal menghapus sasaran."), variant: "destructive" });
    } finally {
      setIsDeleteDialogOpen(false);
      setGoalToDelete(null);
    }
  };
  
  const handleDeleteGoal = (goal: Goal) => {
    setGoalToDelete(goal);
    setIsDeleteDialogOpen(true);
  };

  const filteredGoals = useMemo(() => {
    // Ambil goals dari store yang sudah difilter berdasarkan uprIdForPage dan periodForPage
    // Filter tambahan berdasarkan searchTerm dilakukan di sini
    const goalsForCurrentContext = goalsFromStore.filter(g => g.uprId === uprIdForPage && g.period === periodForPage);
    
    if (!searchTerm) {
      return goalsForCurrentContext;
    }
    return goalsForCurrentContext.filter(goal => 
      goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (goal.code && goal.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [goalsFromStore, searchTerm, uprIdForPage, periodForPage]);
  
  const isLoadingPage = authLoading || (!currentUser && !authLoading) || (currentUser && !appUser && !authLoading) || goalsLoadingFromStore;


  if (isLoadingPage) { 
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data sasaran...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sasaran"
        description={`Definisikan dan kelola tujuan strategis Anda untuk UPR: ${appUser?.displayName || uprIdForPage || '...'}, Periode: ${periodForPage || '...'}.`}
        actions={
          <AddGoalDialog 
            onGoalSave={handleGoalSave}
            existingGoals={goalsFromStore.filter(g => g.uprId === uprIdForPage && g.period === periodForPage)} 
            triggerButton={
              <Button disabled={!currentUser || !uprIdForPage || !periodForPage || !isProfileComplete}>
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Sasaran Baru
              </Button>
            }
          />
        }
      />

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari sasaran berdasarkan kode, nama, atau deskripsi..."
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoadingPage || !uprIdForPage}
          />
        </div>
      </div>

      {!uprIdForPage && !isLoadingPage && (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Target className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">UPR Belum Ditentukan</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Unit Pemilik Risiko (UPR) untuk pengguna ini belum di-assign oleh Administrator atau profil belum lengkap.
          </p>
           <Button onClick={() => router.push('/settings')} className="mt-4">Ke Pengaturan</Button>
        </div>
      )}

      {uprIdForPage && !isLoadingPage && filteredGoals.length === 0 && goalsFromStore.filter(g => g.uprId === uprIdForPage && g.period === periodForPage).length > 0 && searchTerm && (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">Tidak ada sasaran ditemukan</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tidak ada sasaran yang cocok dengan kata kunci pencarian Anda: "{searchTerm}".
          </p>
        </div>
      )}

      {uprIdForPage && !isLoadingPage && goalsFromStore.filter(g => g.uprId === uprIdForPage && g.period === periodForPage).length === 0 && !searchTerm && (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Target className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">Belum ada sasaran untuk UPR/Periode ini</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Mulailah dengan menambahkan sasaran pertama Anda.
          </p>
          <div className="mt-6">
            <AddGoalDialog 
              onGoalSave={handleGoalSave} 
              existingGoals={goalsFromStore.filter(g => g.uprId === uprIdForPage && g.period === periodForPage)}
              triggerButton={
                <Button disabled={!currentUser || !uprIdForPage || !periodForPage || !isProfileComplete}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Tambah Sasaran Baru
                </Button>
              }
            />
          </div>
        </div>
      )}

      {uprIdForPage && !isLoadingPage && filteredGoals.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              onEditGoal={(editedGoalData) => handleGoalSave(editedGoalData, goal.id)} 
              onDeleteGoal={() => handleDeleteGoal(goal)}
              // currentUprId dan currentPeriod tidak lagi diperlukan di GoalCard karena operasi save/delete
              // akan menggunakan konteks dari store yang sudah di-align
            />
          ))}
        </div>
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Sasaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus sasaran "{goalToDelete?.name}" ({goalToDelete?.code})? Semua potensi risiko, penyebab, dan rencana pengendalian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setIsDeleteDialogOpen(false); setGoalToDelete(null);}}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    
