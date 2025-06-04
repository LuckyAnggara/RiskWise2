
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
    // if (appUser?.role === 'admin' || appUser?.role === 'auditor') return "Admin/Auditor View"; // Logic for admin view if needed
    return appUser?.displayName || DEFAULT_FALLBACK_UPR_ID;
  }, [appUser]);
  
  const activePeriodDisplay = useMemo(() => appUser?.activePeriod || DEFAULT_PERIOD, [appUser]);

  const publicPaths = ['/login', '/register'];
  const settingsPath = '/settings';

  useEffect(() => {
    console.log("[AppLayout] useEffect triggered. States:", { authContextLoading, profileLoading, currentUser: !!currentUser, appUser: !!appUser, isProfileComplete, pathname });

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

    // currentUser exists, now handle profile loading and completion
    if (profileLoading) {
      console.log("[AppLayout] User exists, but profile is loading. No redirect action.");
      return;
    }
    
    // At this point: authContextLoading = false, currentUser exists, profileLoading = false.
    // appUser and isProfileComplete have their final values.

    if (publicPaths.includes(pathname)) {
      console.log(`[AppLayout] On public path (${pathname}), but user logged in. Redirecting to /.`);
      router.replace('/');
      return;
    }

    // Core logic: If profile is not complete, and user is not on settings page, redirect to settings.
    if (!isProfileComplete && pathname !== settingsPath) {
      console.log(`[AppLayout] User profile is not complete (uprId: ${appUser?.uprId}, activePeriod: ${appUser?.activePeriod}). Redirecting from ${pathname} to ${settingsPath}.`);
      router.replace(settingsPath);
      return;
    }
    
    // If profile is complete, handle data fetching for the store
    if (isProfileComplete) {
      console.log("[AppLayout] User authenticated and profile complete. Path:", pathname, "UPR ID:", appUser?.uprId, "Active Period:", appUser?.activePeriod);
      
      let uprIdForDataFetch = appUser?.uprId; // For userSatker, uprId IS their displayName/unique UPR
      // Logic for admin/auditor to select UPR would go here if implemented
      // if ((appUser?.role === 'admin' || appUser?.role === 'auditor') && !appUser?.uprId) {
      //     console.warn(`[AppLayout] Admin/Auditor user ${currentUser.uid} does not have a default UPR. Store data fetch may be limited or require UPR selection UI.`);
      //     uprIdForDataFetch = null; 
      // }

      if (uprIdForDataFetch && appUser?.activePeriod && currentUser.uid) {
         console.log(`[AppLayout] Triggering global data fetch for UPR ID: ${uprIdForDataFetch}, Period: ${appUser.activePeriod}, Actual User: ${currentUser.uid}`);
         // Check if the context for data fetch has actually changed
         const newContextIdentifier = `${uprIdForDataFetch}|${appUser.activePeriod}`;
         if (storeDataFetchedForUprPeriod !== newContextIdentifier) {
           console.log(`[AppLayout] Context changed or data not fetched. Old: ${storeDataFetchedForUprPeriod}, New: ${newContextIdentifier}. Fetching.`);
           triggerGlobalDataFetchForStore(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
         } else {
           console.log(`[AppLayout] Data already fetched for context: ${newContextIdentifier}. Skipping fetch.`);
         }
      } else if (!uprIdForDataFetch && (appUser?.role === 'admin' || appUser?.role === 'auditor')) {
         console.log(`[AppLayout] Admin/Auditor - Global data fetch depends on UPR selection UI. Resetting store if context is invalid.`);
         if (storeDataFetchedForUprPeriod !== null) resetStoreData(); 
      } else {
         console.warn("[AppLayout] Conditions for global data fetch not fully met. User Data:", appUser, "Resetting store if context is invalid.");
         if (storeDataFetchedForUprPeriod !== null) resetStoreData();
      }
    }

  }, [currentUser, appUser, authContextLoading, profileLoading, isProfileComplete, router, pathname, resetStoreData, storeDataFetchedForUprPeriod]);

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
  
  if (!currentUser && publicPaths.includes(pathname)) {
    return <>{children}<Toaster /></>;
  }

  // If execution reaches here, it means:
  // - authContextLoading is false.
  // - profileLoading is false.
  // - currentUser might be null (handled by redirect in useEffect) or present.
  // - isProfileComplete might be true or false.
  // - pathname determines what to show.

  if (currentUser) { // User is logged in
    if (!isProfileComplete && pathname !== settingsPath) {
      // This case should be caught by useEffect redirect, but as a fallback, show a minimal loader.
      // This prevents rendering the main layout if the redirect hasn't happened yet.
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xl text-muted-foreground">Mengarahkan ke Pengaturan Profil...</p>
          <Toaster />
        </div>
      );
    }

    // If profile is incomplete AND we are on settingsPath, or profile is complete for any path (not public)
    // Then render the main layout or the settings page itself.
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
            {currentUser && appUser && !isProfileComplete && pathname !== settingsPath && ( 
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Profil Belum Lengkap!</AlertTitle>
                <AlertDescription>
                  Konfigurasi profil Anda belum lengkap. 
                  Harap kunjungi halaman 
                  <NextLink href="/settings" className="font-semibold underline hover:text-destructive-foreground/80 ml-1">
                    Pengaturan
                  </NextLink>
                  {' '}untuk memeriksa dan melengkapi profil. Beberapa fitur mungkin terbatas.
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

  // Fallback if no user and not on public path (should be caught by useEffect redirect to /login)
  console.log("[AppLayout] Fallback Loader (final). Pathname:", pathname);
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-xl text-muted-foreground">Mengarahkan atau memuat data...</p>
      <Toaster />
    </div>
  );
}
    
    