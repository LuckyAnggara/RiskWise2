
// src/app/admin/layout.tsx
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2, Shield } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, authContextLoading, currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authContextLoading) {
      if (!currentUser) {
        router.replace('/login');
      } else if (!isAdmin) {
        router.replace('/'); // Redirect non-admins to dashboard
      }
    }
  }, [isAdmin, authContextLoading, currentUser, router]);

  if (authContextLoading || (currentUser && !isAdmin)) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]"> {/* Adjust height if header is present */}
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memverifikasi akses admin...</p>
      </div>
    );
  }
  
  if(!currentUser && !authContextLoading){ // Should have been redirected by useEffect but defensive check
      return null; 
  }


  return <>{children}</>;
}

    