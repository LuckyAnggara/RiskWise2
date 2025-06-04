
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
import { auth } from '@/lib/firebase/config'; // Import auth for Firebase Auth operations
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth'; // Renamed to avoid conflict

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();

export default function ProfileSetupPage() {
  const { currentUser, appUser, refreshAppUser, loading: authLoading, isProfileComplete } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [displayNameInput, setDisplayNameInput] = useState('');
  const [initialPeriodInput, setInitialPeriodInput] = useState(DEFAULT_INITIAL_PERIOD);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // If user is logged in and profile is already complete, redirect them away from setup.
    if (!authLoading && currentUser && isProfileComplete) {
      console.log("[ProfileSetupPage] Profile is complete (via context), redirecting to /");
      router.replace('/');
    } 
    // If auth has finished and there's no user, redirect to login.
    else if (!authLoading && !currentUser) {
        console.log("[ProfileSetupPage] No user, redirecting to /login");
        router.replace('/login');
    }
    // If user is logged in but profile is NOT complete, prefill displayName from Firebase Auth if appUser's displayName is not set yet
    else if (currentUser && appUser && !appUser.displayName) {
        setDisplayNameInput(currentUser.displayName || currentUser.email?.split('@')[0] || '');
    }
     // If appUser is already loaded, use its displayName
    else if (currentUser && appUser && appUser.displayName) {
        setDisplayNameInput(appUser.displayName);
    }

  }, [currentUser, appUser, authLoading, isProfileComplete, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Error", description: "Pengguna tidak ditemukan. Silakan login kembali.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (!displayNameInput.trim()) {
      toast({ title: "Input Tidak Valid", description: "Nama UPR / Nama Lengkap harus diisi.", variant: "destructive" });
      return;
    }
    if (!initialPeriodInput.trim() || !/^\d{4}$/.test(initialPeriodInput.trim())) {
      toast({ title: "Format Periode Tidak Valid", description: "Tahun periode awal harus format YYYY (misalnya, 2024).", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Update Firebase Auth profile's displayName if it's different
      if (auth.currentUser && auth.currentUser.displayName !== displayNameInput.trim()) {
        await updateFirebaseAuthProfile(auth.currentUser, { displayName: displayNameInput.trim() });
        console.log("[ProfileSetupPage] Firebase Auth displayName updated.");
      }
      
      const profileDataToSave: Partial<Pick<AppUser, "displayName" | "activePeriod" | "availablePeriods">> & {uprId?: string | null} = {
        displayName: displayNameInput.trim(),
        activePeriod: initialPeriodInput.trim(),
        availablePeriods: [initialPeriodInput.trim()], // Start with only the initial period
      };

      // For userSatker, uprId will be the same as their displayName initially.
      // assignedUprId will be null until an admin assigns them.
      // For admin/auditor, uprId will also be their displayName (as a form of identifier), and assignedUprId remains null.
      profileDataToSave.uprId = displayNameInput.trim();

      await updateUserProfileData(currentUser.uid, profileDataToSave);
      
      await refreshAppUser(); // Crucial: Refresh appUser in context to update isProfileComplete
      toast({ title: "Profil Disimpan", description: "Pengaturan profil awal Anda telah berhasil disimpan." });
      
      // After refreshAppUser, isProfileComplete should be re-evaluated by AuthContext.
      // The useEffect above will then handle the redirect if the profile is now considered complete.
      // No direct router.push('/') here to avoid race conditions with state updates.

    } catch (error: any) {
      console.error("Error saving initial profile:", error);
      toast({ title: "Gagal Menyimpan Profil", description: error.message || "Terjadi kesalahan saat menyimpan profil.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (authLoading || (currentUser && !appUser && !isProfileComplete) ) { // Show loader if auth is loading OR if user is logged in but appUser/profile status is not yet determined
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat data atau mengarahkan...</p>
      </div>
    );
  }

  // If still on this page and isProfileComplete became true (e.g., after refreshAppUser), the useEffect will redirect.
  // This rendering is for when !isProfileComplete.
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
