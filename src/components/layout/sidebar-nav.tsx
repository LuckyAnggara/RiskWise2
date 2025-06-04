
"use client";

import Link from 'next/link'; 
import { usePathname } from "next/navigation"; 
import { LayoutDashboard, Target, ListChecks, Cog, BarChart3, ShieldCheck, FileText, Activity, Columns, FileArchive, Users, Briefcase, Shield, SearchCheck, UserCog } from "lucide-react"; 
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
  // isAuditorFeature?: boolean; // No longer needed with separate nav definitions
}

const userSatkerNavDefinition: NavItem[] = [
  { label: "Dasbor", href: "/", icon: LayoutDashboard },
  { label: "Sasaran", href: "/goals", icon: Target },
  { label: "Identifikasi Risiko", href: "/all-risks", icon: FileText }, 
  { label: "Analisis Risiko", href: "/risk-analysis", icon: BarChart3 }, 
  { label: "Prioritas Risiko", href: "/risk-priority", icon: ShieldCheck },
  { label: "Pemantauan & Reviu", href: "/monitoring", icon: Activity },
  { label: "Analisis Komparatif", href: "/comparative-monitoring", icon: Columns },
  { label: "Laporan Dokumen Risiko", href: "/risk-document", icon: FileArchive },
  { label: "Pengaturan", href: "/settings", icon: Cog, alwaysEnabled: true }, 
];

const auditorNavDefinition: NavItem[] = [
    { label: "Dasbor Auditor", href: "/auditor", icon: LayoutDashboard },
    { label: "Reviu & Evaluasi Risiko", href: "/reviu/pilih-konteks", icon: SearchCheck },
    { label: "Pengaturan Auditor", href: "/auditor/settings", icon: UserCog }, // Using UserCog for Auditor Settings
];

const adminNavDefinition: NavItem[] = [
  { label: "Admin Dashboard", href: "/admin", icon: Shield, adminOnly: true },
  { label: "Manajemen UPR", href: "/admin/uprs", icon: Briefcase, adminOnly: true },
  { label: "Manajemen Pengguna", href: "/admin/users", icon: Users, adminOnly: true },
];
  
export function SidebarNav() {
  const pathname = usePathname(); 
  const { openMobile, setOpenMobile } = useSidebar();
  const { isUprAssigned, isAdmin, appUser } = useAuth();
  const isAuditor = appUser?.role === 'auditor';

  const isActive = (navHref: string) => {
    if (navHref === "/") return pathname === "/";
    if (navHref === "/auditor") return pathname === "/auditor" || pathname.startsWith("/auditor/");
    if (navHref === "/reviu/pilih-konteks") return pathname.startsWith("/reviu"); // Matches /reviu and its sub-paths
    if (navHref === "/admin") return pathname.startsWith("/admin");
     if (navHref === "/all-risks") { 
        return pathname === navHref || pathname.startsWith(navHref + "/manage");
    }
    return pathname.startsWith(navHref);
  };

  const renderNavItem = (item: NavItem, index: number) => {
    let isDisabled = false;
    let tooltipText = item.label;
    
    // Auditors have all their defined menu items enabled.
    // Admins have all their defined menu items enabled.
    // userSatker items (except 'alwaysEnabled') are disabled if UPR is not assigned.
    if (!isAuditor && !item.adminOnly && !item.alwaysEnabled && !isUprAssigned) {
        isDisabled = true;
        tooltipText = "Lengkapi assignment UPR di Pengaturan untuk mengakses menu ini.";
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

  if (isAuditor) {
    return (
      <SidebarMenu>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Auditor</SidebarGroupLabel>
          {auditorNavDefinition.map((item, index) => renderNavItem(item, index))}
        </SidebarGroup>
      </SidebarMenu>
    );
  }

  // For Admin or UserSatker
  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
        {userSatkerNavDefinition.map((item, index) => renderNavItem(item, index))}
      </SidebarGroup>
      
      {isAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel>Menu Admin</SidebarGroupLabel>
          {adminNavDefinition.map((item, index) => renderNavItem(item, index + 100))}
        </SidebarGroup>
      )}
    </SidebarMenu>
  );
}
