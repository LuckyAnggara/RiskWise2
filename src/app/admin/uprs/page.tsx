
"use client";

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { getAllUprs, deleteUpr } from '@/services/uprService';
import type { UPR } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ManageUprsPage() {
  const [uprs, setUprs] = useState<UPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = useAuth(); // Assuming useAuth provides isAdmin flag
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [uprToDelete, setUprToDelete] = useState<UPR | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const fetchUprs = async () => {
    setIsLoading(true);
    try {
      const allUprs = await getAllUprs();
      setUprs(allUprs);
    } catch (error: any) {
      toast({ title: "Gagal Memuat UPR", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUprs();
    }
  }, [isAdmin]);

  const handleDeleteUpr = (upr: UPR) => {
    setUprToDelete(upr);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUpr = async () => {
    if (!uprToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUpr(uprToDelete.id);
      toast({ title: "UPR Dihapus", description: `UPR "${uprToDelete.name}" telah berhasil dihapus.`, variant: "destructive" });
      fetchUprs(); // Refresh list
    } catch (error: any) {
      toast({ title: "Gagal Menghapus UPR", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setUprToDelete(null);
    }
  };


  if (!isAdmin) {
    return <p className="text-destructive">Akses ditolak. Hanya admin yang dapat mengakses halaman ini.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Unit Pemilik Risiko (UPR)"
        description="Kelola semua UPR dalam sistem."
        actions={
          <Link href="/admin/uprs/manage/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah UPR Baru
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : uprs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Belum ada UPR yang terdaftar.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Kode UPR</TableHead>
                    <TableHead>Nama UPR</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {uprs.map((upr) => (
                    <TableRow key={upr.id}>
                        <TableCell className="font-medium">{upr.code}</TableCell>
                        <TableCell>{upr.name}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate" title={upr.description || ''}>{upr.description || '-'}</TableCell>
                        <TableCell className="text-right space-x-2">
                        <Link href={`/admin/uprs/manage/${upr.id}`} passHref>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit UPR</span>
                            </Button>
                        </Link>
                         <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteUpr(upr)} disabled={isDeleting && uprToDelete?.id === upr.id}>
                            {isDeleting && uprToDelete?.id === upr.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                            <span className="sr-only">Hapus UPR</span>
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
            <AlertDialogTitle>Konfirmasi Hapus UPR</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus UPR "{uprToDelete?.name}" ({uprToDelete?.code})? 
              Semua data terkait (Sasaran, Potensi Risiko, Penyebab, Kontrol, Sesi Pemantauan, dll.) juga akan dihapus.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUpr} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
             {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    