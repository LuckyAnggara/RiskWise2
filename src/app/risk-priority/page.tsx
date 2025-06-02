
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Settings2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import type { Goal, PotentialRisk, RiskCause, LikelihoodLevelDesc, ImpactLevelDesc, RiskCategory, CalculatedRiskLevelCategory } from '@/lib/types';
import { LIKELIHOOD_LEVELS_DESC_MAP, IMPACT_LEVELS_DESC_MAP, getCalculatedRiskLevel, getRiskLevelColor } from '@/lib/types'; // Corrected import
import { useAuth } from '@/contexts/auth-context';
import { getGoals } from '@/services/goalService';
import { getPotentialRisksByGoalId } from '@/services/potentialRiskService';
import { getRiskCausesByPotentialRiskId } from '@/services/riskCauseService';
import { RiskPriorityMatrix } from '@/components/risks/risk-priority-matrix';


interface AnalyzedRiskCause extends RiskCause {
  potentialRiskDescription: string;
  potentialRiskCategory: RiskCategory | null;
  goalName: string;
  goalCode: string;
  potentialRiskSequenceNumber: number;
  riskScore: number | null;
  riskLevelText: CalculatedRiskLevelCategory | 'N/A';
  goalId: string;
}

type SortableRiskCauseKeys = 'riskScore' | 'likelihood' | 'impact' | 'description';

