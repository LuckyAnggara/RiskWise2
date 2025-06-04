
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function AuditorLayout({ children }: { children: React.ReactNode }) {
  const { appUser, authContextLoading, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authContextLoading && !profileLoading) {
      if (!appUser || appUser.role !== 'auditor') {
        router.replace('/'); 
      }
    }
  }, [appUser, authContextLoading, profileLoading, router]);

  if (authContextLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memverifikasi akses auditor...</p>
      </div>
    );
  }
  
  if(!appUser || appUser.role !== 'auditor'){
      return (
         <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
            <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
            <p className="text-xl text-muted-foreground">Akses Ditolak.</p>
            <p className="text-sm text-muted-foreground">Anda tidak memiliki izin untuk mengakses modul auditor.</p>
        </div>
      );
  }

  return <>{children}</>;
}
