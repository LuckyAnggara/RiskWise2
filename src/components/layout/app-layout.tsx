
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

  useEffect(() => {
    console.log("[AppLayout] useEffect triggered. States:", { authContextLoading, profileLoading, currentUser: !!currentUser, appUser: !!appUser, isProfileComplete, pathname });

    if (authContextLoading) {
      console.log("[AppLayout] Auth context is loading. No redirect action from useEffect.");
      return;
    }

    if (!currentUser) {
      if (!publicPaths.includes(pathname)) {
        console.log("[AppLayout] No user, not on public path. Redirecting to /login from", pathname);
        router.replace('/login');
      }
      if (storeDataFetchedForUprPeriod !== null) {
         console.log("[AppLayout] User logged out or no user. Resetting Zustand store.");
         resetStoreData();
      }
      return;
    }

    // currentUser exists, now wait for profileLoading to finish
    if (profileLoading) {
      console.log("[AppLayout] User exists, but profile is loading. No redirect action from useEffect.");
      return;
    }

    // authContextLoading is false, currentUser exists, profileLoading is false
    // appUser and isProfileComplete should have their final values
    if (publicPaths.includes(pathname)) {
      console.log("[AppLayout] On public path, but user logged in. Redirecting to / from", pathname);
      router.replace('/');
      return;
    }
    
    // At this point, user is logged in and not on a public path.
    // Profile loading is also complete.
    if (!isProfileComplete) {
      // Profile is not complete. App will render, but sidebar nav is restricted.
      // Alert will be shown. Data fetching for store might be skipped or limited.
      console.log("[AppLayout] User profile is not complete. Path:", pathname, "UPR ID:", appUser?.uprId, "Active Period:", appUser?.activePeriod);
      // If store has data for a different context, reset it.
      const currentContextIdentifier = `${appUser?.uprId || 'UNKNOWN_UPR'}|${appUser?.activePeriod || 'UNKNOWN_PERIOD'}`;
      if (storeDataFetchedForUprPeriod !== null && storeDataFetchedForUprPeriod !== currentContextIdentifier) {
        console.log(`[AppLayout] Profile incomplete or context changed, resetting store. Old context: ${storeDataFetchedForUprPeriod}, New potential (partial) context: ${currentContextIdentifier}`);
        resetStoreData();
      }
      // No redirect to /profile-setup from here anymore. User should go to /settings.
    } else {
      // Profile is complete. Fetch data.
      console.log("[AppLayout] User authenticated and profile complete. Path:", pathname, "UPR ID:", appUser?.uprId, "Active Period:", appUser?.activePeriod);
      
      let uprIdForDataFetch = appUser?.uprId;
      if (appUser?.role === 'userSatker' && appUser?.assignedUprId) {
        uprIdForDataFetch = appUser.assignedUprId;
      } else if ((appUser?.role === 'admin' || appUser?.role === 'auditor') && !appUser?.uprId) {
          console.warn(`[AppLayout] Admin/Auditor user ${currentUser.uid} does not have a default UPR. Store data fetch may be limited or require UPR selection UI.`);
          uprIdForDataFetch = null;
      }

      if (uprIdForDataFetch && appUser?.activePeriod && currentUser.uid) {
         console.log(`[AppLayout] Triggering global data fetch for UPR ID: ${uprIdForDataFetch}, Period: ${appUser.activePeriod}, Actual User: ${currentUser.uid}`);
         triggerGlobalDataFetchForStore(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
      } else if (!uprIdForDataFetch && (appUser?.role === 'admin' || appUser?.role === 'auditor')) {
         console.log(`[AppLayout] Admin/Auditor - Global data fetch depends on UPR selection UI. Resetting store if context is invalid.`);
         if (storeDataFetchedForUprPeriod !== null) resetStoreData(); 
      } else {
         console.warn("[AppLayout] Conditions for global data fetch not fully met. User Data:", appUser, "Resetting store if context is invalid.");
         if (storeDataFetchedForUprPeriod !== null) resetStoreData();
      }
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

  // --- Render Logic ---
  const mainLoaderVisible = authContextLoading || (currentUser && profileLoading);

  if (mainLoaderVisible) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          {authContextLoading ? "Memverifikasi sesi..." : (currentUser && profileLoading ? "Memuat profil pengguna..." : "Memuat...")}
        </p>
        <Toaster />
      </div>
    );
  }
  
  // User not logged in, and not on a public path already (handled by useEffect)
  // This mainly catches the case for initial render if useEffect hasn't redirected yet
  if (!currentUser && !publicPaths.includes(pathname)) {
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mengarahkan ke login...</p>
        <Toaster />
      </div>
    );
  }

  // If user is not logged in but on a public path (login/register), render children directly
  if (!currentUser && publicPaths.includes(pathname)) {
    return <>{children}<Toaster /></>;
  }

  // If user is logged in, render the main app layout
  if (currentUser) {
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
            <SidebarNav profileIncomplete={!isProfileComplete} />
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
            {currentUser && appUser && !isProfileComplete && ( 
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
                  {' '}untuk memeriksa dan melengkapi profil, atau hubungi Admin jika diperlukan. Beberapa fitur mungkin terbatas.
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

  // Fallback if no condition above is met (e.g., unexpected state)
  console.log("[AppLayout] Fallback Loader (final): Should not be reached often. States:", { authContextLoading, profileLoading, currentUser:!!currentUser, isProfileComplete, pathname });
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-xl text-muted-foreground">Mengarahkan atau memuat data...</p>
      <Toaster />
    </div>
  );
}

    