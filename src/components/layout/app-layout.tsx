
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
  const { currentUser, appUser, loading, isProfileComplete, refreshAppUser } = useAuth();
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
    console.log("[AppLayout] useEffect triggered. Loading:", loading, "CurrentUser:", !!currentUser, "AppUser:", !!appUser, "isProfileComplete:", isProfileComplete, "Pathname:", pathname);
    const publicPaths = ['/login', '/register'];
    const setupPath = '/profile-setup';
    
    if (!loading) { 
      if (currentUser && appUser) {
        // For actualUserId, we will use currentUser.uid as the actual authenticated user.
        // For uprId context for data fetching, we use appUser.uprId for userSatker,
        // and for admin/auditor, it could be a selected UPR or null (to fetch all, needs store/service changes).
        // For now, if admin/auditor, uprId for data fetching will be based on their own 'uprId' which is like their personal space/identifier.
        const uprIdForDataFetch = (appUser.role === 'userSatker' && appUser.assignedUprId) ? appUser.assignedUprId : appUser.uprId;

        if (isProfileComplete && uprIdForDataFetch && appUser.activePeriod && currentUser.uid) {
          console.log(`[AppLayout] Profile complete. Calling triggerGlobalDataFetchForStore with UPR ID: ${uprIdForDataFetch}, Period: ${appUser.activePeriod}, User UID (actual): ${currentUser.uid}`);
          triggerGlobalDataFetchForStore(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
        } else if (!isProfileComplete && pathname !== setupPath) {
          console.log("[AppLayout] Profile incomplete, redirecting to /profile-setup from", pathname);
          router.push(setupPath);
        }
        
        if (publicPaths.includes(pathname)) {
          console.log("[AppLayout] User logged in and on public path, redirecting to /");
          router.push('/');
        }

      } else if (!currentUser) { 
        if (!publicPaths.includes(pathname) && pathname !== setupPath) { 
          console.log("[AppLayout] User not logged in and not on public/setup path, redirecting to /login from", pathname);
          router.push('/login');
        }
        // Reset store only if it was previously populated (not null)
        const currentStoreContext = useAppStore.getState().dataFetchedForUprPeriod;
        if (currentStoreContext !== null) {
             console.log("[AppLayout] User logged out or no user. Resetting Zustand store.");
             resetStoreData();
        }
      }
    }
  }, [currentUser, appUser, loading, isProfileComplete, router, pathname, resetStoreData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Keluar Berhasil', description: 'Anda telah berhasil keluar.' });
      // resetStoreData(); // Moved to useEffect to ensure it happens after user becomes null
      router.push('/login'); 
    } catch (error) {
      console.error("Error logging out:", error);
      toast({ title: 'Gagal Keluar', description: 'Terjadi kesalahan saat keluar.', variant: 'destructive' });
    }
  };

  // More granular loading check for initial render
  if (loading && !currentUser) { // If auth is still loading and no user yet, show main loader
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

  // If user is not logged in and not on a public/setup page, delay rendering until redirect happens.
  if (!currentUser && !isPublicPage && !isSetupPage) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mengarahkan...</p>
        <Toaster />
      </div>
    );
  }
  
  // If user is logged in, but appUser is still loading (profile data fetch in progress), show loader.
  // Also, if profile is incomplete and not on setup page, show loader (redirect is pending).
  if (currentUser && (!appUser || (!isProfileComplete && !isSetupPage))) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat profil pengguna atau mengarahkan...</p>
        <Toaster />
      </div>
    );
  }

  // If on public page, render only children (login/register forms)
  if (isPublicPage) {
    return <>{children}<Toaster /></>;
  }
  
  // If on setup page and profile is not complete, render children (setup form)
  if (isSetupPage && currentUser && !isProfileComplete) {
     return <>{children}<Toaster /></>;
  }
  
  // If we reach here, user is logged in, profile is complete (or being handled by setup page), so render full layout
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
          {currentUser && !isProfileComplete && pathname !== '/profile-setup' && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Profil Belum Lengkap!</AlertTitle>
              <AlertDescription>
                Konfigurasi profil Anda belum lengkap. 
                {appUser?.role === 'userSatker' && !appUser?.assignedUprId && ' Anda juga perlu menunggu penetapan UPR oleh Admin. '}
                Harap lengkapi di halaman 
                <NextLink href="/profile-setup" className="font-semibold underline hover:text-destructive-foreground/80 ml-1">
                  Pengaturan Profil
                </NextLink>
                {' '}untuk dapat menggunakan fitur lain.
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
