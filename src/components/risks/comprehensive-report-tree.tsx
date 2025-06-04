
"use client";

import React from 'react';
import type { Goal } from '@/lib/types';
import { ComprehensiveReportTreeItem } from './comprehensive-report-tree-item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ComprehensiveReportTreeProps {
  goals: Goal[]; // Menerima goals yang sudah difilter berdasarkan periode
  userId: string;
  period: string; // Periode laporan yang sedang ditampilkan
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
            userId={userId} // Tetap teruskan userId dari context
            period={period} // Teruskan periode laporan yang dipilih
          />
        ))}
      </CardContent>
    </Card>
  );
}

    