
"use client";

import React from 'react';
import type { Goal } from '@/lib/types';
import { ComprehensiveReportTreeItem } from './comprehensive-report-tree-item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ComprehensiveReportTreeProps {
  goals: Goal[]; // Goals are now passed directly, already filtered by period and user
  userId: string;
  period: string; // This should be the selectedPeriodForReport from the parent
}

export function ComprehensiveReportTree({ goals, userId, period }: ComprehensiveReportTreeProps) {
  if (!goals || goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laporan Hierarki Risiko</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tidak ada data sasaran untuk periode {period} yang dipilih atau tidak ada sasaran yang cocok.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Hierarki Risiko - Periode: {period}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.map(goal => (
          <ComprehensiveReportTreeItem
            key={goal.id}
            item={goal}
            itemType="goal"
            level={0}
            userId={userId} // Pass down from props
            period={period} // Pass down from props
          />
        ))}
      </CardContent>
    </Card>
  );
}
