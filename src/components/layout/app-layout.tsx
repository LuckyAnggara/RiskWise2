
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
  const isAdminUser = appUser?.role === 'admin';

  const activeUprDisplay = useMemo(() => appUser?.displayName || DEFAULT_FALLBACK_UPR_ID, [appUser]);
  const activePeriodDisplay = useMemo(() => appUser?.activePeriod || DEFAULT_PERIOD, [appUser]);

  const publicPaths = ['/login', '/register'];
  const settingsPath = '/settings';
  const auditorSettingsPath = '/auditor/settings';
  const auditorDashboardPath = '/auditor';

  useEffect(() => {
    console.log("[AppLayout] useEffect triggered. States:", { 
      authContextLoading, 
      profileLoading, 
      currentUser: !!currentUser, 
      appUser: appUser ? { uid: appUser.uid, displayName: appUser.displayName, uprId: appUser.uprId, activePeriod: appUser.activePeriod, role: appUser.role } : null, 
      isProfileComplete,
      isUprAssigned,
      isAuditor,
      isAdminUser,
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

    // User is logged in
    if (profileLoading) {
      console.log("[AppLayout] User exists, but AppUser profile is loading. No redirect action (main loader should handle).");
      return;
    }
    
    if (publicPaths.includes(pathname)) {
      console.log(`[AppLayout] On public path (${pathname}), but user logged in. Redirecting based on role.`);
      if (isAuditor) {
        router.replace(auditorDashboardPath);
      } else {
        router.replace('/'); // For admin and userSatker
      }
      return;
    }
    
    // Profile setup and role-based redirects
    if (!isProfileComplete) {
      // For auditors, if their basic profile (displayName) is not set, they might also need a setup.
      // However, the main "isProfileComplete" for userSatker often means UPR assignment.
      // Auditors might have a simpler profile setup.
      const targetSetupPath = isAuditor ? auditorSettingsPath : settingsPath; // Or a dedicated auditor setup page
      if (pathname !== targetSetupPath && pathname !== '/profile-setup') { // Allow profile-setup for initial creation
        console.log(`[AppLayout] User profile basics are not complete. Current path: ${pathname}. Redirecting to ${targetSetupPath}.`);
        router.replace(targetSetupPath);
      }
      return;
    }

    // If auditor is on main dashboard, redirect to auditor dashboard
    if (isAuditor && pathname === "/") {
        console.log("[AppLayout] Auditor on root path, redirecting to auditor dashboard.");
        router.replace(auditorDashboardPath);
        return;
    }
    
    // Data fetching logic
    if (isProfileComplete && appUser?.activePeriod && currentUser.uid) {
        let uprIdForDataFetch: string | null = null;
        
        if (isAuditor) {
            // Auditor data fetching is page-specific (e.g., on /reviu/data-risiko).
            // No global data fetch for auditor's "own" UPR from AppLayout.
            // Reset store if auditor is outside their specific sections and store had data.
            if (storeDataFetchedForUprPeriod !== null && !pathname.startsWith('/reviu') && !pathname.startsWith('/auditor')) {
                console.log("[AppLayout] Auditor role active, outside reviu/auditor sections, resetting store if it had data.");
                resetStoreData();
            }
        } else if (isUprAssigned && appUser.uprId) { // userSatker or Admin with assigned UPR
            uprIdForDataFetch = appUser.uprId;
        } else if (isAdminUser && !appUser.uprId) { // Admin without a specific UPR (might be superadmin)
            // Admin might not need a default UPR context for some views (e.g., user management).
            // For data-related views, they might select a UPR or this logic needs refinement.
            // For now, don't trigger global fetch if admin has no UPR, let pages handle it.
            console.log("[AppLayout] Admin user without assigned UPR. Skipping global data fetch from AppLayout.");
            if (storeDataFetchedForUprPeriod !== null) resetStoreData(); // Reset if there was data from another context
        }


        if (uprIdForDataFetch) { // Only for userSatker with assigned UPR or Admin with assigned UPR
            const currentContextIdentifier = `${uprIdForDataFetch}|${appUser.activePeriod}`;
            if (storeDataFetchedForUprPeriod !== currentContextIdentifier) {
                console.log(`[AppLayout] Context changed or data not fetched for User. Old: ${storeDataFetchedForUprPeriod}, New: ${currentContextIdentifier}. Triggering global data fetch for UPR ID: ${uprIdForDataFetch}.`);
                triggerGlobalDataFetch(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
            } else {
                console.log(`[AppLayout] Data already fetched for context: ${currentContextIdentifier}.`);
            }
        } else if (!isAuditor && isProfileComplete && !isUprAssigned && !isAdminUser) { // UserSatker role specifically
            console.log(`[AppLayout] userSatker profile basics complete, but UPR not assigned. Store will be reset.`);
            if (storeDataFetchedForUprPeriod !== null) {
               console.log("[AppLayout] userSatker UPR not assigned, resetting store data.");
               resetStoreData();
            }
        }
    } else if (!isProfileComplete && (pathname === settingsPath || pathname === auditorSettingsPath || pathname === '/profile-setup')) {
      console.log("[AppLayout] On settings/profile-setup path, profile basics incomplete. Allowing page to render for setup.");
    } else {
      console.warn("[AppLayout] Unhandled state for data fetching or profile context. Current states:", {isProfileComplete, isUprAssigned, appUser});
       if (storeDataFetchedForUprPeriod !== null) resetStoreData();
    }

  }, [
    currentUser, appUser, authContextLoading, profileLoading, 
    isProfileComplete, isUprAssigned, router, pathname, isAuditor, isAdminUser,
    resetStoreData, storeDataFetchedForUprPeriod, triggerGlobalDataFetch,
    auditorDashboardPath, auditorSettingsPath, settingsPath // Add new paths
  ]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      resetStoreData(); 
      toast({ title: "Keluar Berhasil", description: "Anda telah berhasil keluar." });
      // No need to explicitly push to /login, useEffect above will handle it.
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

  // If user is not logged in AND on a public path, render children directly (e.g., login page)
  if (!currentUser && publicPaths.includes(pathname)) {
    return <>{children}<Toaster /></>;
  }
  
  // If user is logged in, but profile is still loading AND they are not on a setup/settings path, show loader.
  // If they are on settings/profile-setup, let those pages handle their own loading state.
  if (currentUser && profileLoading && ![settingsPath, auditorSettingsPath, '/profile-setup'].includes(pathname)) {
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat profil pengguna...</p>
        <Toaster />
      </div>
    );
  }
  
  // If user is logged in and profile is NOT complete, AND they are NOT on their designated settings/setup page,
  // this indicates useEffect should have redirected them. If somehow they are here, show loader until redirect.
  if (currentUser && !profileLoading && !isProfileComplete && 
      pathname !== (isAuditor ? auditorSettingsPath : settingsPath) &&
      pathname !== '/profile-setup') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mengarahkan ke pengaturan profil...</p>
        <Toaster />
      </div>
    );
  }

  // If user is logged in (and profile loaded or on setup page), render the main layout
  if (currentUser) {
    return (
      <SidebarProvider defaultOpen>
        <Sidebar variant="sidebar" collapsible="icon" side="left">
          <SidebarHeader className="p-4">
            <NextLink href={isAuditor ? auditorDashboardPath : "/"} className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
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
                  ) : isAdminUser && !isUprAssigned ? (
                     <span className="font-semibold">Peran: Administrator Sistem</span>
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
                    <NextLink href={isAuditor ? auditorSettingsPath : settingsPath}>
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
            {currentUser && appUser && isProfileComplete && !isUprAssigned && !isAuditor && !isAdminUser && pathname !== settingsPath && ( 
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
  
  // Fallback for unhandled states (e.g., user exists but no appUser and profile is supposedly complete - indicates inconsistency)
  // This should ideally not be reached if logic above is correct.
  console.warn("[AppLayout] Reached fallback loader state. This might indicate an issue. Pathname:", pathname, "currentUser:", !!currentUser, "appUser:", !!appUser, "isProfileComplete:", isProfileComplete, "isUprAssigned:", isUprAssigned);
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-xl text-muted-foreground">Mengarahkan atau memuat data...</p>
      <Toaster />
    </div>
  );
}
