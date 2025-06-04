
"use client";

import React from 'react';
import type { FlatReportItem, CalculatedRiskLevelCategory } from '@/lib/types'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRiskLevelColor, getControlTypeName } from '@/lib/types'; // Pastikan getControlTypeName diimpor

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

  const columns = [
    { header: "Kode Sasaran", accessor: "goalCode", className: "min-w-[100px]" },
    { header: "Nama Sasaran", accessor: "goalName", className: "min-w-[200px] max-w-xs truncate" },
    { header: "Kode PR", accessor: "potentialRiskCode", className: "min-w-[120px]" },
    { header: "Deskripsi PR", accessor: "potentialRiskDescription", className: "min-w-[250px] max-w-sm truncate" },
    { header: "Kategori PR", accessor: "potentialRiskCategory", className: "min-w-[120px]" },
    { header: "Pemilik PR", accessor: "potentialRiskOwner", className: "min-w-[150px]" },
    { header: "Kode PC", accessor: "riskCauseCode", className: "min-w-[150px]" },
    { header: "Deskripsi PC", accessor: "riskCauseDescription", className: "min-w-[250px] max-w-sm truncate" },
    { header: "Sumber PC", accessor: "riskCauseSource", className: "min-w-[100px]" },
    { header: "KRI PC", accessor: "riskCauseKRI", className: "min-w-[180px] max-w-xs truncate" },
    { header: "Toleransi PC", accessor: "riskCauseTolerance", className: "min-w-[180px] max-w-xs truncate" },
    { header: "Likelihood PC", accessor: "riskCauseLikelihood", className: "min-w-[150px]" },
    { header: "Impact PC", accessor: "riskCauseImpact", className: "min-w-[150px]" },
    { header: "Level Risiko PC", accessor: "riskCauseLevel", className: "min-w-[150px]" },
    { header: "Kode Kontrol", accessor: "controlMeasureCode", className: "min-w-[180px]" },
    { header: "Deskripsi Kontrol", accessor: "controlMeasureDescription", className: "min-w-[250px] max-w-sm truncate" },
    { header: "Tipe Kontrol", accessor: "controlMeasureTypeName", className: "min-w-[120px]" },
    { header: "KCI Kontrol", accessor: "controlMeasureKCI", className: "min-w-[180px] max-w-xs truncate" },
    { header: "Target KCI Kontrol", accessor: "controlMeasureTarget", className: "min-w-[180px] max-w-xs truncate" },
    { header: "PIC Kontrol", accessor: "controlMeasurePIC", className: "min-w-[150px]" },
    { header: "Deadline Kontrol", accessor: "controlMeasureDeadline", className: "min-w-[120px]" },
    { header: "Anggaran Kontrol (Rp)", accessor: "controlMeasureBudget", className: "min-w-[150px] text-right" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Tabel Datar - Periode: {period || 'Tidak Dipilih'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => (
                  <TableHead key={col.accessor} className={`text-xs whitespace-nowrap px-2 py-2 ${col.className || ''}`}>{col.header}</TableHead>
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
                    } else if (col.accessor === 'riskCauseLevel' && typeof value === 'string' && value !== 'N/A') {
                        displayValue = <Badge className={`${getRiskLevelColor(value as CalculatedRiskLevelCategory)} text-xs`}>{String(value)} ({row.riskCauseScore || 'N/A'})</Badge>;
                    } else if (col.accessor === 'riskCauseLevel' && value === 'N/A') {
                        displayValue = <Badge className={`${getRiskLevelColor(value as 'N/A')} text-xs`}>N/A</Badge>;
                    } else if (col.accessor === 'controlMeasureTypeName' && value) {
                      displayValue = <Badge variant="default" className="text-xs">{String(value)}</Badge>;
                    } else if (col.accessor === 'controlMeasureBudget' && typeof value === 'number') {
                      displayValue = value.toLocaleString('id-ID');
                    } else if (col.accessor === 'controlMeasureDeadline' && typeof value === 'string') {
                      try {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                           displayValue = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric'});
                        }
                      } catch (e) { /* ignore, keep original value */ }
                    }


                    return (
                      <TableCell key={`${rowIndex}-${col.accessor}`} className={`text-xs whitespace-nowrap px-2 py-1.5 ${col.className?.includes('truncate') ? 'truncate' : ''}`} title={String(value || '')}>
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

    
