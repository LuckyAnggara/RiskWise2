
"use client";

import React, { useEffect, useMemo, useState } from 'react'; // Added useState
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2, PlayCircle, Eye, CheckCircle, Trash2 } from 'lucide-react'; // Added Trash2
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import type { MonitoringSession, MonitoringSessionStatus } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"; // Added AlertDialog components
import { useToast } from '@/hooks/use-toast'; // Added useToast

const getStatusBadgeVariant = (status: MonitoringSessionStatus): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case 'Aktif':
      return 'default'; 
    case 'Direncanakan':
      return 'secondary'; 
    case 'Selesai':
      return 'outline'; 
    default:
      return 'secondary';
  }
};

export default function MonitoringSessionsPage() {
  const router = useRouter();
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  const { toast } = useToast(); // Initialize toast
  
  const monitoringSessions = useAppStore(state => state.monitoringSessions);
  const monitoringSessionsLoading = useAppStore(state => state.monitoringSessionsLoading);
  const fetchMonitoringSessions = useAppStore(state => state.fetchMonitoringSessions);
  const deleteMonitoringSessionFromState = useAppStore(state => state.deleteMonitoringSessionFromState); // Get delete function
  const triggerGlobalDataFetch = useAppStore(state => state.triggerGlobalDataFetch); 

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || "UPR Pengguna", [appUser]);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<MonitoringSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    if (currentUser && currentUserId && currentPeriod && isProfileComplete && !authLoading) {
      if (useAppStore.getState().dataFetchedForPeriod !== `${currentUserId}|${currentPeriod}`) {
         triggerGlobalDataFetch(currentUserId, currentPeriod);
      } else if (monitoringSessions.length === 0 && !monitoringSessionsLoading) {
         fetchMonitoringSessions(currentUserId, currentPeriod);
      }
    }
  }, [currentUser, currentUserId, currentPeriod, isProfileComplete, authLoading, fetchMonitoringSessions, triggerGlobalDataFetch, monitoringSessions.length, monitoringSessionsLoading]);

  const handleDeleteSession = (session: MonitoringSession) => {
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete || !currentUserId || !currentPeriod) {
      toast({ title: "Gagal Menghapus", description: "Konteks tidak lengkap untuk menghapus sesi.", variant: "destructive" });
      return;
    }
    setIsDeleting(true);
    try {
      await deleteMonitoringSessionFromState(sessionToDelete.id, currentUserId, currentPeriod);
      toast({ title: "Sesi Dihapus", description: `Sesi pemantauan "${sessionToDelete.name}" dan data terkait telah dihapus.`, variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Gagal Menghapus Sesi", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

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
                      <TableCell className="text-right space-x-2">
                        <Link href={`/monitoring/${session.id}/conduct`} passHref>
                          <Button variant="outline" size="sm">
                            {session.status === 'Direncanakan' && <PlayCircle className="mr-2 h-4 w-4" />}
                            {session.status === 'Aktif' && <Eye className="mr-2 h-4 w-4" />}
                            {session.status === 'Selesai' && <CheckCircle className="mr-2 h-4 w-4" />}
                            {session.status === 'Direncanakan' ? 'Mulai & Lakukan' : (session.status === 'Aktif' ? 'Lanjutkan/Lihat' : 'Lihat Detail')}
                          </Button>
                        </Link>
                        <Button 
                            variant="destructive" 
                            size="icon" 
                            onClick={() => handleDeleteSession(session)} 
                            disabled={isDeleting && sessionToDelete?.id === session.id}
                            aria-label="Hapus sesi pemantauan"
                            className="h-8 w-8"
                        >
                          {isDeleting && sessionToDelete?.id === session.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Sesi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus sesi pemantauan "{sessionToDelete?.name}"? Semua data paparan risiko terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setSessionToDelete(null); }} disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSession} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
