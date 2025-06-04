
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase/config';
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth';
import { updateUserProfileData } from '@/services/userService';

export default function AuditorSettingsPage() {
  const { currentUser, appUser, authContextLoading, profileLoading, refreshAppUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!authContextLoading && currentUser && !profileLoading && appUser) {
      setDisplayNameInput(appUser.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || '');
    }
  }, [appUser, currentUser, authContextLoading, profileLoading]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Otentikasi Diperlukan", variant: "destructive" });
      return;
    }
    if (!displayNameInput.trim()) {
      toast({ title: "Input Tidak Valid", description: "Nama Pengguna harus diisi.", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);
    try {
      if (auth.currentUser && auth.currentUser.displayName !== displayNameInput.trim()) {
        await updateFirebaseAuthProfile(auth.currentUser, { displayName: displayNameInput.trim() });
      }
      await updateUserProfileData(currentUser.uid, { displayName: displayNameInput.trim() });
      await refreshAppUser();
      toast({ title: "Profil Disimpan", description: "Nama tampilan Anda telah diperbarui." });
    } catch (error: any) {
      toast({ title: "Gagal Menyimpan Profil", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (authContextLoading || (currentUser && profileLoading)) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Auditor"
        description="Kelola pengaturan profil auditor Anda."
      />

      <Card>
        <CardHeader>
          <CardTitle>Profil Pengguna</CardTitle>
          <CardDescription>
            Perbarui nama tampilan Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayNameAuditor">Nama Tampilan</Label>
              <Input
                id="displayNameAuditor"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Masukkan Nama Tampilan Anda"
                disabled={isSavingProfile}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email (Tidak dapat diubah)</Label>
              <Input value={currentUser?.email || ''} readOnly disabled className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Peran</Label>
              <Input value={appUser?.role || 'Auditor'} readOnly disabled className="bg-muted/50" />
            </div>
            <Button type="submit" disabled={isSavingProfile || !displayNameInput.trim()}>
              {isSavingProfile ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Perubahan Profil
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Placeholder for theme settings if needed */}
      {/* <Card>
        <CardHeader><CardTitle>Preferensi Tampilan</CardTitle></CardHeader>
        <CardContent><p>Pengaturan tema akan ada di sini.</p></CardContent>
      </Card> */}
    </div>
  );
}
