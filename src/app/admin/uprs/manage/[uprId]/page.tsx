
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, ArrowLeft, Users, Search } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { addUpr, getUprById, updateUpr } from '@/services/uprService';
import type { UPR, AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getAllAppUsers, updateUserProfileData } from '@/services/userService';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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

  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [initialUserAssignmentsLoaded, setInitialUserAssignmentsLoaded] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');


  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UprFormData>({
    resolver: zodResolver(uprFormSchema),
    defaultValues: { name: "", code: "", description: "" },
  });

  const fetchUsersAndUpr = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingPage(true);
    try {
      const users = await getAllAppUsers();
      setAllUsers(users.sort((a,b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '')));

      if (!isCreatingNew) {
        const uprData = await getUprById(uprIdParam);
        if (uprData) {
          reset({
            name: uprData.name,
            code: uprData.code,
            description: uprData.description || "",
          });
          
          const assignedUsers = new Set<string>();
          users.forEach(user => {
            if (user.uprId === uprIdParam) {
              assignedUsers.add(user.uid);
            }
          });
          setSelectedUserIds(assignedUsers);
          setInitialUserAssignmentsLoaded(true);
        } else {
          toast({ title: "Error", description: "UPR tidak ditemukan.", variant: "destructive" });
          router.push('/admin/uprs');
        }
      } else {
         setInitialUserAssignmentsLoaded(true); 
      }
    } catch (error: any) {
      toast({ title: "Error Memuat Data", description: error.message, variant: "destructive" });
      if (!isCreatingNew) router.push('/admin/uprs');
    } finally {
      setIsLoadingPage(false);
    }
  }, [uprIdParam, isCreatingNew, isAdmin, reset, router, toast]);

  useEffect(() => {
    fetchUsersAndUpr();
  }, [fetchUsersAndUpr]);


  const handleUserSelectionChange = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(userId)) {
        newSelection.delete(userId);
      } else {
        newSelection.add(userId);
      }
      return newSelection;
    });
  };

  const onSubmit: SubmitHandler<UprFormData> = async (data) => {
    let currentUprId = uprIdParam;
    try {
      if (isCreatingNew) {
        const newUpr = await addUpr({
          name: data.name,
          code: data.code,
          description: data.description || null,
        });
        currentUprId = newUpr.id; 
        toast({ title: "UPR Dibuat", description: `UPR "${data.name}" telah berhasil dibuat.` });
      } else {
        await updateUpr(uprIdParam, {
          name: data.name,
          code: data.code,
          description: data.description || null,
        });
        toast({ title: "UPR Diperbarui", description: `UPR "${data.name}" telah berhasil diperbarui.` });
      }

      
      for (const user of allUsers) {
        const isSelected = selectedUserIds.has(user.uid);
        const currentUprAssignment = user.uprId;

        if (isSelected && currentUprAssignment !== currentUprId) {
          
          await updateUserProfileData(user.uid, { uprId: currentUprId });
          toast({ title: "Pengguna Di-assign", description: `Pengguna ${user.displayName || user.email} di-assign ke UPR ${data.name}.`, duration: 2000 });
        } else if (!isSelected && currentUprAssignment === currentUprId) {
          
          await updateUserProfileData(user.uid, { uprId: null });
           toast({ title: "Pengguna Di-unassign", description: `Pengguna ${user.displayName || user.email} di-unassign dari UPR ${data.name}.`, variant: "default", duration: 2000 });
        }
      }

      router.push('/admin/uprs');
      router.refresh();
    } catch (error: any) {
      toast({ title: "Gagal Menyimpan UPR atau Assignment", description: error.message, variant: "destructive" });
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) {
      return allUsers;
    }
    const lowerSearchTerm = userSearchTerm.toLowerCase();
    return allUsers.filter(user =>
      (user.displayName && user.displayName.toLowerCase().includes(lowerSearchTerm)) ||
      (user.email && user.email.toLowerCase().includes(lowerSearchTerm))
    );
  }, [allUsers, userSearchTerm]);
  
  if (!isAdmin && !isLoadingPage) {
    return <p className="text-destructive">Akses ditolak. Hanya admin yang dapat mengakses halaman ini.</p>;
  }
  
  if (isLoadingPage || (!initialUserAssignmentsLoaded && !isCreatingNew)) {
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
        description={isCreatingNew ? "Buat Unit Pemilik Risiko baru." : "Perbarui detail UPR dan kelola pengguna yang terhubung."}
        actions={
            <Button onClick={() => router.push('/admin/uprs')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar UPR
            </Button>
        }
      />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Detail UPR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
          </CardContent>
        </Card>
        
        {!isCreatingNew && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" /> Pengguna Terhubung</CardTitle>
            <CardDescription>Pilih pengguna yang akan di-assign ke UPR ini. Pengguna yang sudah terhubung akan otomatis tercentang.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari pengguna berdasarkan nama atau email..."
                className="pl-10 w-full"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {allUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada pengguna terdaftar di sistem.</p>
            ) : filteredUsers.length === 0 && userSearchTerm ? (
                 <p className="text-sm text-muted-foreground">Tidak ada pengguna yang cocok dengan pencarian "{userSearchTerm}".</p>
            ) : (
                <ScrollArea className="h-[300px] border rounded-md p-4">
                    <div className="space-y-3">
                    {filteredUsers.map(user => (
                        <div key={user.uid} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <Checkbox
                            id={`user-${user.uid}`}
                            checked={selectedUserIds.has(user.uid)}
                            onCheckedChange={() => handleUserSelectionChange(user.uid)}
                            disabled={isSubmitting}
                        />
                        <Label htmlFor={`user-${user.uid}`} className="flex-1 cursor-pointer text-sm">
                            <span className="font-medium">{user.displayName || <i className="text-muted-foreground">Tanpa Nama</i>}</span>
                            <span className="text-xs text-muted-foreground ml-2">({user.email})</span>
                            {user.uprId && user.uprId !== uprIdParam && (
                                <span className="text-xs text-amber-600 dark:text-amber-400 ml-2 italic">(Saat ini terhubung ke UPR lain)</span>
                            )}
                        </Label>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
            )}
          </CardContent>
        </Card>
        )}

        <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isCreatingNew ? "Simpan UPR Baru" : "Simpan Perubahan UPR & Pengguna"}
            </Button>
        </div>
      </form>
    </div>
  );
}

    
