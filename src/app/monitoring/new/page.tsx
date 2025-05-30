
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Although not used yet, might be for description
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { MonitoringSession, RiskCause } from '@/lib/types';
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, Calendar as CalendarIcon, ListChecks, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfToday, addMonths } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

const monitoringSessionFormSchema = z.object({
  name: z.string().min(5, "Nama sesi pemantauan minimal 5 karakter."),
  startDate: z.date({ required_error: "Tanggal mulai harus diisi." }),
  endDate: z.date({ required_error: "Tanggal selesai harus diisi." }),
  riskCauseIdsToMonitor: z.array(z.string()).min(1, "Pilih minimal satu penyebab risiko untuk dipantau."),
}).refine(data => data.endDate > data.startDate, {
  message: "Tanggal selesai harus setelah tanggal mulai.",
  path: ["endDate"],
});

type MonitoringSessionFormData = z.infer<typeof monitoringSessionFormSchema>;

export default function NewMonitoringSessionPage() {
  const router = useRouter();
  const { currentUser, appUser, loading: authLoading, isProfileComplete } = useAuth();
  const { toast } = useToast();
  
  const store = useAppStore();
  const allRiskCauses = store.riskCauses; // Mengambil semua penyebab risiko dari store
  const addMonitoringSessionToState = store.addMonitoringSessionToState;

  const [isSaving, setIsSaving] = useState(false);
  const [searchTermCause, setSearchTermCause] = useState('');

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || "UPR Pengguna", [appUser]);


  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MonitoringSessionFormData>({
    resolver: zodResolver(monitoringSessionFormSchema),
    defaultValues: {
      name: `Pemantauan Risiko - ${format(new Date(), "MMMM yyyy", { locale: localeID })}`,
      startDate: startOfToday(),
      endDate: addMonths(startOfToday(), 3), // Default 3 bulan dari sekarang
      riskCauseIdsToMonitor: [],
    },
  });

  const selectedRiskCauseIds = watch("riskCauseIdsToMonitor");

  useEffect(() => {
    if (!authLoading && (!currentUser || !isProfileComplete)) {
      router.push(currentUser ? '/settings' : '/login');
    }
    // Memastikan data penyebab risiko sudah dimuat jika belum
    if (currentUserId && currentPeriod && allRiskCauses.length === 0 && !store.riskCausesLoading) {
      store.fetchRiskCauses(currentUserId, currentPeriod);
    }
  }, [authLoading, currentUser, isProfileComplete, router, currentUserId, currentPeriod, allRiskCauses.length, store.riskCausesLoading, store.fetchRiskCauses]);

  const onSubmit: SubmitHandler<MonitoringSessionFormData> = async (data) => {
    if (!currentUserId || !currentPeriod) {
      toast({ title: "Konteks Tidak Lengkap", description: "User ID atau Periode aplikasi tidak tersedia.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const newSessionData: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'status'> = {
        name: data.name,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        riskCauseIdsToMonitor: data.riskCauseIdsToMonitor,
      };
      const createdSession = await addMonitoringSessionToState(newSessionData, currentUserId, currentPeriod);
      if (createdSession) {
        toast({ title: "Sesi Pemantauan Dibuat", description: `Sesi "${createdSession.name}" berhasil dibuat.` });
        router.push(`/monitoring/${createdSession.id}/conduct`);
      } else {
        throw new Error("Gagal membuat sesi pemantauan di store.");
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[NewMonitoringSessionPage] Error creating monitoring session:", errorMessage);
      toast({ title: "Gagal Membuat Sesi", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRiskCauses = useMemo(() => {
    if (!allRiskCauses) return [];
    return allRiskCauses.filter(cause =>
      cause.description.toLowerCase().includes(searchTermCause.toLowerCase()) ||
      (cause.potentialRiskCode && cause.potentialRiskCode.toLowerCase().includes(searchTermCause.toLowerCase())) ||
      (cause.riskCauseCode && cause.riskCauseCode.toLowerCase().includes(searchTermCause.toLowerCase()))
    ).filter(cause => cause.likelihood && cause.impact); // Hanya yang sudah dianalisis
  }, [allRiskCauses, searchTermCause]);

  const handleToggleSelectAllCauses = (checked: boolean) => {
    if (checked) {
      setValue("riskCauseIdsToMonitor", filteredRiskCauses.map(rc => rc.id));
    } else {
      setValue("riskCauseIdsToMonitor", []);
    }
  };


  if (authLoading || (!currentUser && !authLoading)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }

  if (!isProfileComplete && currentUser) {
     return (
       <div className="text-center py-10">
        <p className="text-muted-foreground">Harap lengkapi profil UPR dan Periode Anda di Pengaturan untuk membuat sesi pemantauan.</p>
        <Button onClick={() => router.push('/settings')} className="mt-4">Ke Pengaturan</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mulai Sesi Pemantauan dan Reviu Baru"
        description={`UPR: ${uprDisplayName}, Periode Aplikasi: ${currentPeriod || '...'}.`}
        actions={
          <Link href="/monitoring" passHref>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Sesi
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Detail Sesi Pemantauan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Periode Pemantauan</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Contoh: Pemantauan Triwulan 1 2024"
                  disabled={isSaving}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.startDate && "border-destructive")}
                          disabled={isSaving}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd MMM yyyy", { locale: localeID }) : <span>Pilih tanggal mulai</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate">Tanggal Selesai</Label>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.endDate && "border-destructive")}
                          disabled={isSaving}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd MMM yyyy", { locale: localeID }) : <span>Pilih tanggal selesai</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus fromDate={watch("startDate") || undefined} />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Pilih Penyebab Risiko untuk Dipantau</CardTitle>
              <CardDescription>Pilih minimal satu penyebab risiko yang telah dianalisis (memiliki Kemungkinan & Dampak).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Cari kode atau deskripsi penyebab risiko..."
                    className="pl-10 w-full"
                    value={searchTermCause}
                    onChange={(e) => setSearchTermCause(e.target.value)}
                    disabled={isSaving || store.riskCausesLoading}
                />
              </div>
              {errors.riskCauseIdsToMonitor && <p className="text-xs text-destructive">{errors.riskCauseIdsToMonitor.message}</p>}
              
              {store.riskCausesLoading ? (
                 <div className="flex justify-center items-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Memuat daftar penyebab risiko...</p>
                </div>
              ): filteredRiskCauses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {allRiskCauses.length === 0 ? "Belum ada penyebab risiko yang dianalisis." : "Tidak ada penyebab risiko yang cocok dengan pencarian atau belum dianalisis."}
                </p>
              ) : (
                <>
                  <div className="flex items-center space-x-2 py-2 border-b">
                    <Checkbox
                      id="selectAllCausesForMonitoring"
                      checked={selectedRiskCauseIds?.length === filteredRiskCauses.length && filteredRiskCauses.length > 0}
                      onCheckedChange={(checked) => handleToggleSelectAllCauses(Boolean(checked))}
                      disabled={isSaving}
                    />
                    <Label htmlFor="selectAllCausesForMonitoring" className="text-sm font-medium">
                      Pilih Semua yang Terlihat ({selectedRiskCauseIds?.length || 0} / {filteredRiskCauses.length} dipilih)
                    </Label>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Kode</TableHead>
                          <TableHead>Deskripsi Penyebab Risiko</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRiskCauses.map((cause) => (
                          <TableRow key={cause.id}>
                            <TableCell>
                              <Controller
                                name="riskCauseIdsToMonitor"
                                control={control}
                                render={({ field }) => (
                                  <Checkbox
                                    checked={field.value?.includes(cause.id)}
                                    onCheckedChange={(checked) => {
                                      const currentSelection = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentSelection, cause.id]);
                                      } else {
                                        field.onChange(currentSelection.filter(id => id !== cause.id));
                                      }
                                    }}
                                    disabled={isSaving}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{cause.riskCauseCode || `${cause.potentialRiskCode || 'PR?'}.PC${cause.sequenceNumber}`}</TableCell>
                            <TableCell className="text-xs">{cause.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isSaving || store.riskCausesLoading}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan & Mulai Sesi Pemantauan
          </Button>
        </div>
      </form>
    </div>
  );
}
