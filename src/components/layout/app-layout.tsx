
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
    isProfileComplete, 
    isUprAssigned,    
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

  const isAuditor = appUser?.role === 'auditor';

  const activeUprDisplay = useMemo(() => appUser?.displayName || DEFAULT_FALLBACK_UPR_ID, [appUser]);
  const activePeriodDisplay = useMemo(() => appUser?.activePeriod || DEFAULT_PERIOD, [appUser]);

  const publicPaths = ['/login', '/register'];
  const settingsPath = '/settings';

  useEffect(() => {
    console.log("[AppLayout] useEffect triggered. States:", { 
      authContextLoading, 
      profileLoading, 
      currentUser: !!currentUser, 
      appUser: appUser ? { uid: appUser.uid, displayName: appUser.displayName, uprId: appUser.uprId, activePeriod: appUser.activePeriod, role: appUser.role } : null, 
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

    if (profileLoading) {
      console.log("[AppLayout] User exists, but AppUser profile is loading. No redirect action (main loader should handle).");
      return;
    }
    
    if (publicPaths.includes(pathname)) {
      console.log(`[AppLayout] On public path (${pathname}), but user logged in. Redirecting to / (AppLayout will then check profile).`);
      router.replace('/');
      return;
    }
    
    if (!isProfileComplete && pathname !== settingsPath) {
      console.log(`[AppLayout] User profile basics are not complete. Current path: ${pathname}. Redirecting to ${settingsPath}.`);
      router.replace(settingsPath);
      return;
    }

    // Data fetching logic based on UPR assignment and role
    if (isProfileComplete && appUser?.activePeriod && currentUser.uid) {
        let uprIdForDataFetch: string | null = null;
        
        if (isAuditor) {
            // For auditors, data fetching is typically handled on the specific review page
            // based on localStorage. We might not need to trigger a global fetch here unless
            // they also have a default UPR they operate on as userSatker.
            // For now, assume auditor data fetch is more page-specific.
            // If they were previously on a userSatker UPR and switched to auditor role, reset store.
             if (storeDataFetchedForUprPeriod !== null && !pathname.startsWith('/reviu')) { // Heuristic to reset if not in reviu section
                console.log("[AppLayout] Auditor role active, not in reviu section, resetting store if it had data.");
                resetStoreData();
            }
        } else if (isUprAssigned && appUser.uprId) {
            uprIdForDataFetch = appUser.uprId;
        }

        if (uprIdForDataFetch) {
            const currentContextIdentifier = `${uprIdForDataFetch}|${appUser.activePeriod}`;
            if (storeDataFetchedForUprPeriod !== currentContextIdentifier) {
                console.log(`[AppLayout] Context changed or data not fetched for UPR User. Old: ${storeDataFetchedForUprPeriod}, New: ${currentContextIdentifier}. Triggering global data fetch for UPR ID: ${uprIdForDataFetch}.`);
                triggerGlobalDataFetch(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
            } else {
                console.log(`[AppLayout] Data already fetched for context: ${currentContextIdentifier}.`);
            }
        } else if (!isAuditor && isProfileComplete && !isUprAssigned) {
            console.log(`[AppLayout] Profile basics complete, but UPR not assigned (and not auditor). Store will be reset.`);
            if (storeDataFetchedForUprPeriod !== null) {
               console.log("[AppLayout] UPR not assigned, resetting store data.");
               resetStoreData();
            }
        }
    } else if (!isProfileComplete && pathname === settingsPath) {
      console.log("[AppLayout] On settings path, profile basics incomplete. Allowing SettingsPage to render for setup.");
    } else {
      console.warn("[AppLayout] Unhandled state for data fetching or profile context. Current states:", {isProfileComplete, isUprAssigned, appUser});
       if (storeDataFetchedForUprPeriod !== null) resetStoreData();
    }

  }, [
    currentUser, appUser, authContextLoading, profileLoading, 
    isProfileComplete, isUprAssigned, router, pathname, isAuditor,
    resetStoreData, storeDataFetchedForUprPeriod, triggerGlobalDataFetch
  ]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      resetStoreData(); 
      toast({ title: "Keluar Berhasil", description: "Anda telah berhasil keluar." });
      router.push('/login'); 
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: "Gagal Keluar", description: "Terjadi kesalahan saat mencoba keluar.", variant: "destructive" });
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

  if (!currentUser && publicPaths.includes(pathname)) {
    return <>{children}<Toaster /></>;
  }
  
  if (currentUser && profileLoading && pathname !== settingsPath) {
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat profil pengguna...</p>
        <Toaster />
      </div>
    );
  }

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
            <SidebarNav /> 
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
                  {isAuditor ? (
                     <span className="font-semibold">Peran: Auditor Internal</span>
                  ) : (
                    <>
                      <span className="font-semibold">UPR:</span> {activeUprDisplay} | <span className="font-semibold">Periode:</span> {activePeriodDisplay}
                    </>
                  )}
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
            {currentUser && appUser && isProfileComplete && !isUprAssigned && !isAuditor && pathname !== settingsPath && ( 
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
  
  console.log("[AppLayout] Fallback Loader (final). Pathname:", pathname, "currentUser:", !!currentUser, "isProfileComplete:", isProfileComplete, "isUprAssigned:", isUprAssigned);
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-xl text-muted-foreground">Mengarahkan atau memuat data...</p>
      <Toaster />
    </div>
  );
}
