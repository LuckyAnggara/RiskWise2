
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getAllUprs } from '@/services/uprService';
import type { UPR } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const AUDITED_UPR_ID_KEY = 'riskwise_audited_upr_id';
const AUDITED_UPR_NAME_KEY = 'riskwise_audited_upr_name';

export default function SelectUprForAuditPage() {
  const router = useRouter();
  const { appUser } = useAuth(); // Auditor role is already checked by layout
  const { toast } = useToast();

  const [allUprs, setAllUprs] = useState<UPR[]>([]);
  const [selectedUprId, setSelectedUprId] = useState<string | null>(null);
  const [isLoadingUprs, setIsLoadingUprs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchAllUprsData() {
      setIsLoadingUprs(true);
      try {
        const uprsFromService = await getAllUprs();
        setAllUprs(uprsFromService.sort((a,b) => a.code.localeCompare(b.code)));
      } catch (error: any) {
        toast({ title: "Gagal Memuat Daftar UPR", description: error.message, variant: "destructive" });
      } finally {
        setIsLoadingUprs(false);
      }
    }
    fetchAllUprsData();
  }, [toast]);

  const handleStartAudit = () => {
    if (!selectedUprId) {
      toast({ title: "UPR Belum Dipilih", description: "Silakan pilih UPR yang akan diaudit.", variant: "warning" });
      return;
    }
    setIsSubmitting(true);
    const selectedUprDetail = allUprs.find(upr => upr.id === selectedUprId);
    if (selectedUprDetail) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUDITED_UPR_ID_KEY, selectedUprDetail.id);
        localStorage.setItem(AUDITED_UPR_NAME_KEY, selectedUprDetail.name);
      }
      router.push('/audit/view-upr-risks');
    } else {
      toast({ title: "Error", description: "Detail UPR yang dipilih tidak ditemukan.", variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  const uprDisplayName = useMemo(() => appUser?.displayName || "Auditor", [appUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || "N/A", [appUser]);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilih Unit Pemilik Risiko (UPR) untuk Diaudit"
        description={`Auditor: ${uprDisplayName}, Periode Aplikasi Aktif: ${currentPeriod}`}
      />
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Pilih UPR</CardTitle>
          <CardDescription>Pilih UPR dari daftar untuk memulai proses audit dan melihat data risikonya.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingUprs ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Memuat daftar UPR...</p>
            </div>
          ) : allUprs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">Tidak ada UPR yang terdaftar di sistem.</p>
          ) : (
            <div className="space-y-1.5">
              <Select 
                value={selectedUprId || ""} 
                onValueChange={setSelectedUprId}
                disabled={isSubmitting}
              >
                <SelectTrigger id="selectUprForAudit">
                  <SelectValue placeholder="Pilih UPR..." />
                </SelectTrigger>
                <SelectContent>
                  {allUprs.map(upr => (
                    <SelectItem key={upr.id} value={upr.id}>
                      {upr.code} - {upr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button 
            onClick={handleStartAudit} 
            disabled={!selectedUprId || isLoadingUprs || isSubmitting} 
            className="w-full"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Mulai Audit UPR Ini
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
    