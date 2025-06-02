
"use client";

import type { RiskCause, LikelihoodLevelDesc, ImpactLevelDesc, CalculatedRiskLevelCategory } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Settings2, BarChart3, Trash2 } from 'lucide-react';
import { LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, getCalculatedRiskLevel, getRiskLevelColor } from '@/lib/types'; // Corrected import
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RiskCauseCardItemProps {
  riskCause: RiskCause;
  potentialRiskFullCode: string; 
  onAnalyze: (causeId: string) => void;
  onDelete: (causeId: string) => void;
  returnPath: string;
  canDelete: boolean; 
}

export function RiskCauseCardItem({ riskCause, potentialRiskFullCode, onAnalyze, onDelete, returnPath, canDelete }: RiskCauseCardItemProps) {
  const causeCode = `${potentialRiskFullCode}.PC${riskCause.sequenceNumber || '?'}`;
  const { level: causeRiskLevelText, score: causeRiskScore } = getCalculatedRiskLevel(riskCause.likelihood, riskCause.impact);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-semibold leading-tight flex-grow min-w-0 mr-2" title={riskCause.description}>
            {causeCode} - {riskCause.description}
          </CardTitle>
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Opsi penyebab risiko" className="h-7 w-7">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAnalyze(riskCause.id)}>
                  <BarChart3 className="mr-2 h-4 w-4" /> Analisis Detail
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(riskCause.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={!canDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardDescription className="pt-1 text-xs text-muted-foreground">
          Sumber: <Badge variant="outline" className="text-xs">{riskCause.source}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 pt-1 pb-3 text-xs flex-grow">
        <div>
          <p className="font-medium text-foreground">KRI:</p>
          <p className="text-muted-foreground line-clamp-2" title={riskCause.keyRiskIndicator || '-'}>{riskCause.keyRiskIndicator || '-'}</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Toleransi Risiko:</p>
          <p className="text-muted-foreground line-clamp-2" title={riskCause.riskTolerance || '-'}>{riskCause.riskTolerance || '-'}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div>
            <p className="font-medium text-foreground">Kemungkinan:</p>
            <Badge variant={riskCause.likelihood ? "outline" : "ghost"} className={`text-[10px] ${!riskCause.likelihood ? "text-muted-foreground" : ""}`}>
              {riskCause.likelihood ? `${riskCause.likelihood}` : 'N/A'}
            </Badge>
          </div>
          <div>
            <p className="font-medium text-foreground">Dampak:</p>
            <Badge variant={riskCause.impact ? "outline" : "ghost"} className={`text-[10px] ${!riskCause.impact ? "text-muted-foreground" : ""}`}>
              {riskCause.impact ? `${riskCause.impact}` : 'N/A'}
            </Badge>
          </div>
          <div>
            <p className="font-medium text-foreground">Tingkat Risiko:</p>
            <Badge className={`${getRiskLevelColor(causeRiskLevelText)} text-[10px]`}>
              {causeRiskLevelText === 'N/A' ? 'N/A' : `${causeRiskLevelText} (${causeRiskScore || 'N/A'})`}
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-3">
        <Link href={`/risk-cause-analysis/${riskCause.id}?from=${encodeURIComponent(returnPath)}`} className="w-full">
            <Button variant="outline" size="sm" className="w-full text-xs">
                 <BarChart3 className="mr-2 h-3 w-3" /> Analisis Detail Penyebab
            </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

