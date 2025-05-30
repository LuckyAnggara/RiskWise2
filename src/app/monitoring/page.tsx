
"use client";

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2, PlayCircle, Eye, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import type { MonitoringSession, MonitoringSessionStatus } from '@/lib/types';

const getStatusBadgeVariant = (status: MonitoringSessionStatus): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case 'Aktif':
      return 'default'; // Primary color (usually blue or dark)
    case 'Direncanakan':
      return 'secondary'; // Lighter, less prominent
    case 'Selesai':
      return 'outline'; // Can be styled with a green border or text later
    default:
      return 'secondary';
  }
};

export default function MonitoringSessionsPage() {
  const router = useRouter();
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  
  const monitoringSessions = useAppStore(state => state.monitoringSessions);
  const monitoringSessionsLoading = useAppStore(state => state.monitoringSessionsLoading);
  const fetchMonitoringSessions = useAppStore(state => state.fetchMonitoringSessions);
  const triggerGlobalDataFetch = useAppStore(state => state.triggerInitialDataFetch); // Get the global fetch trigger

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || "UPR Pengguna", [appUser]);

  useEffect(() => {
    // Menggunakan triggerGlobalDataFetch dari store yang akan memanggil fetchMonitoringSessions
    if (currentUser && currentUserId && currentPeriod && isProfileComplete && !authLoading) {
      // Panggil triggerGlobalDataFetch jika belum pernah dipanggil untuk periode ini
      // Atau panggil fetchMonitoringSessions secara langsung jika store belum mengambilnya
      // Untuk konsistensi, kita akan mengandalkan triggerInitialDataFetch untuk memuat semua data
      // yang kemudian akan mengisi monitoringSessions
      if (useAppStore.getState().dataFetchedForPeriod !== `${currentUserId}|${currentPeriod}`) {
         triggerGlobalDataFetch(currentUserId, currentPeriod);
      } else if (monitoringSessions.length === 0 && !monitoringSessionsLoading) {
         // Jika dataFetchedForPeriod sudah sesuai tapi monitoringSessions masih kosong, coba fetch lagi
         // Ini bisa terjadi jika fetch awal gagal atau ada kondisi race.
         console.log("[MonitoringPage] dataFetchedForPeriod matches, but sessions are empty. Refetching sessions.");
         fetchMonitoringSessions(currentUserId, currentPeriod);
      }
    }
  }, [currentUser, currentUserId, currentPeriod, isProfileComplete, authLoading, fetchMonitoringSessions, triggerGlobalDataFetch, monitoringSessions.length, monitoringSessionsLoading]);


  if (authLoading || (!currentUser && !authLoading)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }

  if (!isProfileComplete && currentUser) {
    return (
       <div className="text-center py-10">
        <p className="text-muted-foreground">Harap lengkapi profil UPR dan Periode Anda di Pengaturan untuk mengakses modul ini.</p>
        <Button onClick={() => router.push('/settings')} className="mt-4">Ke Pengaturan</Button>
      </div>
    )
  }
  
  const isLoadingPage = monitoringSessionsLoading || (authLoading && !appUser);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Sesi Pemantauan dan Reviu Risiko"
        description={`Kelola dan mulai sesi pemantauan risiko untuk UPR: ${uprDisplayName}, Periode Aplikasi: ${currentPeriod || '...'}.`}
        actions={
          <Link href="/monitoring/new" passHref>
            <Button disabled={isLoadingPage || !currentUser}>
              <PlusCircle className="mr-2 h-4 w-4" /> Mulai Pemantauan Baru
            </Button>
          </Link>
        }
      />

      {isLoadingPage && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Memuat daftar sesi pemantauan...</p>
        </div>
      )}

      {!isLoadingPage && monitoringSessions.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Belum ada sesi pemantauan yang dibuat untuk periode ini.</p>
            <p className="text-sm text-muted-foreground">Klik "Mulai Pemantauan Baru" untuk memulai.</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingPage && monitoringSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Sesi Pemantauan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Nama Periode Pemantauan</TableHead>
                    <TableHead>Tanggal Mulai</TableHead>
                    <TableHead>Tanggal Selesai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoringSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.name}</TableCell>
                      <TableCell>{format(parseISO(session.startDate), "dd MMM yyyy", { locale: localeID })}</TableCell>
                      <TableCell>{format(parseISO(session.endDate), "dd MMM yyyy", { locale: localeID })}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(session.status)}>
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/monitoring/${session.id}/conduct`} passHref>
                          <Button variant="outline" size="sm">
                            {session.status === 'Direncanakan' && <PlayCircle className="mr-2 h-4 w-4" />}
                            {session.status === 'Aktif' && <Eye className="mr-2 h-4 w-4" />}
                            {session.status === 'Selesai' && <CheckCircle className="mr-2 h-4 w-4" />}
                            {session.status === 'Direncanakan' ? 'Mulai & Lakukan' : (session.status === 'Aktif' ? 'Lanjutkan/Lihat' : 'Lihat Detail')}
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
