
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label'; // Import Label
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getAllUprs } from '@/services/uprService';
import type { UPR } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const REVIEWED_UPR_ID_KEY = 'riskwise_reviewed_upr_id';
const REVIEWED_UPR_NAME_KEY = 'riskwise_reviewed_upr_name';
const REVIEWED_PERIOD_KEY = 'riskwise_reviewed_period';

export default function PilihKonteksReviuPage() {
  const router = useRouter();
  const { appUser } = useAuth(); // Peran 'auditor' sudah diperiksa oleh layout
  const { toast } = useToast();

  const [allUprs, setAllUprs] = useState<UPR[]>([]);
  const [selectedUprId, setSelectedUprId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [isLoadingUprs, setIsLoadingUprs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availablePeriodsForUser = useMemo(() => appUser?.availablePeriods || [], [appUser]);

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

  useEffect(() => {
    // Set default selected period to user's active period if available and no period is selected yet
    if (appUser?.activePeriod && availablePeriodsForUser.includes(appUser.activePeriod) && !selectedPeriod) {
      setSelectedPeriod(appUser.activePeriod);
    } else if (availablePeriodsForUser.length > 0 && !selectedPeriod) {
      setSelectedPeriod(availablePeriodsForUser[0]); // Default to first available period if activePeriod not in list
    }
  }, [appUser, availablePeriodsForUser, selectedPeriod]);

  const handleStartReview = () => {
    if (!selectedUprId) {
      toast({ title: "UPR Belum Dipilih", description: "Silakan pilih UPR yang akan direviu.", variant: "warning" });
      return;
    }
    if (!selectedPeriod) {
      toast({ title: "Periode Belum Dipilih", description: "Silakan pilih periode yang akan direviu.", variant: "warning" });
      return;
    }
    setIsSubmitting(true);
    const selectedUprDetail = allUprs.find(upr => upr.id === selectedUprId);
    if (selectedUprDetail) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(REVIEWED_UPR_ID_KEY, selectedUprDetail.id);
        localStorage.setItem(REVIEWED_UPR_NAME_KEY, selectedUprDetail.name);
        localStorage.setItem(REVIEWED_PERIOD_KEY, selectedPeriod);
      }
      router.push('/reviu/data-risiko');
    } else {
      toast({ title: "Error", description: "Detail UPR yang dipilih tidak ditemukan.", variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  const reviewerDisplayName = useMemo(() => appUser?.displayName || "Auditor/Reviu Internal", [appUser]);
  const currentAppActivePeriod = useMemo(() => appUser?.activePeriod || "N/A", [appUser]);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilih Konteks untuk Reviu & Evaluasi Risiko"
        description={`Reviu Internal: ${reviewerDisplayName}, Periode Aplikasi Aktif: ${currentAppActivePeriod}`}
      />
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Pilih UPR dan Periode</CardTitle>
          <CardDescription>Pilih UPR dan periode dari daftar untuk memulai proses reviu/evaluasi dan melihat data risikonya.</CardDescription>
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
            <>
              <div className="space-y-1.5">
                <Label htmlFor="selectUprForReview">Unit Pemilik Risiko (UPR)</Label>
                <Select 
                  value={selectedUprId || ""} 
                  onValueChange={setSelectedUprId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="selectUprForReview">
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
              <div className="space-y-1.5">
                <Label htmlFor="selectPeriodForReview">Periode Reviu</Label>
                <Select 
                  value={selectedPeriod || ""} 
                  onValueChange={setSelectedPeriod}
                  disabled={isSubmitting || availablePeriodsForUser.length === 0}
                >
                  <SelectTrigger id="selectPeriodForReview">
                    <SelectValue placeholder="Pilih periode..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeriodsForUser.length > 0 ? (
                      availablePeriodsForUser.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-periods" disabled>Periode tidak tersedia.</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <Button 
            onClick={handleStartReview} 
            disabled={!selectedUprId || !selectedPeriod || isLoadingUprs || isSubmitting} 
            className="w-full"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Mulai Reviu Konteks Ini
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
    
