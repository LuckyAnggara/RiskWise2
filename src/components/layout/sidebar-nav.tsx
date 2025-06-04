
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
  isAuditorFeature?: boolean; 
}

export function SidebarNav() {
  const pathname = usePathname(); 
  const { openMobile, setOpenMobile } = useSidebar();
  const { isUprAssigned, isAdmin, appUser } = useAuth();
  const isAuditor = appUser?.role === 'auditor';

  const mainNavDefinition: NavItem[] = [
    { label: "Dasbor", href: "/", icon: LayoutDashboard },
    { label: "Sasaran", href: "/goals", icon: Target },
    { label: "Identifikasi Risiko", href: "/all-risks", icon: FileText }, 
    { label: "Analisis Risiko", href: "/risk-analysis", icon: BarChart3 }, 
    { label: "Prioritas Risiko", href: "/risk-priority", icon: ShieldCheck },
    { label: "Pemantauan & Reviu", href: "/monitoring", icon: Activity },
    { label: "Analisis Komparatif", href: "/comparative-monitoring", icon: Columns },
    { label: "Laporan Dokumen Risiko", href: "/risk-document", icon: FileArchive },
    { label: "Reviu & Evaluasi Risiko", href: "/reviu/pilih-konteks", icon: SearchCheck, isAuditorFeature: true},
    { label: "Pengaturan", href: "/settings", icon: Cog, alwaysEnabled: true }, 
  ];

  const adminNavDefinition: NavItem[] = [
    { label: "Admin Dashboard", href: "/admin", icon: Shield, adminOnly: true },
    { label: "Manajemen UPR", href: "/admin/uprs", icon: Briefcase, adminOnly: true },
    { label: "Manajemen Pengguna", href: "/admin/users", icon: Users, adminOnly: true },
  ];
  
  const isActive = (navHref: string) => {
    if (navHref === "/") {
      return pathname === "/";
    }
    if (["/risk-document", "/comparative-monitoring", "/admin", "/reviu"].some(p => navHref.startsWith(p))) {
        return pathname.startsWith(navHref);
    }
    if (navHref === "/all-risks") { 
        return pathname === navHref || pathname.startsWith(navHref + "/manage");
    }
    return pathname.startsWith(navHref);
  };

  const renderNavItem = (item: NavItem, index: number) => {
    let isDisabled = false;
    let tooltipText = item.label;

    // This function assumes the list of items passed to it is already filtered for the current user type (auditor, admin, userSatker)
    
    if (isAuditor) {
        // For an auditor, their specific menu items (Reviu & Settings) are never disabled by UPR assignment.
        isDisabled = false; 
    } else { // For non-auditors (admin or userSatker)
        // Admin items are never disabled by UPR status.
        // `alwaysEnabled` items (like Settings) are never disabled.
        // Other items are disabled if UPR is not assigned.
        if (!item.adminOnly && !item.alwaysEnabled && !isUprAssigned) {
            isDisabled = true;
            tooltipText = "Lengkapi assignment UPR di Pengaturan untuk mengakses menu ini.";
        }
    }

    return (
      <SidebarMenuItem key={`${item.href}-${index}`}>
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
      {isAuditor ? (
        // AUDITOR VIEW
        <SidebarGroup>
          <SidebarGroupLabel>Menu Reviu</SidebarGroupLabel>
          {mainNavDefinition
            .filter(item => item.isAuditorFeature || item.alwaysEnabled) // Auditor only sees "Reviu & Evaluasi" and "Pengaturan"
            .map((item, index) => renderNavItem(item, index))}
        </SidebarGroup>
      ) : (
        // NON-AUDITOR VIEW (Admin or UserSatker)
        <>
          <SidebarGroup>
            <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
            {mainNavDefinition
              .filter(item => !item.isAuditorFeature && !item.adminOnly) // Exclude auditor-specific and admin-only items
              .map((item, index) => renderNavItem(item, index))}
          </SidebarGroup>
          
          {isAdmin && ( // Admin menus are only shown if user isAdmin AND not an auditor (auditor view is restrictive)
            <SidebarGroup>
              <SidebarGroupLabel>Menu Admin</SidebarGroupLabel>
              {adminNavDefinition.map((item, index) => renderNavItem(item, index + 100))} {/* Offset index for unique keys */}
            </SidebarGroup>
          )}
        </>
      )}
    </SidebarMenu>
  );
}
