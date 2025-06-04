
"use client";

import React, { useState, useEffect, useMemo } from "react";
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from "next-themes";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/icons";
import { SidebarNav } from "./sidebar-nav";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Settings as SettingsIcon, Loader2, Sun, Moon, AlertTriangle } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppStore, triggerGlobalDataFetchForStore } from '@/stores/useAppStore';
import type { UPR } from '@/lib/types';

const DEFAULT_FALLBACK_UPR_ID = 'Pengguna';
const DEFAULT_PERIOD = new Date().getFullYear().toString();

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, appUser, authContextLoading, profileLoading, isProfileComplete, refreshAppUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();
  
  const storeDataFetchedForUprPeriod = useAppStore(state => state.dataFetchedForUprPeriod);
  const resetStoreData = useAppStore(state => state.resetAllData);

  const activeUprDisplay = useMemo(() => {
    if (appUser?.role === 'admin' || appUser?.role === 'auditor') return "Admin/Auditor View";
    return appUser?.displayName || DEFAULT_FALLBACK_UPR_ID;
  }, [appUser]);
  
  const activePeriodDisplay = useMemo(() => appUser?.activePeriod || DEFAULT_PERIOD, [appUser]);

  const publicPaths = ['/login', '/register'];
  const setupPath = '/profile-setup';

  useEffect(() => {
    console.log("[AppLayout] useEffect triggered. States:", { authContextLoading, profileLoading, currentUser: !!currentUser, appUser: !!appUser, isProfileComplete, pathname });

    if (authContextLoading) {
      console.log("[AppLayout] Auth context is loading. No redirect action from useEffect.");
      return;
    }

    // Case 1: No user session
    if (!currentUser) {
      if (!publicPaths.includes(pathname) && pathname !== setupPath) {
        console.log("[AppLayout] No user, not on public/setup path. Redirecting to /login from", pathname);
        router.replace('/login');
      } else {
        console.log("[AppLayout] No user, but on public/setup path. No redirect action from useEffect.");
      }
      if (storeDataFetchedForUprPeriod !== null) {
         console.log("[AppLayout] User logged out or no user. Resetting Zustand store.");
         resetStoreData();
      }
      return;
    }

    // Case 2: User exists, profile is loading
    if (currentUser && profileLoading) {
      console.log("[AppLayout] User exists, but profile is loading. No redirect action from useEffect.");
      return;
    }

    // Case 3: User exists, auth and profile loading are false. Now decide based on path and profile completion.
    if (pathname === setupPath) {
      if (isProfileComplete) {
        console.log("[AppLayout] On setup path, but profile is complete. Redirecting to / from", pathname);
        router.replace('/');
      } else {
        console.log("[AppLayout] On setup path, profile incomplete. Allowing ProfileSetupPage to render (no redirect from useEffect).");
        // No redirect needed, ProfileSetupPage should handle its own logic or display form
      }
      return; 
    }

    // Case 4: User exists, not on setupPath.
    if (publicPaths.includes(pathname)) {
      // If user is on login/register but already logged in and profile is complete
      if(isProfileComplete){
        console.log("[AppLayout] On public path, but user logged in and profile complete. Redirecting to / from", pathname);
        router.replace('/');
      } else {
        // User on login/register, logged in, but profile incomplete
        console.log("[AppLayout] On public path, user logged in, profile incomplete. Redirecting to /profile-setup from", pathname);
        router.replace(setupPath);
      }
      return;
    }
    
    // Case 5: User exists, not on public/setup path. Profile must be complete.
    // If profile is somehow not complete here, redirect to setup.
    if (!appUser || !isProfileComplete) {
      console.log("[AppLayout] User/AppUser exists, but profile incomplete (or appUser missing after load). Redirecting to /profile-setup from", pathname);
      router.replace(setupPath);
      return;
    }

    // Case 6: User authenticated, profile complete, on a protected page.
    console.log("[AppLayout] User authenticated and profile complete. Path:", pathname, "UPR ID:", appUser.uprId, "Active Period:", appUser.activePeriod);
    
    let uprIdForDataFetch = appUser.uprId;
    if (appUser.role === 'userSatker' && appUser.assignedUprId) {
      uprIdForDataFetch = appUser.assignedUprId;
    } else if ((appUser.role === 'admin' || appUser.role === 'auditor') && !appUser.uprId) {
        console.warn(`[AppLayout] Admin/Auditor user ${currentUser.uid} does not have a default UPR. Store data fetch may be limited or require UPR selection UI.`);
        uprIdForDataFetch = null; // This might need a different handling for Admin/Auditor to select a UPR
    }

    if (uprIdForDataFetch && appUser.activePeriod && currentUser.uid) {
       console.log(`[AppLayout] Triggering global data fetch for UPR ID: ${uprIdForDataFetch}, Period: ${appUser.activePeriod}, Actual User: ${currentUser.uid}`);
       triggerGlobalDataFetchForStore(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
    } else if (!uprIdForDataFetch && (appUser.role === 'admin' || appUser.role === 'auditor')) {
       console.log(`[AppLayout] Admin/Auditor - Global data fetch depends on UPR selection UI (not yet implemented). Resetting store if context is invalid.`);
       if (storeDataFetchedForUprPeriod !== null) resetStoreData(); // Reset store if no valid UPR context for admin
    } else {
       console.warn("[AppLayout] Conditions for global data fetch not fully met. User Data:", appUser, "Resetting store if context is invalid.");
       if (storeDataFetchedForUprPeriod !== null) resetStoreData();
    }

  }, [currentUser, appUser, authContextLoading, profileLoading, isProfileComplete, router, pathname, resetStoreData, storeDataFetchedForUprPeriod]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logout Berhasil", description: "Anda telah berhasil keluar." });
      // Redirect is handled by useEffect based on currentUser becoming null
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: "Logout Gagal", description: "Terjadi kesalahan saat keluar.", variant: "destructive" });
    }
  };

  // Loader utama: ditampilkan HANYA jika auth context sedang loading (initial Firebase check)
  if (authContextLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memverifikasi sesi...</p>
        <Toaster />
      </div>
    );
  }

  // Setelah auth selesai:
  // 1. Jika tidak ada currentUser, dan kita di halaman publik, render children (login/register page)
  if (!currentUser && publicPaths.includes(pathname)) {
    return <>{children}<Toaster /></>;
  }

  // 2. Jika ada currentUser, tapi profile masih loading DAN kita tidak di /profile-setup, tampilkan loader profil.
  //    Jika kita SUDAH di /profile-setup, biarkan ProfileSetupPage yang menangani tampilannya sendiri.
  if (currentUser && profileLoading && pathname !== setupPath) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat profil pengguna...</p>
        <Toaster />
      </div>
    );
  }
  
  // 3. Jika currentUser ada, DAN kita berada di /profile-setup, DAN profile loading sudah selesai,
  //    ProfileSetupPage sendiri akan menentukan apakah dia perlu menampilkan form atau redirect
  //    berdasarkan isProfileComplete. Jadi, render children (ProfileSetupPage).
  if (currentUser && pathname === setupPath && !profileLoading) {
    return <>{children}<Toaster /></>;
  }

  // 4. Jika currentUser ada, profile sudah selesai loading (appUser dan isProfileComplete sudah final),
  //    DAN profil lengkap, DAN kita tidak di halaman publik, maka render layout utama.
  //    Logika redirect jika profil tidak lengkap tapi tidak di setupPath sudah ditangani di useEffect.
  if (currentUser && appUser && isProfileComplete && !publicPaths.includes(pathname) && pathname !== setupPath) {
    return (
      <SidebarProvider defaultOpen>
        <Sidebar variant="sidebar" collapsible="icon" side="left">
          <SidebarHeader className="p-4">
            <NextLink href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <AppLogo className="h-8 w-8 text-primary" />
              <span className="font-semibold text-lg text-primary group-data-[collapsible=icon]:hidden">
                RiskWise
              </span>
            </NextLink>
          </SidebarHeader>
          <Separator className="group-data-[collapsible=icon]:hidden" />
          <SidebarContent>
            <SidebarNav profileIncomplete={currentUser ? !isProfileComplete : false} />
          </SidebarContent>
          <Separator className="group-data-[collapsible=icon]:hidden" />
          <SidebarFooter className="p-2 group-data-[collapsible=icon]:hidden">
            <div className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} RiskWise
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              {appUser && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">UPR:</span> {activeUprDisplay} | <span className="font-semibold">Periode:</span> {activePeriodDisplay}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {theme === 'light' ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
                    <span className="sr-only">Ganti tema</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    Terang
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    Gelap
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    Sistem
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {currentUser && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={appUser?.photoURL || currentUser.photoURL || "https://placehold.co/100x100.png"} alt={appUser?.displayName || currentUser.displayName || currentUser.email || "User"} data-ai-hint="profile person" />
                        <AvatarFallback>{(appUser?.displayName || currentUser.displayName || currentUser.email || "RW").substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{appUser?.displayName || currentUser.displayName || currentUser.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <NextLink href="/settings">
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        <span>Pengaturan</span>
                      </NextLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Keluar</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {currentUser && appUser && !isProfileComplete && pathname !== '/profile-setup' && ( 
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Profil Belum Lengkap!</AlertTitle>
                <AlertDescription>
                  Konfigurasi profil Anda belum lengkap. 
                  {(appUser?.role === 'userSatker' && !appUser?.assignedUprId) && ' Anda mungkin perlu menunggu penetapan UPR oleh Admin. '}
                  Harap kunjungi halaman 
                  <NextLink href="/settings" className="font-semibold underline hover:text-destructive-foreground/80 ml-1">
                    Pengaturan
                  </NextLink>
                  {' '}untuk memeriksa dan melengkapi profil, atau hubungi Admin jika diperlukan.
                </AlertDescription>
              </Alert>
            )}
            {children}
          </main>
          <Toaster />
        </SidebarInset>
      </SidebarProvider>
    );
  }
  
  // Fallback loader jika tidak ada kondisi di atas yang terpenuhi (seharusnya jarang terjadi)
  // Ini akan menangkap kasus di mana useEffect belum selesai mengarahkan.
  console.log("[AppLayout] Fallback Loader: No primary render condition met. States:", { authContextLoading, profileLoading, currentUser:!!currentUser, isProfileComplete, pathname });
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-xl text-muted-foreground">Mengarahkan atau memuat data...</p>
      <Toaster />
    </div>
  );
}
