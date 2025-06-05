
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, ShieldAlert, Edit, Trash2 } from 'lucide-react';
import type { Goal } from '@/lib/types';
import { AddGoalDialog } from './add-goal-dialog';

interface GoalCardProps {
  goal: Goal;
  onEditGoal: (goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'uprId' | 'period' | 'userId'>, existingGoalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
  // currentUprId dan currentPeriod tidak lagi diperlukan di sini
  // karena operasi save/delete akan menggunakan konteks dari store yang sudah di-align
  // oleh halaman GoalsPage
}

export function GoalCard({ goal, onEditGoal, onDeleteGoal }: GoalCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <Target className="h-8 w-8 text-primary mb-2" />
          <div className="flex space-x-2">
             <AddGoalDialog 
                existingGoal={goal} 
                onGoalSave={(data) => onEditGoal(data, goal.id)}
                // currentUprId and currentPeriod are not needed if AddGoalDialog also relies on store's active context
                // or if the parent (GoalsPage) ensures the store context is set before calling onEditGoal.
                // For simplicity, we assume AddGoalDialog (or its consumer) handles context.
                existingGoals={[]} // existingGoals is for code generation, not strictly needed for edit action via card
                triggerButton={
                  <Button variant="ghost" size="icon" aria-label={`Edit sasaran ${goal.name} (${goal.code})`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                }
              />
            <Button variant="ghost" size="icon" aria-label={`Hapus sasaran ${goal.name} (${goal.code})`} onClick={() => onDeleteGoal(goal.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-lg">{goal.code} - {goal.name}</CardTitle> 
        <CardDescription className="line-clamp-3 min-h-[3.75rem] text-sm">{goal.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-xs text-muted-foreground">
          Dibuat: {new Date(goal.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
        {/* Placeholder for risk count if you re-implement fetching it */}
        {/* <p className="text-xs text-muted-foreground mt-1">X Potensi Risiko</p> */}
      </CardContent>
      <CardFooter className="flex justify-end items-center">
        <Link href={`/risks/${goal.id}`} passHref>
          <Button variant="outline" size="sm">
            <ShieldAlert className="mr-2 h-4 w-4" />
            Lihat Potensi Risiko
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
    
