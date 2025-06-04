
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Info, PlusCircle, Save, Loader2, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase/config';
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth';
import { updateUserProfileData } from '@/services/userService';
import type { AppUser } from '@/lib/types';

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();
const DEFAULT_AVAILABLE_PERIODS = [
  (new Date().getFullYear() - 1).toString(),
  DEFAULT_INITIAL_PERIOD,
  (new Date().getFullYear() + 1).toString()
];

export default function SettingsPage() {
  const { currentUser, appUser, authContextLoading, profileLoading, isProfileComplete, refreshAppUser } = useAuth();
  const router = useRouter();
  
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [initialPeriodInput, setInitialPeriodInput] = useState(DEFAULT_INITIAL_PERIOD);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availablePeriodsState, setAvailablePeriodsState] = useState<string[]>([]);
  const [newPeriodInput, setNewPeriodInput] = useState('');
  const [isSavingActivePeriod, setIsSavingActivePeriod] = useState(false);
  const [isSavingNewPeriod, setIsSavingNewPeriod] = useState(false);
  const [riskAppetiteInput, setRiskAppetiteInput] = useState<number | string>('');

  const { toast } = useToast();

  useEffect(() => {
    if (!authContextLoading && !currentUser) {
      router.replace('/login');
      return;
    }

    if (!authContextLoading && currentUser && !profileLoading && appUser) {
      setDisplayNameInput(appUser.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || '');
      setSelectedPeriod(appUser.activePeriod || '');
      setAvailablePeriodsState(appUser.availablePeriods || []);
      setRiskAppetiteInput(appUser.riskAppetite === null || appUser.riskAppetite === undefined ? '' : appUser.riskAppetite);
      if (!isProfileComplete && !appUser.activePeriod) {
        setInitialPeriodInput(DEFAULT_INITIAL_PERIOD);
      }
    } else if (!authContextLoading && currentUser && !profileLoading && !appUser && !isProfileComplete) {
      // Case where Firestore document doesn't exist yet, prefill for initial setup
      setDisplayNameInput(currentUser.displayName || currentUser.email?.split('@')[0] || 'Pengguna Baru');
      setInitialPeriodInput(DEFAULT_INITIAL_PERIOD);
      setRiskAppetiteInput(''); // Default for new profile
    }
  }, [appUser, currentUser, authContextLoading, profileLoading, isProfileComplete, router]);


  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Otentikasi Diperlukan", description: "Sesi Anda mungkin telah berakhir. Silakan login kembali.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (!displayNameInput.trim()) {
      toast({ title: "Input Tidak Valid", description: "Nama UPR / Nama Pengguna harus diisi.", variant: "destructive" });
      return;
    }
    
    let periodToSave = initialPeriodInput.trim(); // For initial setup
    if (isProfileComplete) { // If profile is complete, we use the existing active period or the selected one.
      periodToSave = selectedPeriod || (appUser?.activePeriod || DEFAULT_INITIAL_PERIOD);
    } else { // Initial setup specific logic for period
        if (!initialPeriodInput.trim() || !/^\d{4}(?:[-\/](?:S[1-2]|Q[1-4]))?$/.test(initialPeriodInput.trim()) && !/^\d{4}\/\d{4}$/.test(initialPeriodInput.trim())) {
            toast({ title: "Format Periode Tidak Valid", description: "Format tahun periode awal tidak valid. Gunakan YYYY, YYYY/YYYY atau YYYY-S1/Q1.", variant: "destructive" });
            return;
        }
    }
    
    let appetiteToSave: number | null = null;
    if (riskAppetiteInput !== '') {
        const parsedAppetite = Number(riskAppetiteInput);
        if (isNaN(parsedAppetite) || parsedAppetite < 1 || parsedAppetite > 25) {
            toast({ title: "Selera Risiko Tidak Valid", description: "Selera risiko harus berupa angka antara 1 dan 25.", variant: "destructive" });
            return;
        }
        appetiteToSave = parsedAppetite;
    }


    setIsSavingProfile(true);
    try {
      if (auth.currentUser && auth.currentUser.displayName !== displayNameInput.trim()) {
        await updateFirebaseAuthProfile(auth.currentUser, { displayName: displayNameInput.trim() });
      }
      
      const profileDataToUpdate: Partial<AppUser> = {
        displayName: displayNameInput.trim(),
        uprId: displayNameInput.trim(), // Sync uprId with displayName for userSatker
        riskAppetite: appetiteToSave,
      };

      if (!isProfileComplete) { // Only set these on initial setup
        profileDataToUpdate.activePeriod = periodToSave;
        profileDataToUpdate.availablePeriods = [periodToSave];
        // Role is set server-side or defaults
      }
      
      await updateUserProfileData(currentUser.uid, profileDataToUpdate);
      await refreshAppUser(); 
      toast({ title: "Profil Disimpan", description: `Profil ${isProfileComplete ? 'diperbarui' : 'awal berhasil disimpan'}.` });
      if (!isProfileComplete) {
        router.push('/'); 
      }
    } catch (error: any) {
      console.error(`Error ${isProfileComplete ? 'updating' : 'saving initial'} profile:`, error);
      toast({ title: "Gagal Menyimpan Profil", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleActivePeriodChange = async (newPeriodValue: string) => {
    if (!currentUser || !appUser || !newPeriodValue || newPeriodValue === appUser.activePeriod) return;
    
    setIsSavingActivePeriod(true);
    try {
      await updateUserProfileData(currentUser.uid, { activePeriod: newPeriodValue });
      await refreshAppUser();
      setSelectedPeriod(newPeriodValue); 
      toast({ title: "Periode Aktif Diubah", description: `Periode aktif berhasil diatur ke ${newPeriodValue}. Aplikasi akan memuat ulang data terkait.` });
      // No full page reload, let AppLayout handle data refetch via store
    } catch (error: any) {
      console.error("Error updating active period:", error);
      toast({ title: "Gagal Mengubah Periode", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingActivePeriod(false);
    }
  };

  const handleAddNewPeriod = async () => {
    if (!currentUser || !appUser) return;
    if (!newPeriodInput.trim()) {
      toast({ title: "Kesalahan", description: "Periode tidak boleh kosong.", variant: "destructive" });
      return;
    }
     if (!/^\d{4}$/.test(newPeriodInput.trim()) && !/^\d{4}\/\d{4}$/.test(newPeriodInput.trim()) && !/^\d{4}-(S1|S2|Q1|Q2|Q3|Q4)$/i.test(newPeriodInput.trim())) {
      toast({ title: "Format Tidak Valid", description: "Gunakan format YYYY, YYYY/YYYY, atau YYYY-S1/S2/Q1-Q4.", variant: "destructive" });
      return;
    }

    setIsSavingNewPeriod(true);
    const currentPeriods = appUser.availablePeriods || [];
    const trimmedPeriod = newPeriodInput.trim();

    if (currentPeriods.includes(trimmedPeriod)) {
      toast({ title: "Periode Sudah Ada", description: `Periode "${trimmedPeriod}" sudah ada dalam daftar.`, variant: "default" });
      setIsSavingNewPeriod(false);
      setNewPeriodInput('');
      return;
    }

    const updatedPeriods = [...currentPeriods, trimmedPeriod].sort((a, b) => {
      const aYear = parseInt(a.substring(0,4));
      const bYear = parseInt(b.substring(0,4));
      if(aYear !== bYear) return aYear - bYear;
      return a.localeCompare(b);
    });

    try {
      await updateUserProfileData(currentUser.uid, { availablePeriods: updatedPeriods });
      await refreshAppUser(); // This will update appUser and thus availablePeriodsState via useEffect
      toast({ title: "Periode Ditambahkan", description: `Periode "${trimmedPeriod}" berhasil ditambahkan.` });
      setNewPeriodInput('');
    } catch (error: any) {
      console.error("Error adding new period:", error);
      toast({ title: "Gagal Menambah Periode", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingNewPeriod(false);
    }
  };
  
  const pageLoading = authContextLoading || (!authContextLoading && !currentUser) || (!authContextLoading && currentUser && profileLoading);

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat pengaturan...</p>
      </div>
    );
  }
  
  if (!currentUser) { // Should be caught by AppLayout, but as a safeguard
     return (
         <div className="text-center py-10">
            <p className="text-muted-foreground">Sesi tidak valid. Silakan login kembali.</p>
            <Button onClick={() => router.push('/login')} className="mt-4">Ke Halaman Login</Button>
        </div>
    );
  }
  
  // Render form setup jika profil belum lengkap
  if (!isProfileComplete) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Lengkapi Profil Anda"
          description="Untuk melanjutkan, harap isi Nama UPR/Pengguna dan Tahun Periode Awal Anda."
        />
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Profil Awal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSave} className="space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="setupDisplayName">Nama UPR / Nama Pengguna Anda</Label>
                <Input 
                  id="setupDisplayName" 
                  value={displayNameInput} 
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Masukkan Nama UPR atau Nama Pengguna Anda"
                  disabled={isSavingProfile}
                  required
                />
                <p className="text-xs text-muted-foreground">Nama ini akan digunakan sebagai identitas UPR dan nama tampilan Anda.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setupInitialPeriod">Tahun Periode Awal</Label>
                <Input
                  id="setupInitialPeriod"
                  type="text"
                  placeholder="YYYY, YYYY/YYYY atau YYYY-S1/Q1"
                  value={initialPeriodInput}
                  onChange={(e) => setInitialPeriodInput(e.target.value)}
                  required
                  title="Masukkan tahun dalam format YYYY, YYYY/YYYY, atau YYYY-S1/Q1 dll."
                  disabled={isSavingProfile}
                />
                <p className="text-xs text-muted-foreground">Ini akan menjadi periode aktif pertama Anda.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setupRiskAppetite">Selera Risiko (Opsional, angka 1-25)</Label>
                <Input
                  id="setupRiskAppetite"
                  type="number"
                  placeholder="Contoh: 15 (Moderat)"
                  value={riskAppetiteInput}
                  onChange={(e) => setRiskAppetiteInput(e.target.value)}
                  min="1"
                  max="25"
                  disabled={isSavingProfile}
                />
                <p className="text-xs text-muted-foreground">Batas tertinggi skor risiko yang dapat diterima UPR.</p>
              </div>
              <Button type="submit" disabled={isSavingProfile} className="w-full">
                {isSavingProfile ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Profil & Lanjutkan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Jika profil sudah lengkap, tampilkan halaman pengaturan biasa
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Aplikasi"
        description="Kelola pengaturan global untuk RiskWise."
      />

      <Card>
        <CardHeader>
          <CardTitle>Unit Pemilik Risiko (UPR) & Periode</CardTitle>
          <CardDescription>
            Konfigurasikan UPR dan periode pelaporan aktif untuk aplikasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleProfileSave} className="space-y-4 border-b pb-6">
            <div className="space-y-1.5">
              <Label htmlFor="currentDisplayName">Nama UPR / Nama Pengguna</Label>
              <Input 
                id="currentDisplayName" 
                value={displayNameInput} 
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Masukkan Nama UPR / Nama Pengguna baru"
                disabled={isSavingProfile}
              />
              <p className="text-xs text-muted-foreground flex items-center">
                <Info className="w-3 h-3 mr-1 shrink-0" /> Ini akan mengubah nama tampilan pengguna dan UPR ID Anda (jika berlaku).
              </p>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="riskAppetite">Selera Risiko (Opsional, angka 1-25)</Label>
                <Input
                  id="riskAppetite"
                  type="number"
                  placeholder="Contoh: 15 (Moderat)"
                  value={riskAppetiteInput}
                  onChange={(e) => setRiskAppetiteInput(e.target.value)}
                  min="1"
                  max="25"
                  disabled={isSavingProfile}
                />
                <p className="text-xs text-muted-foreground">Batas tertinggi skor risiko yang dapat diterima UPR Anda. Kosongkan jika tidak ditetapkan.</p>
              </div>
             <Button type="submit" disabled={isSavingProfile || !displayNameInput.trim()}>
                {isSavingProfile ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Perubahan Profil
              </Button>
          </form>

          <div className="space-y-1.5 pt-4">
            <Label htmlFor="currentPeriod">Periode Aktif</Label>
            <div className="flex items-center gap-2">
              <Select 
                value={selectedPeriod} 
                onValueChange={handleActivePeriodChange}
                disabled={isSavingActivePeriod || availablePeriodsState.length === 0}
              >
                <SelectTrigger id="currentPeriod" className="w-full md:w-[280px]">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriodsState.length > 0 ? (
                    availablePeriodsState.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-periods" disabled>Tidak ada periode yang ditentukan.</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {isSavingActivePeriod && <Loader2 className="animate-spin h-5 w-5 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">
              Mengubah periode aktif akan mempengaruhi data yang ditampilkan di seluruh aplikasi.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kelola Periode yang Tersedia</CardTitle>
          <CardDescription>Tambahkan periode pelaporan baru ke sistem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="flex-grow space-y-1.5">
              <Label htmlFor="newPeriod">Periode Baru (mis., 2026, 2025/2026, 2025-S1)</Label>
              <Input
                id="newPeriod"
                value={newPeriodInput}
                onChange={(e) => setNewPeriodInput(e.target.value)}
                placeholder="Masukkan periode baru"
                disabled={isSavingNewPeriod}
              />
            </div>
            <Button onClick={handleAddNewPeriod} type="button" className="w-full sm:w-auto" disabled={isSavingNewPeriod}>
              {isSavingNewPeriod ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
               Tambah Periode
            </Button>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">Periode yang Tersedia Saat Ini:</h4>
            {availablePeriodsState.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {availablePeriodsState.map(p => <li key={p}>{p}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada periode yang ditentukan.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    