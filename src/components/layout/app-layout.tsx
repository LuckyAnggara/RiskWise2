
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
  const { currentUser, appUser, authContextLoading, profileLoading, isProfileComplete, refreshAppUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();
  
  const storeDataFetchedForUprPeriod = useAppStore(state => state.dataFetchedForUprPeriod);
  const resetStoreData = useAppStore(state => state.resetAllData);
  const store = useAppStore();

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

    // Specific handling for /settings path
    if (pathname === settingsPath) {
      if (isProfileComplete && appUser?.uprId) { // If profile is complete, no need to force stay, can navigate away if desired (or app redirects from settings)
        console.log("[AppLayout] On settings path, profile complete. No redirect from AppLayout.");
        // Allow settings page to render and handle its own logic if profile is complete (e.g. normal settings view)
      } else if (!isProfileComplete) {
        console.log("[AppLayout] On settings path, profile incomplete. Allowing SettingsPage to render for setup/completion.");
        // Allow settings page to render for profile setup/completion
      }
      // Data fetch for store should happen if profile is complete, even on settings page
      if (isProfileComplete && appUser?.uprId && appUser?.activePeriod && currentUser.uid) {
        const uprIdForDataFetch = appUser.uprId; // This MUST be the actual UPR document ID
        const currentContextIdentifier = `${uprIdForDataFetch}|${appUser.activePeriod}`;
        console.log(`[AppLayout] (On Settings) Context for data fetch: ${currentContextIdentifier}. Store already fetched for: ${storeDataFetchedForUprPeriod}`);
        if (storeDataFetchedForUprPeriod !== currentContextIdentifier) {
          console.log(`[AppLayout] (On Settings) Context changed or data not fetched. Triggering global data fetch for ${currentContextIdentifier}.`);
          store.triggerGlobalDataFetch(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
        }
      }
      return; // Explicitly return for settings path to prevent further redirects from this useEffect
    }

    // For paths other than public or settings:
    if (!isProfileComplete) {
      console.log(`[AppLayout] User profile is not complete (uprId: ${appUser?.uprId}, activePeriod: ${appUser?.activePeriod}). Redirecting from ${pathname} to ${settingsPath}.`);
      router.replace(settingsPath);
      return;
    }
    
    // If profile is complete and not on public/settings path
    if (isProfileComplete && appUser?.uprId && appUser?.activePeriod && currentUser.uid) {
      const uprIdForDataFetch = appUser.uprId; // This MUST be the actual UPR document ID
      console.log(`[AppLayout] Profile complete. UPR ID for data fetch: ${uprIdForDataFetch}, Period: ${appUser.activePeriod}, User UID: ${currentUser.uid}`);
      const currentContextIdentifier = `${uprIdForDataFetch}|${appUser.activePeriod}`;
      if (storeDataFetchedForUprPeriod !== currentContextIdentifier) {
        console.log(`[AppLayout] Context changed or data not fetched. Old: ${storeDataFetchedForUprPeriod}, New: ${currentContextIdentifier}. Triggering global data fetch.`);
        store.triggerGlobalDataFetch(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
      } else {
        console.log(`[AppLayout] Data already fetched for context: ${currentContextIdentifier}.`);
      }
    } else {
      console.warn("[AppLayout] Profile marked complete, but uprId or activePeriod missing from appUser. This might be an issue.", appUser);
      if (storeDataFetchedForUprPeriod !== null) resetStoreData(); // Reset store if context is invalid
    }

  }, [currentUser, appUser, authContextLoading, profileLoading, isProfileComplete, router, pathname, resetStoreData, storeDataFetchedForUprPeriod, store]);


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

  const mainLoaderVisible = authContextLoading || (currentUser && profileLoading && pathname !== settingsPath);
  // Allow settings page to show its own loading/content even if profileLoading is true,
  // because settings page handles both setup and normal view.

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
  
  // If not loading auth, and user exists:
  if (currentUser) {
    // If on settings path, always render children (settings page handles its own logic for incomplete profile)
    if (pathname === settingsPath) {
      return <>{children}<Toaster /></>;
    }
    // If profile is complete, render full app layout
    if (isProfileComplete) {
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
                    Konfigurasi profil Anda belum lengkap (UPR ID atau Periode Aktif mungkin belum di-set). 
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
    // If profile is NOT complete and user is NOT on settings path, useEffect should have redirected.
    // If for some reason it didn't (e.g., race condition or logic flaw in useEffect),
    // this will show a loader as a fallback before useEffect catches up.
  }

  // If not loading auth, and no user, and on public path:
  if (!currentUser && publicPaths.includes(pathname)) {
    return <>{children}<Toaster /></>;
  }
  
  // Fallback loader for any other unhandled state (should be rare)
  console.log("[AppLayout] Fallback Loader (final). Pathname:", pathname, "currentUser:", !!currentUser, "isProfileComplete:", isProfileComplete);
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-xl text-muted-foreground">Mengarahkan atau memuat data...</p>
      <Toaster />
    </div>
  );
}
