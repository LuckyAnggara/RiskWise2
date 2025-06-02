
"use client";

import React from 'react';
import { Badge } from "@/components/ui/badge";
import type { RiskCause, LikelihoodLevelDesc, ImpactLevelDesc, CalculatedRiskLevelCategory } from '@/lib/types';
import { LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, getCalculatedRiskLevel, getRiskLevelColor } from '@/lib/types'; // Corrected import

interface RiskPriorityMatrixProps {
  riskCauses: Array<RiskCause & { riskScore?: number | null; riskLevelText?: string }>;
}

// Sort by numeric value, then map to description
const likelihoodLevelsSorted = Object.entries(LIKELIHOOD_LEVELS_DESC_MAP)
  .sort(([, aVal], [, bVal]) => bVal - aVal) // Sort descending by value for matrix display (5 at top)
  .map(([desc,]) => desc as LikelihoodLevelDesc);

const impactLevelsSorted = Object.entries(IMPACT_LEVELS_DESC_MAP)
  .sort(([, aVal], [, bVal]) => aVal - bVal) // Sort ascending by value for matrix display (1 at left)
  .map(([desc,]) => desc as ImpactLevelDesc);


export function RiskPriorityMatrix({ riskCauses }: RiskPriorityMatrixProps) {
  const matrixData: { [key: string]: { count: number; level: CalculatedRiskLevelCategory | 'N/A' } } = {};

  likelihoodLevelsSorted.forEach(lk => {
    impactLevelsSorted.forEach(im => {
      const { level } = getCalculatedRiskLevel(lk, im);
      matrixData[`${lk}-${im}`] = { count: 0, level: level };
    });
  });

  riskCauses.forEach(cause => {
    if (cause.likelihood && cause.impact) {
      const key = `${cause.likelihood}-${cause.impact}`;
      if (matrixData[key]) {
        matrixData[key].count++;
      }
    }
  });

  return (
    <div className="py-1 grid grid-cols-1 md:grid-cols-[auto,1fr] gap-1 sm:gap-2 items-start">
      <div 
        className="md:w-10 shrink-0 text-[8px] sm:text-[9px] font-medium text-center self-stretch flex items-center justify-center transform md:-rotate-90 md:origin-center whitespace-nowrap md:-ml-2 md:mr-0.5">
        Kemungkinan
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full border-collapse table-fixed text-[10px] sm:text-xs">
          <thead>
            <tr>
              <th className="p-0.5 sm:p-1 border border-muted w-10 h-8 sm:h-10"></th>
              {impactLevelsSorted.map(imLabel => (
                <th key={imLabel} className="p-0.5 sm:p-1 border border-muted font-semibold h-8 sm:h-10 break-words leading-tight align-bottom w-[18%] text-[8px] sm:text-[10px]">{imLabel}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {likelihoodLevelsSorted.map(lkLabel => (
              <tr key={lkLabel} className="h-8 sm:h-10">
                <td className="p-0.5 sm:p-1 border border-muted font-semibold w-10 leading-tight align-middle text-[8px] sm:text-[10px]">{lkLabel}</td>
                {impactLevelsSorted.map(imLabel => {
                  const cellData = matrixData[`${lkLabel}-${imLabel}`];
                  return (
                    <td key={`${lkLabel}-${imLabel}`} className={`p-0.5 sm:p-1 border border-muted text-center font-bold h-8 sm:h-10 ${cellData ? getRiskLevelColor(cellData.level) : 'bg-gray-100'}`}>
                      {cellData ? cellData.count : 0}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td/>
              <td className="p-0.5 sm:p-1 pt-1 sm:pt-2 border-t border-muted text-center font-medium h-8 sm:h-10 leading-tight text-[8px] sm:text-[10px]" colSpan={impactLevelsSorted.length}>Dampak Risiko</td>
            </tr>
          </tbody>
        </table>
      </div>
       <div className="mt-1 sm:mt-2 md:col-start-2 pl-0 md:pl-10"> {/* Adjusted for legend alignment */}
        <h3 className="font-semibold text-[9px] sm:text-[10px] mb-0.5">Keterangan Level Risiko (Jumlah Penyebab):</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-1 gap-y-0.5 text-[8px] sm:text-[9px]">
          {[
            {level: "Sangat Tinggi" as CalculatedRiskLevelCategory, range: "Sangat Tinggi"},
            {level: "Tinggi" as CalculatedRiskLevelCategory, range: "Tinggi"},
            {level: "Sedang" as CalculatedRiskLevelCategory, range: "Sedang"},
            {level: "Rendah" as CalculatedRiskLevelCategory, range: "Rendah"},
            {level: "Sangat Rendah" as CalculatedRiskLevelCategory, range: "Sangat Rendah"},
          ].map(item => (
            <div key={item.level} className="flex items-center space-x-1">
              <Badge className={`${getRiskLevelColor(item.level)} min-w-[60px] sm:min-w-[80px] justify-center text-[8px] px-1 py-0 h-4 leading-none`}>{item.range}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

