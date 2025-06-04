
"use client";

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { isAdmin, authContextLoading, currentUser } = useAuth();
  const router = useRouter();

  if (authContextLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memverifikasi akses admin...</p>
      </div>
    );
  }

  if (!currentUser) { // Should be caught by AppLayout, but good to have
    router.replace('/login');
    return null;
  }
  
  if (!isAdmin) {
    // If somehow a non-admin reaches this page, redirect them.
    // AppLayout should ideally prevent this based on sidebar nav.
    router.replace('/'); 
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Shield className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl text-muted-foreground">Akses Ditolak.</p>
        <p className="text-sm text-muted-foreground">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dasbor Administrasi"
        description="Kelola Unit Pemilik Risiko (UPR), pengguna, dan pengaturan sistem lainnya."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/uprs" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Manajemen UPR</CardTitle>
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Buat, edit, dan kelola Unit Pemilik Risiko (UPR) di dalam sistem.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Manajemen Pengguna</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Lihat daftar pengguna, assign UPR, dan kelola peran pengguna.
              </p>
            </CardContent>
          </Card>
        </Link>
        {/* Placeholder for more admin features */}
      </div>
    </div>
  );
}

    