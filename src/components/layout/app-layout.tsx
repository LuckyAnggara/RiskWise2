
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
// Placeholder for a UPR service - this would be created in a subsequent step
// import { getUprById } from '@/services/uprService'; 

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

  const [activeUprName, setActiveUprName] = useState<string | null>(null);


  useEffect(() => {
    console.log("[AppLayout] useEffect triggered. Loading:", loading, "CurrentUser:", !!currentUser, "AppUser:", !!appUser, "isProfileComplete:", isProfileComplete, "Pathname:", pathname);
    const publicPaths = ['/login', '/register'];
    const setupPath = '/profile-setup'; // Changed from settingsPath
    
    if (!loading) { 
      if (currentUser && appUser) { // currentUser and appUser must exist
        // Trigger global data fetch if context is ready and profile is complete
        if (isProfileComplete && appUser.assignedUprId && appUser.activePeriod) {
          console.log(`[AppLayout] Profile complete. Calling triggerGlobalDataFetchForStore with UPR ID: ${appUser.assignedUprId}, Period: ${appUser.activePeriod}, User UID: ${currentUser.uid}`);
          triggerGlobalDataFetchForStore(appUser.assignedUprId, appUser.activePeriod, currentUser.uid);
          
          // Placeholder for fetching UPR name - replace with actual service call
          // For now, use assignedUprId or displayName if UPR name isn't fetched
          if (appUser.role === 'userSatker' && appUser.assignedUprId) {
            // async function fetchUprName() {
            //   try {
            //     const uprDoc = await getUprById(appUser.assignedUprId); // Assuming getUprById exists
            //     if (uprDoc) setActiveUprName(uprDoc.name);
            //     else setActiveUprName(appUser.assignedUprId); // Fallback to ID
            //   } catch { setActiveUprName(appUser.assignedUprId); }
            // }
            // fetchUprName();
            setActiveUprName(appUser.displayName || appUser.assignedUprId); // Temporary: use displayName or ID
          } else if (appUser.role === 'admin' || appUser.role === 'auditor') {
            setActiveUprName("Admin/Auditor View"); // Or some other indicator
          }

        } else if (!isProfileComplete && pathname !== setupPath) {
          console.log("[AppLayout] Profile incomplete, redirecting to /profile-setup from", pathname);
          router.push(setupPath);
        }
        
        if (publicPaths.includes(pathname)) {
          console.log("[AppLayout] User logged in and on public path, redirecting to /");
          router.push('/');
        }

      } else if (!currentUser) { // User not logged in
        if (!publicPaths.includes(pathname) && pathname !== setupPath) { // Allow access to setup if somehow landed there pre-auth
          console.log("[AppLayout] User not logged in and not on public/setup path, redirecting to /login from", pathname);
          router.push('/login');
        }
        if (storeDataFetchedForUprPeriod !== null) {
             console.log("[AppLayout] User logged out. Resetting Zustand store.");
             resetStoreData();
        }
      }
    }
  }, [currentUser, appUser, loading, isProfileComplete, router, pathname, storeDataFetchedForUprPeriod, resetStoreData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Keluar Berhasil', description: 'Anda telah berhasil keluar.' });
      router.push('/login'); // This will trigger resetStoreData via the useEffect above
    } catch (error) {
      console.error("Error logging out:", error);
      toast({ title: 'Gagal Keluar', description: 'Terjadi kesalahan saat keluar.', variant: 'destructive' });
    }
  };

  if (loading) {
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memverifikasi sesi & profil...</p>
        <Toaster />
      </div>
    );
  }

  const isPublicPage = ['/login', '/register'].includes(pathname);
  const isSetupPage = pathname === '/profile-setup';

  if (isPublicPage && !currentUser) {
    return <>{children}<Toaster /></>;
  }
  
  // If user is logged in but profile is not complete, AND they are not on the setup page,
  // they might be briefly shown before redirect. The useEffect will handle redirect.
  // If they ARE on the setup page, let it render.
  if (currentUser && !isProfileComplete && isSetupPage) {
     return <>{children}<Toaster /></>;
  }


  // This check is to prevent rendering the main layout if redirects are pending
  if (!currentUser && !isPublicPage && !isSetupPage) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mengarahkan ke halaman login...</p>
        <Toaster />
      </div>
    );
  }
  if (currentUser && !isProfileComplete && !isSetupPage) {
      return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mengarahkan ke pengaturan profil...</p>
        <Toaster />
      </div>
    );
  }
  
  // If currentUser exists but appUser is still null (profile is loading post-auth), show a loader
  if (currentUser && !appUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data profil pengguna...</p>
        <Toaster />
      </div>
    );
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
            {appUser && isProfileComplete && (
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold">UPR:</span> {activeUprName || appUser.displayName || DEFAULT_FALLBACK_UPR_ID} | <span className="font-semibold">Periode:</span> {appUser.activePeriod || DEFAULT_PERIOD}
              </div>
            )}
             {appUser && !isProfileComplete && (
              <div className="text-sm text-destructive">
                Profil belum lengkap.
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
          {currentUser && !isProfileComplete && pathname !== '/profile-setup' && ( // Show alert if profile incomplete and not on setup page
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Profil Belum Lengkap!</AlertTitle>
              <AlertDescription>
                Konfigurasi UPR dan Periode awal Anda belum diatur. Harap lengkapi di halaman 
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
