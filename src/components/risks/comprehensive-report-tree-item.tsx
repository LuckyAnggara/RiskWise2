
"use client";

import React, { useState, useEffect } from 'react';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure, CalculatedRiskLevelCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronRight, Target, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { Badge } from '@/components/ui/badge';
import { getControlTypeName, getCalculatedRiskLevel, getRiskLevelColor } from '@/lib/types';

type ReportItem = Goal | PotentialRisk | RiskCause | ControlMeasure;
type ItemType = 'goal' | 'potentialRisk' | 'riskCause' | 'controlMeasure';

interface ComprehensiveReportTreeItemProps {
  item: ReportItem;
  itemType: ItemType;
  level: number;
  userId: string;
  period: string;
  parentGoalCode?: string; // Pass down from parent
  parentPotentialRiskCode?: string; // Pass down from parent
}

export function ComprehensiveReportTreeItem({ 
  item, 
  itemType, 
  level, 
  userId, 
  period,
  parentGoalCode,
  parentPotentialRiskCode 
}: ComprehensiveReportTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [children, setChildren] = useState<ReportItem[]>([]);
  const [childrenType, setChildrenType] = useState<ItemType | null>(null);

  const potentialRisksFromStore = useAppStore(state => state.potentialRisks);
  const riskCausesFromStore = useAppStore(state => state.riskCauses);
  const controlMeasuresFromStore = useAppStore(state => state.controlMeasures);

  const loadChildren = async () => {
    if (isLoadingChildren || (children.length > 0 && isExpanded)) return;

    setIsLoadingChildren(true);
    let fetchedChildren: ReportItem[] = [];
    let nextItemType: ItemType | null = null;

    try {
      // Simulate async fetch delay for demonstration if needed
      // await new Promise(resolve => setTimeout(resolve, 500));

      switch (itemType) {
        case 'goal':
          const prsForGoal = potentialRisksFromStore.filter(
            pr => pr.goalId === item.id && pr.userId === userId && pr.period === period
          ).sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
          fetchedChildren = prsForGoal;
          nextItemType = 'potentialRisk';
          break;
        case 'potentialRisk':
          const rcsForPR = riskCausesFromStore.filter(
            rc => rc.potentialRiskId === item.id && rc.userId === userId && rc.period === period
          ).sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
          fetchedChildren = rcsForPR;
          nextItemType = 'riskCause';
          break;
        case 'riskCause':
          const cmsForRC = controlMeasuresFromStore.filter(
            cm => cm.riskCauseId === item.id && cm.userId === userId && cm.period === period
          ).sort((a,b) => (a.controlType.localeCompare(b.controlType) || (a.sequenceNumber || 0) - (b.sequenceNumber || 0)));
          fetchedChildren = cmsForRC;
          nextItemType = 'controlMeasure';
          break;
        default:
          break;
      }
      setChildren(fetchedChildren);
      setChildrenType(nextItemType);
    } catch (error) {
      console.error(`Error loading children for ${itemType} ${item.id}:`, error);
    } finally {
      setIsLoadingChildren(false);
    }
  };

  const handleToggleExpand = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    if (newExpandedState && children.length === 0 && itemType !== 'controlMeasure') {
      loadChildren();
    }
  };

  const canExpand = itemType !== 'controlMeasure';
  
  const getIcon = () => {
    switch (itemType) {
      case 'goal': return <Target className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />;
      case 'potentialRisk': return <ShieldAlert className="h-4 w-4 mr-2 text-red-600 flex-shrink-0" />;
      case 'riskCause': return <AlertTriangle className="h-4 w-4 mr-2 text-orange-500 flex-shrink-0" />;
      case 'controlMeasure': return <ShieldCheck className="h-4 w-4 mr-2 text-green-600 flex-shrink-0" />;
      default: return null;
    }
  };

  const getItemDisplay = () => {
    switch (itemType) {
      case 'goal':
        const goal = item as Goal;
        return <span className="font-semibold">{goal.code || 'S?'} - {goal.name}</span>;
      case 'potentialRisk':
        const pr = item as PotentialRisk;
        const prFullCode = `${parentGoalCode || 'S?'}.PR${pr.sequenceNumber || '?'}`;
        return <>{prFullCode}: {pr.description} {pr.category && <Badge variant="outline" className="ml-2 text-xs">{pr.category}</Badge>}</>;
      case 'riskCause':
        const rc = item as RiskCause;
        const rcFullCode = `${parentPotentialRiskCode || 'PR?'}.PC${rc.sequenceNumber || '?'}`;
        const { level: rcLevel, score: rcScore } = getCalculatedRiskLevel(rc.likelihood, rc.impact);
        return (
          <>
            {rcFullCode}: {rc.description} (Sumber: <Badge variant="outline" className="text-xs">{rc.source}</Badge>)
            {rcLevel !== 'N/A' && (
              <Badge className={`${getRiskLevelColor(rcLevel)} text-xs ml-2`}>
                {rcLevel} ({rcScore})
              </Badge>
            )}
          </>
        );
      case 'controlMeasure':
        const cm = item as ControlMeasure;
        // Assuming parentRiskCauseCode is passed for CM or derived for full code.
        // For simplicity here, just using its own type and sequence.
        const cmCode = `${cm.controlType}.${cm.sequenceNumber || '?'}`;
        return <>{cmCode}: {cm.description} <Badge variant="outline" className="ml-2 text-xs">{getControlTypeName(cm.controlType)}</Badge></>;
      default:
        return 'Unknown Item';
    }
  };
  
  const currentGoalCode = itemType === 'goal' ? (item as Goal).code : parentGoalCode;
  const currentPotentialRiskCode = itemType === 'potentialRisk' 
    ? `${currentGoalCode || 'S?'}.PR${(item as PotentialRisk).sequenceNumber || '?'}` 
    : parentPotentialRiskCode;


  return (
    <div 
      className="border-l-2 border-muted-foreground/20 pl-2"
      style={{ marginLeft: `${level * 1}rem` }}
    >
      <div className="flex items-center p-2 hover:bg-muted/50 rounded-md cursor-pointer group">
        {canExpand && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleExpand}
            className="h-6 w-6 mr-1"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Ciutkan" : "Perluas"}
          >
            {isLoadingChildren ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
        {!canExpand && <div className="w-7 mr-1 flex-shrink-0"></div>}
        
        {getIcon()}
        <div className="flex-grow text-sm" onClick={canExpand ? handleToggleExpand : undefined}>
          {getItemDisplay()}
        </div>
      </div>
      {isExpanded && children.length > 0 && childrenType && (
        <div className="mt-1">
          {children.map(child => (
            <ComprehensiveReportTreeItem
              key={child.id}
              item={child}
              itemType={childrenType}
              level={level + 1}
              userId={userId}
              period={period}
              parentGoalCode={currentGoalCode}
              parentPotentialRiskCode={currentPotentialRiskCode}
            />
          ))}
        </div>
      )}
      {isExpanded && !isLoadingChildren && children.length === 0 && itemType !== 'controlMeasure' && (
        <p className="pl-8 text-xs text-muted-foreground italic py-1">Tidak ada data turunan.</p>
      )}
    </div>
  );
}
