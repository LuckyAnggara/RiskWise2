
"use client";

import React from 'react';
import {
  Dialog as ShadCnDialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CalculatedRiskLevelCategory, LikelihoodLevelDesc, ImpactLevelDesc } from '@/lib/types'; 
import { LIKELIHOOD_LEVELS_DESC, IMPACT_LEVELS_DESC, LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP,  getRiskLevelColor, RISK_SCORE_HEATMAP  } from '@/lib/types';


interface RiskMatrixModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Urutkan label berdasarkan nilai numerik untuk tampilan matriks yang benar
const likelihoodLabelsSorted = LIKELIHOOD_LEVELS_DESC.sort((a, b) => LIKELIHOOD_LEVELS_DESC_MAP[b] - LIKELIHOOD_LEVELS_DESC_MAP[a]); // Desc untuk baris
const impactLabelsSorted = IMPACT_LEVELS_DESC.sort((a, b) => IMPACT_LEVELS_DESC_MAP[a] - IMPACT_LEVELS_DESC_MAP[b]); // Asc untuk kolom


export function RiskMatrixModal({ isOpen, onOpenChange }: RiskMatrixModalProps) {
  return (
    <ShadCnDialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-3 sm:p-4"> 
        <DialogHeader>
          <DialogTitle>Matriks Profil Risiko (Heatmap)</DialogTitle>
          <DialogDescription className="text-[10px] sm:text-xs">
            Panduan visual untuk menentukan level risiko berdasarkan skor dari heatmap.
          </DialogDescription>
        </DialogHeader>
        <div className="py-1 grid grid-cols-1 md:grid-cols-[auto,1fr] gap-1 sm:gap-2 items-start">
          <div 
            className="md:w-10 shrink-0 text-[8px] sm:text-[9px] font-medium text-center self-stretch flex items-center justify-center transform md:-rotate-90 md:origin-center whitespace-nowrap md:-ml-2 md:mr-0.5">
            Kemungkinan
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse table-fixed text-[10px] sm:text-xs">
              <thead>
                <tr>
                  <th className="p-0.5 sm:p-1 border border-muted w-10 h-8 sm:h-10"></th> {/* Adjusted padding and height */}
                  {impactLabelsSorted.map(imLabel => (
                    <th key={imLabel} className="p-0.5 sm:p-1 border border-muted font-semibold h-8 sm:h-10 break-words leading-tight align-bottom w-[18%] text-[8px] sm:text-[10px]">{imLabel}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {likelihoodLabelsSorted.map(lkLabel => {
                  const lkValue = LIKELIHOOD_LEVELS_DESC_MAP[lkLabel];
                  return (
                    <tr key={lkLabel} className="h-8 sm:h-10">
                      <td className="p-0.5 sm:p-1 border border-muted font-semibold w-10 leading-tight align-middle text-[8px] sm:text-[10px]">{lkLabel}</td>
                      {impactLabelsSorted.map(imLabel => {
                        const imValue = IMPACT_LEVELS_DESC_MAP[imLabel];
                        const score = RISK_SCORE_HEATMAP[lkValue]?.[imValue];
                        let level: CalculatedRiskLevelCategory | 'N/A' = 'N/A';
                        if (score !== undefined && score !== null) {
                            if (score >= 20) level = 'Sangat Tinggi';
                            else if (score >= 16) level = 'Tinggi';
                            else if (score >= 12) level = 'Sedang';
                            else if (score >= 6) level = 'Rendah';
                            else if (score >= 1) level = 'Sangat Rendah';
                        }
                        
                        return (
                          <td key={`${lkLabel}-${imLabel}`} className={`p-0.5 sm:p-1 border border-muted text-center font-bold h-8 sm:h-10 ${level !== 'N/A' ? getRiskLevelColor(level) : 'bg-gray-100'}`}>
                            {score !== undefined ? score : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                  <tr>
                    <td/>
                    <td className="p-0.5 sm:p-1 pt-1 sm:pt-2 border-t border-muted text-center font-medium h-8 sm:h-10 leading-tight text-[8px] sm:text-[10px]" colSpan={impactLabelsSorted.length}>Dampak Risiko</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
         <div className="mt-1 sm:mt-2 pl-10 md:pl-12">
            <h3 className="font-semibold text-[9px] sm:text-[10px] mb-0.5">Keterangan Level Risiko (Skor):</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-1 gap-y-0.5 text-[8px] sm:text-[9px]">
              {[
                {level: "Sangat Tinggi" as CalculatedRiskLevelCategory, range: "(20-25)"},
                {level: "Tinggi" as CalculatedRiskLevelCategory, range: "(16-19)"},
                {level: "Sedang" as CalculatedRiskLevelCategory, range: "(12-15)"},
                {level: "Rendah" as CalculatedRiskLevelCategory, range: "(6-11)"},
                {level: "Sangat Rendah" as CalculatedRiskLevelCategory, range: "(1-5)"},
              ].map(item => (
                <div key={item.level} className="flex items-center space-x-1">
                  <Badge className={`${getRiskLevelColor(item.level)} min-w-[80px] justify-center text-[8px] px-1 py-0 h-4 leading-none`}>{item.level}</Badge>
                  <span className="text-muted-foreground">{item.range}</span>
                </div>
              ))}
            </div>
        </div>
        <DialogFooter className="mt-2 sm:mt-3">
          <Button onClick={() => onOpenChange(false)} size="sm">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </ShadCnDialog>
  );
}

    