
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
    console.log("[AppLayout] useEffect triggered. States:", { authContextLoading, profileLoading, currentUser: !!currentUser, appUser: !!appUser, isProfileComplete, pathname });

    const publicPaths = ['/login', '/register'];
    const setupPath = '/profile-setup';

    if (authContextLoading) {
      console.log("[AppLayout] Auth context is loading. No action.");
      return;
    }

    if (!currentUser) {
      if (!publicPaths.includes(pathname) && pathname !== setupPath) {
        console.log("[AppLayout] No user, not on public/setup path. Redirecting to /login from", pathname);
        router.replace('/login');
      } else {
        console.log("[AppLayout] No user, but on public/setup path. No action.");
      }
      if (storeDataFetchedForUprPeriod !== null) {
         console.log("[AppLayout] User logged out or no user. Resetting Zustand store.");
         resetStoreData();
      }
      return;
    }

    // currentUser EXISTS. Now handle profile loading and completion.
    if (profileLoading) {
      console.log("[AppLayout] User exists, but profile is loading. No action.");
      return;
    }
    
    // currentUser EXISTS and profileLoading IS FALSE.
    
    if (pathname === setupPath) {
        if (isProfileComplete) {
            console.log("[AppLayout] On setup path, but profile is complete. Redirecting to / from", pathname);
            router.replace('/');
        } else {
            console.log("[AppLayout] On setup path, profile incomplete. Allowing ProfileSetupPage to render.");
            // No redirect, ProfileSetupPage should render
        }
        return; // Important: Stop further checks if on setupPath
    }

    // Not on setupPath, and not on publicPaths (implicit from earlier checks or next conditions)
    if (publicPaths.includes(pathname)) {
        if(isProfileComplete) {
            console.log("[AppLayout] On public path, but profile is complete. Redirecting to / from", pathname);
            router.replace('/');
        } else {
            console.log("[AppLayout] On public path, profile incomplete. Redirecting to /profile-setup from", pathname);
            router.replace(setupPath);
        }
        return;
    }
    
    // At this point, user is authenticated, not on public/setup path, and profile has been loaded.
    if (!appUser || !isProfileComplete) {
        console.log("[AppLayout] User/AppUser exists, but profile incomplete (or appUser missing after load). Redirecting to /profile-setup from", pathname);
        router.replace(setupPath);
        return;
    }

    // User is authenticated, profile is complete, and not on public/setup path.
    // This is the state for a regular, logged-in, fully-profiled user.
    console.log("[AppLayout] User authenticated and profile complete. Path:", pathname, "UPR ID:", appUser.uprId, "Active Period:", appUser.activePeriod);
    
    let uprIdForDataFetch = appUser.uprId;
    if (appUser.role === 'userSatker' && appUser.assignedUprId) {
      uprIdForDataFetch = appUser.assignedUprId;
    } else if ((appUser.role === 'admin' || appUser.role === 'auditor') && !appUser.uprId) {
        console.warn(`[AppLayout] Admin/Auditor user ${currentUser.uid} does not have a default UPR. Store data fetch may be limited or require UPR selection UI.`);
        uprIdForDataFetch = null;
    }

    if (uprIdForDataFetch && appUser.activePeriod && currentUser.uid) {
       console.log(`[AppLayout] Triggering global data fetch for UPR ID: ${uprIdForDataFetch}, Period: ${appUser.activePeriod}, Actual User: ${currentUser.uid}`);
       triggerGlobalDataFetchForStore(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
    } else if (!uprIdForDataFetch && (appUser.role === 'admin' || appUser.role === 'auditor')) {
       console.log(`[AppLayout] Admin/Auditor - Global data fetch depends on UPR selection UI (not yet implemented).`);
    } else {
       console.warn("[AppLayout] Conditions for global data fetch not fully met. User Data:", appUser);
    }

  }, [currentUser, appUser, authContextLoading, profileLoading, isProfileComplete, router, pathname, resetStoreData, storeDataFetchedForUprPeriod]);


  let loaderMessage = "Mengarahkan atau memuat data...";
  if (authContextLoading) {
    loaderMessage = "Memverifikasi sesi...";
  } else if (currentUser && profileLoading) {
    loaderMessage = "Memuat profil pengguna...";
  }

  const mainLoaderVisible = authContextLoading || (currentUser && profileLoading && pathname !== '/profile-setup' && !publicPaths.includes(pathname));
  
  if (mainLoaderVisible) {
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">{loaderMessage}</p>
        <Toaster />
      </div>
    );
  }
  
  const publicPaths = ['/login', '/register'];
  const setupPath = '/profile-setup';
  
  // Conditions for rendering children vs. a fallback loader / handling redirects that weren't caught by useEffect
  // This logic ensures that if useEffect hasn't redirected and we're past initial loading,
  // we check if it's appropriate to render children.
  const shouldRenderChildren = 
    (currentUser && isProfileComplete && !publicPaths.includes(pathname) && pathname !== setupPath) ||
    (currentUser && !isProfileComplete && pathname === setupPath && !authContextLoading && !profileLoading) || // Key addition: allow rendering setup page
    (publicPaths.includes(pathname) && !currentUser); // Allow public pages if no user

  if (!shouldRenderChildren && !authContextLoading) {
    // This loader acts as a fallback if useEffect hasn't redirected and children shouldn't be rendered.
    // This scenario should be rare if useEffect logic is correct.
    // Example: User is on "/" but profile is incomplete -> useEffect should redirect to "/profile-setup". If it hasn't yet, this loader shows.
    // Or user on "/login" but currentUser exists -> useEffect should redirect to "/".
    console.log("[AppLayout] Fallback Loader: Conditions for rendering children not met. States:", { currentUser:!!currentUser, isProfileComplete, pathname, authContextLoading, profileLoading});
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-xl text-muted-foreground">Mengarahkan atau memproses...</p>
            <Toaster />
        </div>
    );
  }

  if (publicPaths.includes(pathname) && !currentUser) {
     return <>{children}<Toaster /></>;
  }
  if (pathname === setupPath && currentUser && !isProfileComplete && !authContextLoading && !profileLoading) {
    return <>{children}<Toaster /></>;
  }


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
