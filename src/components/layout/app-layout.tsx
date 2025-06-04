
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
  const { currentUser, appUser, authContextLoading, profileLoading, isProfileComplete, refreshAppUser } = useAuth(); // Menggunakan authContextLoading
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
    console.log("[AppLayout] useEffect triggered. authContextLoading:", authContextLoading, "CurrentUser:", !!currentUser, "AppUser:", !!appUser, "isProfileComplete:", isProfileComplete, "Pathname:", pathname);
    const publicPaths = ['/login', '/register'];
    const setupPath = '/profile-setup';
    
    if (!authContextLoading) { // Hanya jalankan logika setelah status auth awal selesai dicek
      if (!currentUser) { // TIDAK ADA USER AKTIF
        if (!publicPaths.includes(pathname) && pathname !== setupPath) { 
          console.log("[AppLayout] No user session, redirecting to /login from", pathname);
          router.push('/login');
          return; // Hentikan eksekusi lebih lanjut dari useEffect ini
        }
        // Reset store jika pengguna tidak ada DAN store sebelumnya punya konteks
        if (useAppStore.getState().dataFetchedForUprPeriod !== null) {
           console.log("[AppLayout] User logged out or no user. Resetting Zustand store.");
           resetStoreData();
        }
      } else { // ADA USER AKTIF (currentUser is not null)
        if (appUser) { // appUser juga sudah termuat
            const uprIdForDataFetch = (appUser.role === 'userSatker' && appUser.assignedUprId) ? appUser.assignedUprId : appUser.uprId;

            if (isProfileComplete && uprIdForDataFetch && appUser.activePeriod && currentUser.uid) {
              console.log(`[AppLayout] Profile complete. Calling triggerGlobalDataFetchForStore with UPR ID: ${uprIdForDataFetch}, Period: ${appUser.activePeriod}, User UID (actual): ${currentUser.uid}`);
              triggerGlobalDataFetchForStore(uprIdForDataFetch, appUser.activePeriod, currentUser.uid);
            } else if (!isProfileComplete && pathname !== setupPath) {
              console.log("[AppLayout] Profile incomplete, redirecting to /profile-setup from", pathname);
              router.push(setupPath);
              return; // Hentikan eksekusi lebih lanjut
            }
            
            if (publicPaths.includes(pathname)) {
              console.log("[AppLayout] User logged in and on public path, redirecting to /");
              router.push('/');
              return; // Hentikan eksekusi lebih lanjut
            }
        } else if (!profileLoading) { // currentUser ada, tapi appUser masih null, dan profileLoading sudah false (artinya fetchAppUser gagal atau tidak ada doc)
            // Ini adalah kondisi di mana profil Firestore belum ada, arahkan ke setup
            if (pathname !== setupPath) {
                console.log("[AppLayout] User exists, but appUser (Firestore doc) is null and not loading. Redirecting to /profile-setup from", pathname);
                router.push(setupPath);
                return;
            }
        }
        // Jika appUser masih loading (profileLoading true), jangan lakukan apa-apa, tunggu sampai selesai.
      }
    }
  }, [currentUser, appUser, authContextLoading, profileLoading, isProfileComplete, router, pathname, resetStoreData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Keluar Berhasil', description: 'Anda telah berhasil keluar.' });
      // resetStoreData(); // Sudah dihandle di useEffect utama saat currentUser menjadi null
      router.push('/login'); 
    } catch (error) {
      console.error("Error logging out:", error);
      toast({ title: 'Gagal Keluar', description: 'Terjadi kesalahan saat keluar.', variant: 'destructive' });
    }
  };

  // Tampilan loading global utama jika authContextLoading true
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

  // Jika tidak ada user, dan berada di halaman yang memerlukan auth, tampilkan loading (akan diarahkan oleh useEffect)
  if (!currentUser && !isPublicPage && !isSetupPage) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mengarahkan...</p>
        <Toaster />
      </div>
    );
  }
  
  // Jika user ada, tapi profile Firestore (appUser) belum termuat atau belum lengkap dan bukan di setup page, tampilkan loading (akan diarahkan oleh useEffect)
  if (currentUser && (!appUser || (!isProfileComplete && !isSetupPage))) {
    // Pengecualian jika appUser memang null karena user baru dan memang sedang di setup page
    if(appUser === null && isSetupPage) {
        // Lanjutkan render setup page
    } else {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-xl text-muted-foreground">Memuat profil pengguna atau mengarahkan...</p>
                <Toaster />
            </div>
        );
    }
  }

  // Render halaman publik atau setup tanpa layout utama
  if (isPublicPage || (isSetupPage && currentUser && !isProfileComplete)) {
    return <>{children}<Toaster /></>;
  }
  
  // Jika semua kondisi terpenuhi (user ada, profile lengkap, bukan halaman publik/setup), render layout utama
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
