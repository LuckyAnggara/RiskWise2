
"use client";

import React from 'react';
import type { FlatReportItem } from '@/app/risk-document/page'; // Mengimpor tipe dari halaman
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRiskLevelColor } from '@/lib/types';

interface ComprehensiveReportTableProps {
  data: FlatReportItem[];
  period: string | null;
}

export function ComprehensiveReportTable({ data, period }: ComprehensiveReportTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laporan Tabel Datar - Periode: {period || 'Tidak Dipilih'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-10">
            Tidak ada data untuk ditampilkan dalam mode tabel datar untuk periode ini, atau data sedang diproses.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Define columns dynamically based on available data or use a fixed set
  const columns = [
    { header: "Kode Sasaran", accessor: "goalCode" },
    { header: "Nama Sasaran", accessor: "goalName" },
    { header: "Kode PR", accessor: "potentialRiskCode" },
    { header: "Deskripsi PR", accessor: "potentialRiskDescription" },
    { header: "Kategori PR", accessor: "potentialRiskCategory" },
    { header: "Kode PC", accessor: "riskCauseCode" },
    { header: "Deskripsi PC", accessor: "riskCauseDescription" },
    { header: "Sumber PC", accessor: "riskCauseSource" },
    { header: "KRI PC", accessor: "riskCauseKRI" },
    { header: "Toleransi PC", accessor: "riskCauseTolerance" },
    { header: "Likelihood PC", accessor: "riskCauseLikelihood" },
    { header: "Impact PC", accessor: "riskCauseImpact" },
    { header: "Level Risiko PC", accessor: "riskCauseLevel" },
    { header: "Kode Kontrol", accessor: "controlMeasureCode" },
    { header: "Deskripsi Kontrol", accessor: "controlMeasureDescription" },
    { header: "Tipe Kontrol", accessor: "controlMeasureTypeName" },
    { header: "KCI Kontrol", accessor: "controlMeasureKCI" },
    { header: "Target KCI Kontrol", accessor: "controlMeasureTarget" },
    { header: "PIC Kontrol", accessor: "controlMeasurePIC" },
    { header: "Deadline Kontrol", accessor: "controlMeasureDeadline" },
    { header: "Anggaran Kontrol (Rp)", accessor: "controlMeasureBudget" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Tabel Datar - Periode: {period || 'Tidak Dipilih'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-md">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                {columns.map(col => (
                  <TableHead key={col.accessor} className="text-xs whitespace-nowrap px-2 py-2">{col.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map(col => {
                    const value = row[col.accessor as keyof FlatReportItem];
                    let displayValue: React.ReactNode = value !== undefined && value !== null ? String(value) : '-';

                    if (col.accessor === 'potentialRiskCategory' && value) {
                      displayValue = <Badge variant="secondary" className="text-xs">{String(value)}</Badge>;
                    } else if (col.accessor === 'riskCauseSource' && value) {
                      displayValue = <Badge variant="outline" className="text-xs">{String(value)}</Badge>;
                    } else if (col.accessor === 'riskCauseLevel' && value && value !== 'N/A') {
                      displayValue = <Badge className={`${getRiskLevelColor(value as any)} text-xs`}>{String(value)} ({row.riskCauseScore || 'N/A'})</Badge>;
                    } else if (col.accessor === 'riskCauseLevel' && value === 'N/A') {
                        displayValue = <Badge className={`${getRiskLevelColor(value as any)} text-xs`}>N/A</Badge>;
                    } else if (col.accessor === 'controlMeasureTypeName' && value) {
                      displayValue = <Badge variant="default" className="text-xs">{String(value)}</Badge>;
                    } else if (col.accessor === 'controlMeasureBudget' && typeof value === 'number') {
                      displayValue = value.toLocaleString('id-ID');
                    }

                    return (
                      <TableCell key={`${rowIndex}-${col.accessor}`} className="text-xs whitespace-nowrap px-2 py-1.5 max-w-[200px] truncate" title={String(value || '')}>
                        {displayValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length > 20 && <p className="text-xs text-muted-foreground mt-2">Menampilkan {data.length} baris. Scroll ke samping untuk melihat semua kolom.</p>}
      </CardContent>
    </Card>
  );
}

