
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Edit, Shield, UserCircle, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getAllAppUsers, updateUserProfileData } from '@/services/userService';
import { getAllUprs } from '@/services/uprService';
import type { AppUser, UPR, UserRole } from '@/lib/types';
import { USER_ROLES } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function ManageUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [uprs, setUprs] = useState<UPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin, currentUser: adminUser } = useAuth();
  const { toast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [selectedUprId, setSelectedUprId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allUsers, allUprs] = await Promise.all([
        getAllAppUsers(),
        getAllUprs()
      ]);
      setUsers(allUsers);
      setUprs(allUprs.sort((a, b) => a.code.localeCompare(b.code)));
    } catch (error: any) {
      toast({ title: "Gagal Memuat Data", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  const handleEditUser = (user: AppUser) => {
    setEditingUser(user);
    setSelectedUprId(user.uprId);
    setSelectedRole(user.role);
    setIsEditModalOpen(true);
  };

  const handleSaveUserChanges = async () => {
    if (!editingUser || !adminUser) return; // adminUser check for creator context
    
    // Prevent admin from changing their own role to non-admin or removing their own UPR if critical
    if (editingUser.uid === adminUser.uid) {
      if (selectedRole !== 'admin') {
        toast({ title: "Operasi Dibatasi", description: "Admin tidak dapat mengubah role diri sendiri menjadi non-admin.", variant: "warning" });
        return;
      }
      // Consider if admin needs a UPR. If so, prevent removal here too.
    }
    
    setIsSavingUser(true);
    try {
      const updateData: Partial<AppUser> = {};
      if (selectedUprId !== editingUser.uprId) {
        updateData.uprId = selectedUprId; // Allows setting to null if "Tidak Ada" is chosen
      }
      if (selectedRole !== editingUser.role) {
        updateData.role = selectedRole || 'userSatker'; // Default to userSatker if null
      }

      if (Object.keys(updateData).length > 0) {
        await updateUserProfileData(editingUser.uid, updateData);
        toast({ title: "Pengguna Diperbarui", description: `Data pengguna "${editingUser.displayName || editingUser.email}" telah berhasil diperbarui.` });
        fetchData(); // Refresh list
      } else {
        toast({ title: "Tidak Ada Perubahan", description: "Tidak ada perubahan data yang disimpan.", variant: "default" });
      }
      setIsEditModalOpen(false);
    } catch (error: any) {
      toast({ title: "Gagal Memperbarui Pengguna", description: error.message, variant: "destructive" });
    } finally {
      setIsSavingUser(false);
    }
  };

  if (!isAdmin) {
    return <p className="text-destructive">Akses ditolak. Hanya admin yang dapat mengakses halaman ini.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola pengguna sistem, tetapkan UPR, dan atur peran."
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Belum ada pengguna yang terdaftar selain akun Anda.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[30%]">Nama Pengguna / Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>UPR Terkait</TableHead>
                    <TableHead>Periode Aktif</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => {
                      const associatedUpr = uprs.find(upr => upr.id === user.uprId);
                      return (
                        <TableRow key={user.uid}>
                            <TableCell>
                                <div className="font-medium">{user.displayName || <span className="italic text-muted-foreground">Tanpa Nama</span>}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                            </TableCell>
                            <TableCell><Badge variant={user.role === 'admin' ? "destructive" : "secondary"} className="text-xs">{user.role}</Badge></TableCell>
                            <TableCell className="text-xs">
                                {associatedUpr ? `${associatedUpr.code} - ${associatedUpr.name}` : (user.uprId ? <span className="italic text-muted-foreground">UPR ID: {user.uprId} (tidak ditemukan)</span> : <span className="italic text-muted-foreground">Belum Ditugaskan</span>)}
                            </TableCell>
                            <TableCell className="text-xs">{user.activePeriod || <span className="italic text-muted-foreground">Belum Diatur</span>}</TableCell>
                            <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleEditUser(user)} className="text-xs">
                                <Edit className="mr-1 h-3 w-3" /> Edit
                            </Button>
                            </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {editingUser && (
        <Dialog open={isEditModalOpen} onOpenChange={(open) => {
          if (!open) setEditingUser(null);
          setIsEditModalOpen(open);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Pengguna: {editingUser.displayName || editingUser.email}</DialogTitle>
              <DialogDescription>
                Perbarui peran dan UPR yang terhubung untuk pengguna ini.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="userRole">Peran Pengguna</Label>
                <Select value={selectedRole || ""} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                  <SelectTrigger id="userRole">
                    <SelectValue placeholder="Pilih peran" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="userUpr">UPR Terhubung</Label>
                <Select value={selectedUprId || "_NO_UPR_"} onValueChange={(value) => setSelectedUprId(value === "_NO_UPR_" ? null : value)}>
                  <SelectTrigger id="userUpr">
                    <SelectValue placeholder="Pilih UPR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_NO_UPR_">Tidak Ada (Kosongkan)</SelectItem>
                    {uprs.map(upr => (
                      <SelectItem key={upr.id} value={upr.id}>{upr.code} - {upr.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSavingUser}>
                Batal
              </Button>
              <Button type="button" onClick={handleSaveUserChanges} disabled={isSavingUser}>
                {isSavingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

    