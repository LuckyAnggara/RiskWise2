
"use client";

import React from 'react';
import type { Goal } from '@/lib/types';
import { ComprehensiveReportTreeItem } from './comprehensive-report-tree-item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ComprehensiveReportTreeProps {
  goals: Goal[];
  userId: string;
  period: string;
}

export function ComprehensiveReportTree({ goals, userId, period }: ComprehensiveReportTreeProps) {
  if (!goals || goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laporan Hierarki</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tidak ada sasaran untuk ditampilkan pada periode dan UPR yang dipilih.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map(goal => (
        <ComprehensiveReportTreeItem
          key={goal.id}
          item={goal}
          itemType="goal"
          level={0}
          userId={userId}
          period={period}
        />
      ))}
    </div>
  );
}
    