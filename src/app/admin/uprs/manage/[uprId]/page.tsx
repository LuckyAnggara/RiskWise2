
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { addUpr, getUprById, updateUpr } from '@/services/uprService';
import type { UPR } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const uprFormSchema = z.object({
  name: z.string().min(3, "Nama UPR minimal 3 karakter."),
  code: z.string().min(2, "Kode UPR minimal 2 karakter.").max(10, "Kode UPR maksimal 10 karakter.").regex(/^[A-Z0-9_]+$/, "Kode UPR hanya boleh huruf kapital, angka, dan underscore."),
  description: z.string().optional().nullable(),
});

type UprFormData = z.infer<typeof uprFormSchema>;

export default function ManageSingleUprPage() {
  const router = useRouter();
  const params = useParams();
  const uprIdParam = params.uprId as string;
  const isCreatingNew = uprIdParam === 'new';

  const [isLoadingPage, setIsLoadingPage] = useState(!isCreatingNew);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UprFormData>({
    resolver: zodResolver(uprFormSchema),
    defaultValues: { name: "", code: "", description: "" },
  });

  useEffect(() => {
    if (!isCreatingNew && isAdmin) {
      setIsLoadingPage(true);
      getUprById(uprIdParam)
        .then(uprData => {
          if (uprData) {
            reset({
              name: uprData.name,
              code: uprData.code,
              description: uprData.description || "",
            });
          } else {
            toast({ title: "Error", description: "UPR tidak ditemukan.", variant: "destructive" });
            router.push('/admin/uprs');
          }
        })
        .catch(error => {
          toast({ title: "Error Memuat UPR", description: error.message, variant: "destructive" });
          router.push('/admin/uprs');
        })
        .finally(() => setIsLoadingPage(false));
    } else if (isCreatingNew) {
      setIsLoadingPage(false);
    }
  }, [uprIdParam, isCreatingNew, isAdmin, reset, router, toast]);


  const onSubmit: SubmitHandler<UprFormData> = async (data) => {
    try {
      if (isCreatingNew) {
        await addUpr({
          name: data.name,
          code: data.code,
          description: data.description || null,
        });
        toast({ title: "UPR Dibuat", description: `UPR "${data.name}" telah berhasil dibuat.` });
      } else {
        await updateUpr(uprIdParam, {
          name: data.name,
          code: data.code,
          description: data.description || null,
        });
        toast({ title: "UPR Diperbarui", description: `UPR "${data.name}" telah berhasil diperbarui.` });
      }
      router.push('/admin/uprs');
      router.refresh(); 
    } catch (error: any) {
      toast({ title: "Gagal Menyimpan UPR", description: error.message, variant: "destructive" });
    }
  };
  
  if (!isAdmin && !isLoadingPage) { // Added !isLoadingPage to prevent premature redirect
    return <p className="text-destructive">Akses ditolak. Hanya admin yang dapat mengakses halaman ini.</p>;
  }
  
  if (isLoadingPage) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isCreatingNew ? "Tambah UPR Baru" : "Edit UPR"}
        description={isCreatingNew ? "Buat Unit Pemilik Risiko baru." : "Perbarui detail UPR yang sudah ada."}
        actions={
            <Button onClick={() => router.push('/admin/uprs')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar UPR
            </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{isCreatingNew ? "Formulir UPR Baru" : "Formulir Edit UPR"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="code">Kode UPR</Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="Contoh: ITJEN, DITKEU"
                className={errors.code ? "border-destructive" : ""}
                disabled={isSubmitting}
              />
              {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Nama UPR</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Contoh: Inspektorat Jenderal, Direktorat Keuangan"
                className={errors.name ? "border-destructive" : ""}
                disabled={isSubmitting}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                {...register("description")}
                rows={3}
                placeholder="Deskripsi singkat mengenai UPR..."
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isCreatingNew ? "Simpan UPR Baru" : "Simpan Perubahan"}
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

    