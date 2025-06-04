
"use client";

import React, { useEffect, useMemo } from "react";
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
import { useAppStore } from '@/stores/useAppStore';

const DEFAULT_FALLBACK_UPR_ID = 'Pengguna';
const DEFAULT_PERIOD = new Date().getFullYear().toString();

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { 
    currentUser, 
    appUser, 
    authContextLoading, 
    profileLoading, 
    isProfileComplete, // Basics: displayName, activePeriod, availablePeriods are set
    isUprAssigned,    // UPR ID is assigned by admin
    refreshAppUser 
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();
  
  const store = useAppStore.getState();
  const storeDataFetchedForUprPeriod = store.dataFetchedForUprPeriod;
  const resetStoreData = store.resetAllData;
  const triggerGlobalDataFetch = store.triggerGlobalDataFetch;


  const activeUprDisplay = useMemo(() => appUser?.displayName || DEFAULT_FALLBACK_UPR_ID, [appUser]);
  const activePeriodDisplay = useMemo(() => appUser?.activePeriod || DEFAULT_PERIOD, [appUser]);

  const publicPaths = ['/login', '/register'];
  const settingsPath = '/settings';

  useEffect(() => {
    console.log("[AppLayout] useEffect triggered. States:", { 
      authContextLoading, 
      profileLoading, 
      currentUser: !!currentUser, 
      appUser: appUser ? { uid: appUser.uid, displayName: appUser.displayName, uprId: appUser.uprId, activePeriod: appUser.activePeriod } : null, 
      isProfileComplete,
      isUprAssigned,
      pathname 
    });

    if (authContextLoading) {
      console.log("[AppLayout] Auth context is loading. No redirect action.");
      return;
    }

    if (!currentUser) {
      if (!publicPaths.includes(pathname)) {
        console.log(`[AppLayout] No user, not on public path (${pathname}). Redirecting to /login.`);
        router.replace('/login');
      }
      if (storeDataFetchedForUprPeriod !== null) {
         console.log("[AppLayout] User logged out or no user. Resetting Zustand store.");
         resetStoreData();
      }
      return;
    }

    // currentUser exists
    if (profileLoading) {
      console.log("[AppLayout] User exists, but AppUser profile is loading. No redirect action (main loader should handle).");
      return;
    }
    
    // At this point: authContextLoading = false, currentUser exists, profileLoading = false.
    // appUser, isProfileComplete, isUprAssigned have their final values (appUser might be null if Firestore doc doesn't exist).

    if (publicPaths.includes(pathname)) {
      console.log(`[AppLayout] On public path (${pathname}), but user logged in. Redirecting to / (AppLayout will then check profile).`);
      router.replace('/');
      return;
    }
    
    // User is logged in and not on a public path
    if (!isProfileComplete && pathname !== settingsPath) {
      console.log(`[AppLayout] User profile basics are not complete. Current path: ${pathname}. Redirecting to ${settingsPath}.`);
      router.replace(settingsPath);
      return;
    }

    // If profile basics are complete AND UPR is assigned, trigger data fetch
    if (isProfileComplete && isUprAssigned && appUser?.uprId && appUser.activePeriod && currentUser.uid) {
        const uprIdForDataFetch = appUser.uprId; 
        const currentContextIdentifier = `${uprIdForDataFetch}|${appUser.activePeriod}`;
        if (storeDataFetchedForUprPeriod !== currentContextIdentifier) {
            console.log(`[AppLayout] Context changed or data not fetched. Old: ${storeDataFetchedForUprPeriod}, New: ${currentContextIdentifier}. Triggering global data fetch for UPR ID: ${uprIdForDataFetch}.`);
            triggerGlobalDataFetch(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
        } else {
            console.log(`[AppLayout] Data already fetched for context: ${currentContextIdentifier}.`);
        }
    } else if (isProfileComplete && !isUprAssigned) {
        console.log(`[AppLayout] Profile basics complete, but UPR not assigned. Current UPR ID from appUser: ${appUser?.uprId}. Store will be reset.`);
        if (storeDataFetchedForUprPeriod !== null) {
           console.log("[AppLayout] UPR not assigned or changed from a previous valid UPR, resetting store data.");
           resetStoreData();
        }
    } else if (!isProfileComplete && pathname === settingsPath) {
      console.log("[AppLayout] On settings path, profile basics incomplete. Allowing SettingsPage to render for setup.");
    } else {
      console.warn("[AppLayout] Unhandled state for data fetching or profile context. Current states:", {isProfileComplete, isUprAssigned, appUser});
       if (storeDataFetchedForUprPeriod !== null) resetStoreData();
    }

  }, [
    currentUser, appUser, authContextLoading, profileLoading, 
    isProfileComplete, isUprAssigned, router, pathname, 
    resetStoreData, storeDataFetchedForUprPeriod, triggerGlobalDataFetch // Added triggerGlobalDataFetch
  ]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      resetStoreData(); 
      toast({ title: "Keluar Berhasil", description: "Anda telah berhasil keluar." });
      // No need to explicitly call router.push('/login') here if useEffect handles it.
      // However, for immediate feedback and to ensure redirection:
      router.push('/login'); 
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: "Gagal Keluar", description: "Terjadi kesalahan saat mencoba keluar.", variant: "destructive" });
    }
  };

  // --- Kondisi Render Utama ---

  if (authContextLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memverifikasi sesi...</p>
        <Toaster />
      </div>
    );
  }

  // Jika tidak ada pengguna dan berada di halaman publik (login/register)
  if (!currentUser && publicPaths.includes(pathname)) {
    return <>{children}<Toaster /></>;
  }
  
  // Jika ada pengguna, tapi profil (appUser) masih loading, DAN kita TIDAK di settingsPath
  // (karena settingsPath bisa menangani loading profilnya sendiri)
  if (currentUser && profileLoading && pathname !== settingsPath) {
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat profil pengguna...</p>
        <Toaster />
      </div>
    );
  }

  // Jika ada pengguna, dan kita sudah tidak loading auth/profile.
  // Maka, kita tampilkan layout utama (SidebarProvider)
  // Termasuk untuk halaman /settings, agar sidebar tetap ada.
  // Halaman settings/page.tsx akan menampilkan form setup jika isProfileComplete false.
  // SidebarNav akan menangani disabling menu jika UPR belum di-assign.
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
            {/* SidebarNav akan menerima info apakah UPR sudah di-assign */}
            <SidebarNav uprUnassigned={!isUprAssigned} /> 
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
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {/* Alert untuk UPR belum di-assign, tapi profil dasar sudah lengkap */}
            {currentUser && appUser && isProfileComplete && !isUprAssigned && pathname !== settingsPath && ( 
              <Alert variant="default" className="mb-4 bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-700 dark:text-amber-300">UPR Belum Di-assign</AlertTitle>
                <AlertDescription className="text-amber-600 dark:text-amber-400">
                  Profil dasar Anda sudah lengkap, namun Unit Pemilik Risiko (UPR) belum di-assign oleh Administrator. 
                  Beberapa fitur mungkin terbatas. Kunjungi halaman 
                  <NextLink href="/settings" className="font-semibold underline hover:text-amber-700/80 dark:hover:text-amber-300/80 ml-1">
                    Pengaturan
                  </NextLink>
                  {' '}untuk informasi lebih lanjut atau hubungi Administrator.
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
  
  // Fallback jika tidak ada pengguna DAN tidak di halaman publik (misalnya setelah logout)
  // useEffect seharusnya sudah menangani redirect ke /login dalam kasus ini.
  // Atau jika ada kondisi lain yang belum tertangani.
  console.log("[AppLayout] Fallback Loader (final). Pathname:", pathname, "currentUser:", !!currentUser, "isProfileComplete:", isProfileComplete, "isUprAssigned:", isUprAssigned);
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-xl text-muted-foreground">Mengarahkan atau memuat data...</p>
      <Toaster />
    </div>
  );
}
