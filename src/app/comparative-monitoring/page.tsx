
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Columns, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import type { MonitoringSession } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function ComparativeMonitoringSelectionPage() {
  const router = useRouter();
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  const { toast } = useToast();
  
  const { 
    monitoringSessions, 
    monitoringSessionsLoading,
    fetchMonitoringSessions,
  } = useAppStore();

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || "UPR Pengguna", [appUser]);

  useEffect(() => {
    if (!authLoading && currentUser && isProfileComplete && currentUserId && currentPeriod) {
      // Fetch sessions if not already loaded or loading for the current context
      if (useAppStore.getState().dataFetchedForPeriod !== `${currentUserId}|${currentPeriod}` || monitoringSessions.length === 0 && !monitoringSessionsLoading) {
        // Check if data for this context has been fetched by triggerGlobalDataFetch
        // If not, or if sessions specifically are empty, fetch them
        // This assumes triggerGlobalDataFetch might not always populate sessions if there were prior errors or specific conditions
        console.log(`[CompMonPage] Fetching monitoring sessions for ${currentUserId}/${currentPeriod} as they are not loaded.`);
        fetchMonitoringSessions(currentUserId, currentPeriod);
      }
    } else if (!authLoading && (!currentUser || !isProfileComplete)) {
      router.push(currentUser ? '/settings' : '/login');
    }
  }, [authLoading, currentUser, isProfileComplete, currentUserId, currentPeriod, router, fetchMonitoringSessions, monitoringSessions.length, monitoringSessionsLoading]);

  const completedSessions = useMemo(() => {
    return monitoringSessions.filter(session => session.status === 'Selesai' && session.userId === currentUserId && session.period === currentPeriod)
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  }, [monitoringSessions, currentUserId, currentPeriod]);

  const handleSessionToggle = (sessionId: string) => {
    setSelectedSessionIds(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        if (prev.length < 4) {
          return [...prev, sessionId];
        } else {
          toast({
            title: "Batas Maksimum Tercapai",
            description: "Anda hanya dapat memilih maksimal 4 sesi pemantauan.",
            variant: "warning",
          });
          return prev;
        }
      }
    });
  };

  const handleGenerateAnalysis = () => {
    if (selectedSessionIds.length < 2 || selectedSessionIds.length > 4) {
      toast({
        title: "Jumlah Sesi Tidak Sesuai",
        description: "Harap pilih antara 2 hingga 4 sesi pemantauan untuk dianalisis.",
        variant: "destructive",
      });
      return;
    }
    setIsProcessing(true);
    const queryParams = new URLSearchParams({
      sessionIds: selectedSessionIds.join(','),
    });
    router.push(`/comparative-monitoring/analysis?${queryParams.toString()}`);
    // setIsProcessing(false); // Should be handled by navigation or analysis page load
  };

  if (authLoading || monitoringSessionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data sesi pemantauan...</p>
      </div>
    );
  }
  
  if (!currentUser || !isProfileComplete) {
     return (
       <div className="text-center py-10">
        <p className="text-muted-foreground">Harap lengkapi profil Anda di Pengaturan untuk mengakses modul ini.</p>
        <Button onClick={() => router.push('/settings')} className="mt-4">Ke Pengaturan</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analisis Pemantauan Komparatif"
        description={`Pilih 2 hingga 4 sesi pemantauan yang telah selesai untuk dibandingkan. UPR: ${uprDisplayName}, Periode Aplikasi: ${currentPeriod || '...'}.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Pilih Sesi Pemantauan (Status: Selesai)</CardTitle>
          <CardDescription>Pilih minimal 2 dan maksimal 4 sesi untuk analisis komparatif.</CardDescription>
        </CardHeader>
        <CardContent>
          {completedSessions.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Tidak ada sesi pemantauan yang telah selesai ditemukan untuk periode ini.</p>
              <p className="text-sm text-muted-foreground">Selesaikan beberapa sesi pemantauan terlebih dahulu.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] border rounded-md p-4">
              <div className="space-y-3">
                {completedSessions.map(session => (
                  <div key={session.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`session-${session.id}`}
                      checked={selectedSessionIds.includes(session.id)}
                      onCheckedChange={() => handleSessionToggle(session.id)}
                      disabled={selectedSessionIds.length >= 4 && !selectedSessionIds.includes(session.id)}
                    />
                    <Label htmlFor={`session-${session.id}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{session.name}</span>
                      <p className="text-xs text-muted-foreground">
                        Periode Sesi: {format(parseISO(session.startDate), "dd MMM yyyy", { locale: localeID })} - {format(parseISO(session.endDate), "dd MMM yyyy", { locale: localeID })}
                      </p>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {completedSessions.length > 0 && (
        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleGenerateAnalysis} 
            disabled={isProcessing || selectedSessionIds.length < 2 || selectedSessionIds.length > 4}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Columns className="mr-2 h-4 w-4" />}
            Buat Analisis Komparatif ({selectedSessionIds.length} Sesi)
          </Button>
        </div>
      )}
    </div>
  );
}
