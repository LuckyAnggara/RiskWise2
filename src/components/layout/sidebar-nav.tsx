
"use client";

import Link from 'next/link'; 
import { usePathname } from "next/navigation"; 
import { LayoutDashboard, Target, ListChecks, Cog, BarChart3, Edit, ShieldCheck, FileText, Activity, Columns, FileArchive } from "lucide-react"; 
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  label: string; 
  href: string; 
  icon: React.ElementType;
  alwaysEnabled?: boolean; // New prop
}

export function SidebarNav({ profileIncomplete }: { profileIncomplete?: boolean }) {
  const pathname = usePathname(); 
  const { openMobile, setOpenMobile } = useSidebar();
  
  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Sasaran", href: "/goals", icon: Target },
    { label: "Identifikasi Risiko", href: "/all-risks", icon: FileText }, 
    { label: "Analisis Risiko", href: "/risk-analysis", icon: BarChart3 }, 
    { label: "Prioritas Risiko", href: "/risk-priority", icon: ShieldCheck },
    { label: "Pemantauan & Reviu", href: "/monitoring", icon: Activity },
    { label: "Analisis Komparatif", href: "/comparative-monitoring", icon: Columns },
    { label: "Laporan Dokumen Risiko", href: "/risk-document", icon: FileArchive },
    { label: "Pengaturan", href: "/settings", icon: Cog, alwaysEnabled: true }, // Settings always enabled
  ];
  
  const isActive = (navHref: string) => {
    if (navHref === "/") {
      return pathname === "/";
    }
    if (navHref === "/risk-document") {
        return pathname === navHref || pathname.startsWith(navHref + "/");
    }
    return pathname.startsWith(navHref);
  };

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Menu</SidebarGroupLabel>
        {navItems.map((item) => {
          const isDisabled = profileIncomplete && !item.alwaysEnabled;
          return (
            <SidebarMenuItem key={item.href}>
              <Link href={isDisabled ? "#" : item.href} passHref legacyBehavior={isDisabled ? undefined : false}>
                <SidebarMenuButton
                  as={isDisabled ? "button" : "a"}
                  isActive={!isDisabled && isActive(item.href)}
                  onClick={() => {
                    if (openMobile && !isDisabled) setOpenMobile(false);
                    if (isDisabled) {
                      // console.log(`Menu ${item.label} dinonaktifkan karena profil belum lengkap.`);
                    }
                  }}
                  disabled={isDisabled}
                  className={cn(isDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-sidebar-foreground")}
                  aria-disabled={isDisabled}
                  tabIndex={isDisabled ? -1 : undefined}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          );
        })}
      </SidebarGroup>
    </SidebarMenu>
  );
}

    