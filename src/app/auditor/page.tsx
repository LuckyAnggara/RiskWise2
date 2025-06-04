
"use client";

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { FileSearch, Settings, AlertTriangle } from 'lucide-react';

export default function AuditorDashboardPage() {
  const { appUser } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dasbor Auditor"
        description={`Selamat datang, ${appUser?.displayName || 'Auditor'}. Panel kontrol Anda untuk aktivitas reviu dan evaluasi risiko.`}
      />

      {!appUser?.uprId && appUser?.role === 'userSatker' && ( // This condition might be less relevant if auditor role is exclusive
          <Alert variant="warning" className="bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-700 dark:text-amber-300">UPR Belum Ditugaskan</AlertTitle>
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              Unit Pemilik Risiko (UPR) Anda belum ditugaskan oleh Administrator. Fungsi aplikasi mungkin terbatas.
            </AlertDescription>
          </Alert>
        )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/reviu/pilih-konteks" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Reviu & Evaluasi Risiko</CardTitle>
              <FileSearch className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Pilih UPR dan Periode untuk memulai reviu atau evaluasi data risiko.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/auditor/settings" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Pengaturan Auditor</CardTitle>
              <Settings className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Kelola preferensi dan pengaturan akun auditor Anda.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Informasi Tambahan</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                Sebagai auditor, Anda memiliki akses ke modul "Reviu & Evaluasi Risiko" untuk meninjau data risiko dari berbagai UPR dan Periode.
                Gunakan menu navigasi untuk mengakses fitur yang tersedia.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
