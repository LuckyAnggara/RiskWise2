
// src/app/profile-setup/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { updateUserProfileData } from '@/services/userService';
import { AppLogo } from '@/components/icons';
import { auth } from '@/lib/firebase/config'; 
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth'; 

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();

export default function ProfileSetupPage() {
  const { currentUser, appUser, refreshAppUser, authContextLoading, isProfileComplete } = useAuth(); // Menggunakan authContextLoading
  const router = useRouter();
  const { toast } = useToast();

  const [displayNameInput, setDisplayNameInput] = useState('');
  const [initialPeriodInput, setInitialPeriodInput] = useState(DEFAULT_INITIAL_PERIOD);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authContextLoading && !currentUser) { // Jika auth selesai dan tidak ada user
      console.log("[ProfileSetupPage] No user session, redirecting to /login");
      router.replace('/login');
      return; // Hentikan eksekusi lebih lanjut di useEffect ini
    }

    if (!authContextLoading && currentUser && isProfileComplete) {
      console.log("[ProfileSetupPage] Profile is complete via context, redirecting to /");
      router.replace('/');
      return; 
    }
    
    // Pre-fill logic if user exists but profile is not complete
    if (currentUser && !isProfileComplete) {
        if (appUser && appUser.displayName) {
            setDisplayNameInput(appUser.displayName);
        } else if (currentUser.displayName) {
            setDisplayNameInput(currentUser.displayName);
        } else if (currentUser.email) {
            setDisplayNameInput(currentUser.email.split('@')[0]);
        } else {
            setDisplayNameInput('');
        }
        // Untuk initialPeriodInput, biarkan default atau dari appUser jika ada dan profil belum lengkap
        if (appUser && appUser.activePeriod) {
            setInitialPeriodInput(appUser.activePeriod);
        } else {
            setInitialPeriodInput(DEFAULT_INITIAL_PERIOD);
        }
    }

  }, [currentUser, appUser, authContextLoading, isProfileComplete, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Error", description: "Pengguna tidak ditemukan. Silakan login kembali.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (!displayNameInput.trim()) {
      toast({ title: "Input Tidak Valid", description: "Nama UPR / Nama Pengguna harus diisi.", variant: "destructive" });
      return;
    }
    if (!initialPeriodInput.trim() || !/^\d{4}$/.test(initialPeriodInput.trim())) {
      toast({ title: "Format Periode Tidak Valid", description: "Tahun periode awal harus format YYYY (misalnya, 2024).", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      if (auth.currentUser && auth.currentUser.displayName !== displayNameInput.trim()) {
        await updateFirebaseAuthProfile(auth.currentUser, { displayName: displayNameInput.trim() });
        console.log("[ProfileSetupPage] Firebase Auth displayName updated.");
      }
      
      // Data yang disimpan ke Firestore
      const profileDataToSave: Partial<Pick<AppUser, "displayName" | "activePeriod" | "availablePeriods">> = {
        displayName: displayNameInput.trim(),
        activePeriod: initialPeriodInput.trim(),
        availablePeriods: [initialPeriodInput.trim()],
        // role dan assignedUprId akan di-set oleh sistem/admin atau default saat pertama kali dokumen dibuat di service jika tidak ada.
        // uprId akan disinkronkan dengan displayName di userService
      };

      await updateUserProfileData(currentUser.uid, profileDataToSave);
      
      await refreshAppUser(); 
      toast({ title: "Profil Disimpan", description: "Pengaturan profil awal Anda telah berhasil disimpan." });
      
      // Redirect akan dihandle oleh useEffect di atas setelah isProfileComplete diperbarui
      // Jika setelah refreshAppUser, isProfileComplete masih false (misal userSatker menunggu assignedUprId),
      // pengguna akan tetap di halaman ini atau diarahkan oleh AppLayout ke halaman sesuai
      // Ini mencegah asumsi redirect ke '/' jika profil belum sepenuhnya lengkap menurut definisi baru.

    } catch (error: any) {
      console.error("Error saving initial profile:", error);
      toast({ title: "Gagal Menyimpan Profil", description: error.message || "Terjadi kesalahan saat menyimpan profil.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (authContextLoading || (currentUser && !appUser && !isProfileComplete) ) { 
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat data atau mengarahkan...</p>
      </div>
    );
  }

  // Jika setelah semua loading selesai dan pengguna masih di sini, berarti profil memang belum lengkap.
  // Tidak perlu redirect lagi dari sini jika isProfileComplete true karena useEffect sudah menangani.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <AppLogo className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-2xl">Lengkapi Profil Anda</CardTitle>
          <CardDescription>Silakan isi nama UPR/Nama Pengguna dan periode awal Anda untuk melanjutkan.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="displayNameInput">Nama UPR / Nama Pengguna Anda</Label>
              <Input
                id="displayNameInput"
                type="text"
                placeholder="Masukkan Nama UPR atau Nama Pengguna Anda"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                required
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">Nama ini akan digunakan sebagai identitas UPR Anda dan nama tampilan.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="initialPeriodInput">Tahun Periode Awal</Label>
              <Input
                id="initialPeriodInput"
                type="text"
                placeholder="YYYY (misalnya, 2024)"
                value={initialPeriodInput}
                onChange={(e) => setInitialPeriodInput(e.target.value)}
                required
                pattern="\d{4}"
                title="Masukkan tahun dalam format YYYY"
                disabled={isSaving}
              />
               <p className="text-xs text-muted-foreground">Ini akan menjadi periode aktif pertama Anda.</p>
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan & Lanjutkan
            </Button>
          </form>
        </CardContent>
         <CardFooter className="text-center text-xs text-muted-foreground pt-4">
            <p>&copy; {new Date().getFullYear()} RiskWise. Aplikasi Manajemen Risiko.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