export default function RiskPriorityPage() {
  const { currentUser, appUser, loading: authLoading, profileLoading, isProfileComplete } = useAuth();
  const [analyzedRiskCauses, setAnalyzedRiskCauses] = useState<AnalyzedRiskCause[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortableRiskCauseKeys>('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedCauseId, setExpandedCauseId] = useState<string | null>(null);
  const router = useRouter();


  const currentUserId = useMemo(() => appUser?.uid || null, [appUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || "...", [appUser]);


  const loadData = useCallback(async () => {
    if (!currentUserId || !currentPeriod || !isProfileComplete) {
      console.log("[RiskPriorityPage] loadData: Bailing out due to missing userId, period, or incomplete profile.", { currentUserId, currentPeriod, isProfileComplete });
      setIsLoading(false);
      setAnalyzedRiskCauses([]);
      return;
    }
    console.log(`[RiskPriorityPage] loadData: Starting for UserID: ${currentUserId}, Period: ${currentPeriod}`);
    setIsLoading(true);
    try {
      const goalsResult = await getGoals(currentUserId, currentPeriod);
      let loadedGoals: Goal[] = [];
      if (goalsResult.success && goalsResult.goals) {
        loadedGoals = goalsResult.goals;
      }
      console.log(`[RiskPriorityPage] loadData: Found ${loadedGoals.length} goals.`);

      let collectedAnalyzedRiskCauses: AnalyzedRiskCause[] = [];

      for (const goal of loadedGoals) {
        console.log(`[RiskPriorityPage] loadData: Processing Goal ID: ${goal.id}`);
        const potentialRisks = await getPotentialRisksByGoalId(goal.id, currentUserId, currentPeriod);
        console.log(`[RiskPriorityPage] loadData: Found ${potentialRisks.length} potential risks for Goal ID: ${goal.id}`);
        for (const pRisk of potentialRisks) {
          console.log(`[RiskPriorityPage] loadData: Processing PotentialRisk ID: ${pRisk.id}`);
          const pRiskCauses = await getRiskCausesByPotentialRiskId(pRisk.id, currentUserId, currentPeriod);
          console.log(`[RiskPriorityPage] loadData: Found ${pRiskCauses.length} risk causes for PotentialRisk ID: ${pRisk.id}`);
          pRiskCauses.forEach(cause => {
            console.log(`[RiskPriorityPage] loadData: Checking Cause ID: ${cause.id}, Likelihood: ${cause.likelihood}, Impact: ${cause.impact}`);
            if (cause.likelihood && cause.impact) {
              const { level, score } = getCalculatedRiskLevel(cause.likelihood, cause.impact);
              console.log(`[RiskPriorityPage] loadData: Cause ID: ${cause.id} is ANALYZED. Level: ${level}, Score: ${score}`);
              collectedAnalyzedRiskCauses.push({
                ...cause,
                potentialRiskDescription: pRisk.description,
                potentialRiskCategory: pRisk.category,
                potentialRiskSequenceNumber: pRisk.sequenceNumber,
                goalName: goal.name,
                goalCode: goal.code || '',
                goalId: goal.id,
                riskScore: score,
                riskLevelText: level,
              });
            } else {
              console.log(`[RiskPriorityPage] loadData: Cause ID: ${cause.id} is NOT analyzed (missing likelihood or impact).`);
            }
          });
        }
      }
      console.log(`[RiskPriorityPage] loadData: Total collected ANALYZED risk causes: ${collectedAnalyzedRiskCauses.length}`);
      setAnalyzedRiskCauses(collectedAnalyzedRiskCauses);
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[RiskPriorityPage] Error loading data:", errorMessage);
      setAnalyzedRiskCauses([]);
    } finally {
      console.log("[RiskPriorityPage] loadData: Finished. Setting isLoading to false.");
      setIsLoading(false);
    }
  }, [currentUserId, currentPeriod, isProfileComplete]);

  useEffect(() => {
    if (!authLoading && !profileLoading && isProfileComplete && currentUserId && currentPeriod) {
      console.log("[RiskPriorityPage] useEffect: Context ready, calling loadData.");
      loadData();
    } else if (!authLoading && !profileLoading && (!isProfileComplete || !currentUserId || !currentPeriod)) {
        console.log("[RiskPriorityPage] useEffect: Context not fully ready or profile incomplete, clearing data.");
        setIsLoading(false);
        setAnalyzedRiskCauses([]);
    }
  }, [authLoading, profileLoading, isProfileComplete, currentUserId, currentPeriod, loadData]);

  const sortedRiskCauses = useMemo(() => {
    if (!Array.isArray(analyzedRiskCauses)) return [];
    return [...analyzedRiskCauses].sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortKey) {
        case 'riskScore':
          valA = a.riskScore ?? -1;
          valB = b.riskScore ?? -1;
          break;
        case 'likelihood':
          valA = a.likelihood ? (LIKELIHOOD_LEVELS_DESC_MAP[a.likelihood] ?? 0) : 0;
          valB = b.likelihood ? (LIKELIHOOD_LEVELS_DESC_MAP[b.likelihood] ?? 0) : 0;
          break;
        case 'impact':
          valA = a.impact ? (IMPACT_LEVELS_DESC_MAP[a.impact] ?? 0) : 0;
          valB = b.impact ? (IMPACT_LEVELS_DESC_MAP[b.impact] ?? 0) : 0;
          break;
        case 'description':
          valA = a.description.toLowerCase();
          valB = b.description.toLowerCase();
          break;
        default:
          return 0;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [analyzedRiskCauses, sortKey, sortOrder]);

  const handleSort = (key: SortableRiskCauseKeys) => {
    if (sortKey === key) {
      setSortOrder(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const SortIndicator = ({ columnKey }: { columnKey: SortableRiskCauseKeys }) => {
    if (sortKey !== columnKey) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1 inline" /> : <ChevronDown className="h-4 w-4 ml-1 inline" />;
  };

  const toggleExpandCause = (causeId: string) => {
    setExpandedCauseId(currentId => (currentId === causeId ? null : causeId));
  };


  if (authLoading || profileLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          {authLoading || profileLoading ? "Memuat data pengguna..." : "Memuat data prioritas risiko..."}
        </p>
      </div>
    );
  }

  if (!currentUser || !isProfileComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <ShieldCheck className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">
          { !currentUser ? "Silakan login untuk melihat halaman ini." : "Harap lengkapi profil Anda di Pengaturan untuk mengakses modul ini."}
        </p>
         {!currentUser && <Button onClick={() => router.push('/login')} className="mt-4">Ke Halaman Login</Button>}
         {currentUser && !isProfileComplete && <Button onClick={() => router.push('/settings')} className="mt-4">Ke Pengaturan</Button>}
      </div>
    );
  }
  
  const returnPath = "/risk-priority";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prioritas Risiko"
        description={`Visualisasi dan daftar penyebab risiko yang telah dianalisis untuk UPR: ${uprDisplayName}, Periode: ${currentPeriod || '...'}.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Matriks Profil Risiko (Heatmap Penyebab Risiko)</CardTitle>
        </CardHeader>
        <CardContent>
          {analyzedRiskCauses.length > 0 ? (
            <RiskPriorityMatrix riskCauses={analyzedRiskCauses} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada penyebab risiko yang dianalisis untuk ditampilkan di matriks.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Penyebab Risiko Teranalisis ({sortedRiskCauses.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedRiskCauses.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-8">Tidak ada penyebab risiko yang telah dianalisis.</p>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] sticky left-0 bg-background z-10"></TableHead>
                    <TableHead className="min-w-[100px] sticky left-10 bg-background z-10 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('description')}>
                      <div className="flex items-center">Penyebab Risiko <SortIndicator columnKey="description" /></div>
                    </TableHead>
                    <TableHead className="min-w-[150px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('riskScore')}>
                       <div className="flex items-center">Tingkat Risiko <SortIndicator columnKey="riskScore" /></div>
                    </TableHead>
                    <TableHead className="min-w-[180px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('likelihood')}>
                       <div className="flex items-center">Kemungkinan <SortIndicator columnKey="likelihood" /></div>
                    </TableHead>
                    <TableHead className="min-w-[180px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('impact')}>
                       <div className="flex items-center">Dampak <SortIndicator columnKey="impact" /></div>
                    </TableHead>
                    <TableHead className="text-right w-[120px] sticky right-0 bg-background z-10">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRiskCauses.map((cause) => {
                    const isExpanded = expandedCauseId === cause.id;
                    const causeFullCode = `${cause.goalCode || 'S?'}.PR${cause.potentialRiskSequenceNumber || '?'}.PC${cause.sequenceNumber || '?'}`;
                    
                    return (
                      <React.Fragment key={cause.id}>
                        <TableRow>
                           <TableCell className="sticky left-0 bg-background z-10">
                            <Button variant="ghost" size="icon" onClick={() => toggleExpandCause(cause.id)} aria-label={isExpanded ? "Sembunyikan detail" : "Tampilkan detail"} className="h-8 w-8">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium text-xs max-w-xs truncate sticky left-10 bg-background z-10" title={cause.description}>
                            <span className="font-mono text-muted-foreground mr-1">{causeFullCode}</span> - {cause.description}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getRiskLevelColor(cause.riskLevelText)} text-xs`}>
                              {cause.riskLevelText === 'N/A' ? 'N/A' : `${cause.riskLevelText} (${cause.riskScore || 'N/A'})`}
                            </Badge>
                          </TableCell>
                           <TableCell>
                              <Badge variant={cause.likelihood ? "outline" : "ghost"} className={`text-xs ${!cause.likelihood ? "text-muted-foreground" : ""}`}>
                                  {cause.likelihood || 'N/A'}
                              </Badge>
                          </TableCell>
                          <TableCell>
                              <Badge variant={cause.impact ? "outline" : "ghost"} className={`text-xs ${!cause.impact ? "text-muted-foreground" : ""}`}>
                                  {cause.impact || 'N/A'}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-right sticky right-0 bg-background z-10">
                             <Link href={`/risk-cause-analysis/${cause.id}?from=${encodeURIComponent(returnPath)}`}>
                              <Button variant="outline" size="sm" className="text-xs">
                                <BarChart3 className="mr-1 h-3 w-3" /> Analisis/Kontrol
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/10 hover:bg-muted/20">
                            <TableCell className="sticky left-0 bg-muted/10 z-10"></TableCell>
                            <TableCell colSpan={5} className="p-3 text-xs sticky left-10 bg-muted/10 z-10">
                              <div className="space-y-1">
                                <div><strong>Deskripsi Lengkap Penyebab:</strong> {cause.description}</div>
                                <Separator className="my-1"/>
                                <div><strong>Potensi Risiko Induk (PR{cause.potentialRiskSequenceNumber || '?'}):</strong> {cause.potentialRiskDescription} 
                                  {cause.potentialRiskCategory && <Badge variant="secondary" className="ml-2 text-[10px]">{cause.potentialRiskCategory}</Badge>}
                                </div>
                                <div><strong>Sasaran Terkait ({cause.goalCode || 'S?'}):</strong> {cause.goalName}</div>
                                <Separator className="my-1"/>
                                <div><strong>Key Risk Indicator (KRI):</strong> {cause.keyRiskIndicator || <span className="italic text-muted-foreground">Belum ditetapkan</span>}</div>
                                <div><strong>Toleransi Risiko:</strong> {cause.riskTolerance || <span className="italic text-muted-foreground">Belum ditetapkan</span>}</div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    
