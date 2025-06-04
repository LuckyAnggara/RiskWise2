
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

  useEffect(() => {
    console.log("[AppLayout] useEffect triggered. authContextLoading:", authContextLoading, "profileLoading:", profileLoading, "CurrentUser:", !!currentUser, "AppUser:", !!appUser, "isProfileComplete:", isProfileComplete, "Pathname:", pathname);

    const publicPaths = ['/login', '/register'];
    const setupPath = '/profile-setup';

    if (authContextLoading) {
      console.log("[AppLayout] Auth context is loading. No action (loader shown).");
      return; // Main loader will be shown
    }

    // Firebase Auth has initialized. currentUser is now definitive for this auth state.
    if (!currentUser) {
      if (!publicPaths.includes(pathname) && pathname !== setupPath) {
        console.log("[AppLayout] No user, not on public/setup path. Redirecting to /login from", pathname);
        router.push('/login');
      } else {
        console.log("[AppLayout] No user, but on public/setup path. No action.");
      }
      if (useAppStore.getState().dataFetchedForUprPeriod !== null) {
         console.log("[AppLayout] User logged out or no user. Resetting Zustand store.");
         resetStoreData();
      }
      return; // Early exit
    }

    // currentUser EXISTS. Now wait for profile (Firestore doc) to load or fail.
    if (profileLoading) {
      console.log("[AppLayout] User exists, but profile is loading. No action (loader shown).");
      return; // Loader for profile will be shown
    }

    // currentUser EXISTS and profileLoading IS FALSE.
    // This means fetchAppUser (attempt to get Firestore doc) has completed.
    
    if (!appUser && pathname !== setupPath) {
      // Firebase Auth user exists, profile fetch complete, but no appUser document in Firestore.
      console.log("[AppLayout] User exists, profile loaded, but no appUser (Firestore doc). Likely new user. Redirecting to /profile-setup from", pathname);
      router.push(setupPath);
      return;
    }

    if (appUser && !isProfileComplete && pathname !== setupPath) {
      // Firebase Auth user exists, appUser Firestore doc exists, but profile is incomplete.
      console.log("[AppLayout] User exists, appUser exists, but profile incomplete. Redirecting to /profile-setup from", pathname);
      router.push(setupPath);
      return;
    }
    
    // currentUser EXISTS, appUser EXISTS, and profile IS COMPLETE (or user is on setupPath)
    if (appUser && isProfileComplete) {
      if (publicPaths.includes(pathname) || pathname === setupPath) {
        console.log("[AppLayout] User logged in, profile complete, but on public/setup page. Redirecting to / from", pathname);
        router.push('/');
      } else {
        // User is logged in, profile is complete, and on a private page.
        const uprIdForDataFetch = (appUser.role === 'userSatker' && appUser.assignedUprId) ? appUser.assignedUprId : appUser.uprId;
        if (uprIdForDataFetch && appUser.activePeriod && currentUser.uid) {
           console.log(`[AppLayout] Profile complete. Path: ${pathname}. Calling triggerGlobalDataFetchForStore with UPR ID: ${uprIdForDataFetch}, Period: ${appUser.activePeriod}, User UID (actual): ${currentUser.uid}`);
           triggerGlobalDataFetchForStore(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
        } else {
            console.warn("[AppLayout] Profile complete, but missing uprIdForDataFetch or activePeriod for data fetching. User:", appUser);
            // For Admin/Auditor, uprIdForDataFetch might be null if they don't have a "default" UPR.
            // This needs specific handling for admin/auditor dashboard or UPR selection later.
            // For now, they might see an empty state or a prompt if data fetch relies on a specific UPR ID.
        }
      }
    }
    // If on /profile-setup and profile is not complete, it will simply render the setup page.
  }, [currentUser, appUser, authContextLoading, profileLoading, isProfileComplete, router, pathname, resetStoreData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Keluar Berhasil', description: 'Anda telah berhasil keluar.' });
      // resetStoreData(); // Already handled in useEffect
      router.push('/login'); 
    } catch (error) {
      console.error("Error logging out:", error);
      toast({ title: 'Gagal Keluar', description: 'Terjadi kesalahan saat keluar.', variant: 'destructive' });
    }
  };

  if (authContextLoading) {
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memverifikasi sesi...</p>
        <Toaster />
      </div>
    );
  }
  
  const isPublicPage = ['/login', '/register'].includes(pathname);
  const isSetupPage = pathname === '/profile-setup';

  if (!currentUser && !isPublicPage && !isSetupPage) {
    // This state should ideally be brief as useEffect will redirect.
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mengarahkan ke Login...</p>
        <Toaster />
      </div>
    );
  }
  
  if (currentUser && profileLoading && !isSetupPage && !isPublicPage) {
    // If Firebase user exists, but profile is still loading, and not on setup/public page, show loader.
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-xl text-muted-foreground">Memuat profil pengguna...</p>
            <Toaster />
        </div>
    );
  }

  if (isPublicPage || (isSetupPage && currentUser && (!appUser || !isProfileComplete) )) {
    // Render public pages OR setup page if user is present but profile incomplete or appUser not yet loaded
    return <>{children}<Toaster /></>;
  }
  
  // If profile is not complete AND user is NOT on setup page (and not on public page, and currentUser exists)
  // This case is now handled by useEffect redirecting to setupPath.
  // However, if somehow the redirect hasn't happened yet, this might flash.
  // It's better to rely on the useEffect for redirection.

  // Main App Layout for authenticated and profile-complete users
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
          {currentUser && appUser && !isProfileComplete && pathname !== '/profile-setup' && ( // Show alert only if appUser data is loaded but profile is incomplete
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Profil Belum Lengkap!</AlertTitle>
              <AlertDescription>
                Konfigurasi profil Anda belum lengkap. 
                {appUser?.role === 'userSatker' && !appUser?.assignedUprId && ' Anda mungkin perlu menunggu penetapan UPR oleh Admin jika peran Anda adalah User Satker. '}
                Harap kunjungi halaman 
                <NextLink href="/settings" className="font-semibold underline hover:text-destructive-foreground/80 ml-1">
                  Pengaturan
                </NextLink>
                {' '}untuk memeriksa dan melengkapi profil.
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
