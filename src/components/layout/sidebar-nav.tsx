
"use client";

import Link from 'next/link'; 
import { usePathname } from "next/navigation"; 
import { LayoutDashboard, Target, ListChecks, Cog, BarChart3, ShieldCheck, FileText, Activity, Columns, FileArchive, Users, Briefcase, Shield, SearchCheck } from "lucide-react"; 
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from '@/contexts/auth-context';

interface NavItem {
  label: string; 
  href: string; 
  icon: React.ElementType;
  alwaysEnabled?: boolean; 
  adminOnly?: boolean;
  auditorOnly?: boolean;
}

export function SidebarNav() {
  const pathname = usePathname(); 
  const { openMobile, setOpenMobile } = useSidebar();
  const { isUprAssigned, isAdmin, appUser } = useAuth();
  const isAuditor = appUser?.role === 'auditor';

  const navItems: NavItem[] = [
    { label: "Dasbor", href: "/", icon: LayoutDashboard },
    { label: "Sasaran", href: "/goals", icon: Target },
    { label: "Identifikasi Risiko", href: "/all-risks", icon: FileText }, 
    { label: "Analisis Risiko", href: "/risk-analysis", icon: BarChart3 }, 
    { label: "Prioritas Risiko", href: "/risk-priority", icon: ShieldCheck },
    { label: "Pemantauan & Reviu", href: "/monitoring", icon: Activity },
    { label: "Analisis Komparatif", href: "/comparative-monitoring", icon: Columns },
    { label: "Laporan Dokumen Risiko", href: "/risk-document", icon: FileArchive },
    { label: "Audit UPR", href: "/audit/select-upr", icon: SearchCheck, auditorOnly: true},
    { label: "Pengaturan", href: "/settings", icon: Cog, alwaysEnabled: true }, 
  ];

  const adminNavItems: NavItem[] = [
    { label: "Admin Dashboard", href: "/admin", icon: Shield, adminOnly: true },
    { label: "Manajemen UPR", href: "/admin/uprs", icon: Briefcase, adminOnly: true },
    { label: "Manajemen Pengguna", href: "/admin/users", icon: Users, adminOnly: true },
  ];
  
  const isActive = (navHref: string) => {
    if (navHref === "/") {
      return pathname === "/";
    }
    if (["/risk-document", "/comparative-monitoring", "/admin", "/audit"].some(p => navHref.startsWith(p))) {
        return pathname.startsWith(navHref);
    }
    if (navHref === "/all-risks") {
        return pathname === navHref || pathname.startsWith(navHref + "/manage");
    }
    return pathname.startsWith(navHref);
  };

  const renderNavItem = (item: NavItem) => {
    let isDisabled = false;
    let tooltipText = item.label;

    if (item.adminOnly && !isAdmin) {
        isDisabled = true;
        tooltipText = "Menu ini hanya untuk Administrator.";
    } else if (item.auditorOnly && !isAuditor) {
        isDisabled = true; // Sembunyikan saja jika tidak relevan, atau disable jika ingin tetap terlihat
        return null; // Atau styling disabled
    } else if (!item.alwaysEnabled && !item.adminOnly && !item.auditorOnly && !isUprAssigned) {
        // Untuk menu User Satker standar, disable jika UPR belum di-assign dan bukan admin
        isDisabled = true;
        tooltipText = "Lengkapi assignment UPR di Pengaturan untuk mengakses menu ini.";
    }
    
    if (item.auditorOnly && !isAuditor) return null; // Sembunyikan menu audit jika bukan auditor

    return (
      <SidebarMenuItem key={item.href}>
        <Link href={isDisabled ? "#" : item.href} passHref legacyBehavior={isDisabled ? undefined : false}>
          <SidebarMenuButton
            as={isDisabled ? "button" : "a"}
            isActive={!isDisabled && isActive(item.href)}
            onClick={() => {
              if (openMobile && !isDisabled) setOpenMobile(false);
            }}
            disabled={isDisabled}
            className={cn(isDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-sidebar-foreground")}
            aria-disabled={isDisabled}
            tabIndex={isDisabled ? -1 : undefined}
            tooltip={tooltipText}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
        {navItems.filter(item => !item.adminOnly).map(renderNavItem)}
      </SidebarGroup>
      {isAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel>Menu Admin</SidebarGroupLabel>
          {adminNavItems.map(renderNavItem)}
        </SidebarGroup>
      )}
    </SidebarMenu>
  );
}
    