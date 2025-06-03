
"use client";

import React, { useState, useEffect } from 'react';
import type { Goal, PotentialRisk, RiskCause, ControlMeasure } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronRight, Target, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { Badge } from '@/components/ui/badge';
import { getControlTypeName } from '@/lib/types';

type ReportItem = Goal | PotentialRisk | RiskCause | ControlMeasure;
type ItemType = 'goal' | 'potentialRisk' | 'riskCause' | 'controlMeasure';

interface ComprehensiveReportTreeItemProps {
  item: ReportItem;
  itemType: ItemType;
  level: number;
  userId: string;
  period: string;
}

export function ComprehensiveReportTreeItem({ item, itemType, level, userId, period }: ComprehensiveReportTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [children, setChildren] = useState<ReportItem[]>([]);
  const [childrenType, setChildrenType] = useState<ItemType | null>(null);

  // Mengambil fungsi fetch dari store
  const fetchPotentialRisksForGoal = useAppStore(state => state.getPotentialRiskById); // Ini salah, harusnya get by goalId
  const getPotentialRisksByGoalIdFromStore = useAppStore(state => state.potentialRisks); // asumsikan ini array
  const fetchRiskCausesForPotentialRisk = useAppStore(state => state.getRiskCauseById); // Ini salah, harusnya get by PR Id
  const getRiskCausesByPRIdFromStore = useAppStore(state => state.riskCauses); // asumsikan ini array
  const fetchControlMeasuresForRiskCause = useAppStore(state => state.getControlMeasureById); // Ini salah, harusnya get by RC Id
  const getControlMeasuresByRCIdFromStore = useAppStore(state => state.controlMeasures); // asumsikan ini array


  const loadChildren = async () => {
    if (isLoadingChildren || (children.length > 0 && isExpanded)) return; // Don't load if already loading or children loaded

    setIsLoadingChildren(true);
    let fetchedChildren: ReportItem[] = [];
    let nextItemType: ItemType | null = null;

    try {
      switch (itemType) {
        case 'goal':
          // Ambil semua PR untuk goal ini. Filter dari store.
          const prsFromStore = getPotentialRisksByGoalIdFromStore.filter(
            pr => pr.goalId === item.id && pr.userId === userId && pr.period === period
          );
          fetchedChildren = prsFromStore.sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
          nextItemType = 'potentialRisk';
          break;
        case 'potentialRisk':
          // Ambil semua RC untuk PR ini. Filter dari store.
          const rcsFromStore = getRiskCausesByPRIdFromStore.filter(
            rc => rc.potentialRiskId === item.id && rc.userId === userId && rc.period === period
          );
          fetchedChildren = rcsFromStore.sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
          nextItemType = 'riskCause';
          break;
        case 'riskCause':
          // Ambil semua CM untuk RC ini. Filter dari store.
          const cmsFromStore = getControlMeasuresByRCIdFromStore.filter(
            cm => cm.riskCauseId === item.id && cm.userId === userId && cm.period === period
          );
          fetchedChildren = cmsFromStore.sort((a,b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
          nextItemType = 'controlMeasure';
          break;
        default:
          break;
      }
      setChildren(fetchedChildren);
      setChildrenType(nextItemType);
    } catch (error) {
      console.error(`Error loading children for ${itemType} ${item.id}:`, error);
      // Handle error (e.g., show toast)
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
        return <span className="font-semibold">{goal.code} - {goal.name}</span>;
      case 'potentialRisk':
        const pr = item as PotentialRisk;
        const goalCodeForPR = (item as any).parentGoalCode || 'S?'; // Assuming parentGoalCode is passed or derived
        return `PR${pr.sequenceNumber || '?'}: ${pr.description} ${pr.category ? `(${pr.category})` : ''}`;
      case 'riskCause':
        const rc = item as RiskCause;
        const prCodeForRC = (item as any).parentPotentialRiskCode || 'PR?';
        return `PC${rc.sequenceNumber || '?'}: ${rc.description} (Sumber: ${rc.source})`;
      case 'controlMeasure':
        const cm = item as ControlMeasure;
        return `${cm.controlType}.${cm.sequenceNumber || '?'}: ${cm.description}`;
      default:
        return 'Unknown Item';
    }
  };
  
  const getFullItemCode = () => {
    // This is a simplified placeholder. A more robust solution would pass parent codes down.
    switch (itemType) {
      case 'goal': return (item as Goal).code;
      case 'potentialRisk': return `PR${(item as PotentialRisk).sequenceNumber || '?'}`;
      case 'riskCause': return `PC${(item as RiskCause).sequenceNumber || '?'}`;
      case 'controlMeasure': return `${(item as ControlMeasure).controlType}.${(item as ControlMeasure).sequenceNumber || '?'}`;
      default: return '';
    }
  }

  return (
    <div 
      className="border-l-2 border-muted-foreground/20 pl-2"
      style={{ marginLeft: `${level * 1}rem` }} // Indent based on level
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
        {!canExpand && <div className="w-7 mr-1 flex-shrink-0"></div> /* Placeholder for alignment */}
        
        {getIcon()}
        <div className="flex-grow text-sm" onClick={canExpand ? handleToggleExpand : undefined}>
          {getItemDisplay()}
          {itemType === 'controlMeasure' && (
            <Badge variant="outline" className="ml-2 text-xs">
              {getControlTypeName((item as ControlMeasure).controlType)}
            </Badge>
          )}
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

    