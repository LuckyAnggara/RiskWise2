
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Goal } from '@/lib/types';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Pencil, Loader2 } from 'lucide-react';

const goalSchema = z.object({
  name: z.string().min(3, "Nama sasaran minimal 3 karakter."),
  description: z.string().min(10, "Deskripsi minimal 10 karakter."),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface AddGoalDialogProps {
  onGoalSave: (goalData: GoalFormData, existingGoalId?: string) => Promise<void>;
  existingGoal?: Goal | null;
  triggerButton?: React.ReactNode;
  existingGoals?: Goal[]; // Digunakan hanya untuk referensi UI jika perlu, tidak untuk logika inti
  // currentUprId dan currentPeriod tidak lagi diperlukan sebagai prop
  // jika operasi save mengandalkan konteks aktif dari store yang di-set oleh halaman GoalsPage
}

export function AddGoalDialog({ 
  onGoalSave, 
  existingGoal, 
  triggerButton,
  existingGoals = [], // Default ke array kosong
}: AddGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (existingGoal) {
        reset({
          name: existingGoal.name,
          description: existingGoal.description,
        });
      } else {
        reset({ name: "", description: "" });
      }
    }
  }, [existingGoal, open, reset]);

  const onSubmit: SubmitHandler<GoalFormData> = async (data) => {
    await onGoalSave(data, existingGoal?.id);
    setOpen(false);
  };

  const displayCode = existingGoal?.code || `(Kode Baru)`;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        if (existingGoal) {
          reset({name: existingGoal.name, description: existingGoal.description});
        } else {
          reset({name: "", description: ""});
        }
      }
    }}>
      <DialogTrigger asChild>
        {triggerButton ? (
          React.cloneElement(triggerButton as React.ReactElement, { onClick: () => setOpen(true) })
        ) : (
          <Button onClick={() => setOpen(true)}>
            {existingGoal ? <Pencil className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
             {existingGoal ? `Edit Sasaran (${displayCode})` : "Tambah Sasaran Baru"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingGoal ? `Edit Sasaran (${displayCode})` : "Tambah Sasaran Baru"}</DialogTitle>
          <DialogDescription>
            {existingGoal ? `Perbarui detail sasaran Anda.` : `Definisikan sasaran baru untuk mulai mengelola risikonya.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nama
            </Label>
            <div className="col-span-3">
              <Input
                id="name"
                {...register("name")}
                className={errors.name ? "border-destructive" : ""}
                disabled={isSubmitting}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Deskripsi
            </Label>
            <div className="col-span-3">
              <Textarea
                id="description"
                {...register("description")}
                className={errors.description ? "border-destructive" : ""}
                disabled={isSubmitting}
              />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (existingGoal ? "Simpan Perubahan" : "Simpan Sasaran")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    
