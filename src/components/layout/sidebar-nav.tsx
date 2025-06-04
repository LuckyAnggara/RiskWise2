
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
  auditorOnly?: boolean; // Diganti dari auditorOnly ke isAuditorFeature
  isAuditorFeature?: boolean; // Untuk membedakan menu khusus auditor vs menu umum yang bisa diakses auditor
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
    { label: "Reviu & Evaluasi Risiko", href: "/reviu/pilih-konteks", icon: SearchCheck, isAuditorFeature: true}, // Diubah dari auditorOnly
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
    // Untuk path yang lebih dalam, kita perlu memastikan startsWith cocok
    if (["/risk-document", "/comparative-monitoring", "/admin", "/reviu"].some(p => navHref.startsWith(p))) {
        return pathname.startsWith(navHref);
    }
    if (navHref === "/all-risks") { // Khusus untuk all-risks dan sub-path manage-nya
        return pathname === navHref || pathname.startsWith(navHref + "/manage");
    }
    return pathname.startsWith(navHref);
  };

  const renderNavItem = (item: NavItem) => {
    let isDisabled = false;
    let tooltipText = item.label;

    if (item.adminOnly && !isAdmin) {
      return null; // Admin menu only for admins
    }
    
    if (item.isAuditorFeature && !isAuditor) {
      return null; // Auditor feature only for auditors
    }

    // Non-admin, non-auditor feature, non-always-enabled menus are disabled if UPR not assigned
    if (!item.alwaysEnabled && !item.adminOnly && !item.isAuditorFeature && !isUprAssigned) {
        isDisabled = true;
        tooltipText = "Lengkapi assignment UPR di Pengaturan untuk mengakses menu ini.";
    }
    
    // Jika ini adalah menu khusus auditor, dan pengguna bukan auditor, jangan tampilkan.
    // Jika ini BUKAN menu khusus auditor, TAPI pengguna adalah auditor DAN UPR-nya BELUM di-assign (untuk peran userSatker),
    // maka menu userSatker standar akan di-disable.
    // Namun, menu "Reviu & Evaluasi Risiko" (isAuditorFeature) harus selalu enable untuk auditor.
    if (!item.isAuditorFeature && isAuditor && !isUprAssigned && !item.alwaysEnabled && !item.adminOnly) {
        // This specific condition handles if an auditor also has userSatker capabilities
        // but their UPR for userSatker role is not yet assigned.
        // However, their "Reviu & Evaluasi Risiko" menu should remain enabled.
        // So, if it's NOT an auditor feature, then disable.
        isDisabled = true;
        tooltipText = "UPR untuk peran standar Anda belum di-assign.";
    }


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
        {navItems.filter(item => !item.adminOnly && !item.isAuditorFeature).map(renderNavItem)}
      </SidebarGroup>
      
      {isAuditor && (
        <SidebarGroup>
          <SidebarGroupLabel>Reviu & Evaluasi</SidebarGroupLabel>
          {navItems.filter(item => item.isAuditorFeature).map(renderNavItem)}
        </SidebarGroup>
      )}

      {isAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel>Menu Admin</SidebarGroupLabel>
          {adminNavItems.map(renderNavItem)}
        </SidebarGroup>
      )}
    </SidebarMenu>
  );
}
    
