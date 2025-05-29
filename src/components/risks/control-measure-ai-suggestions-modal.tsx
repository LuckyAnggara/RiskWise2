
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, CheckCircle } from 'lucide-react';
import type { ControlMeasureTypeKey } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { getControlTypeName } from '@/lib/types';

export interface AISuggestedControlMeasure {
  description: string;
  suggestedControlType: ControlMeasureTypeKey;
  justification: string;
}

interface ControlMeasureAISuggestionsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: AISuggestedControlMeasure[];
  onApplySuggestion: (suggestion: AISuggestedControlMeasure) => void;
}

export function ControlMeasureAISuggestionsModal({
  isOpen,
  onOpenChange,
  suggestions,
  onApplySuggestion,
}: ControlMeasureAISuggestionsModalProps) {

  if (!isOpen || !suggestions) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Saran Tindakan Pengendalian dari AI</DialogTitle>
          <DialogDescription>
            Berikut adalah beberapa saran tindakan pengendalian berdasarkan konteks risiko. Pilih salah satu untuk diterapkan ke formulir.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1 pr-3">
          <div className="space-y-4 py-4">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">AI tidak memberikan saran untuk konteks ini.</p>
            ) : (
              suggestions.map((suggestion, index) => (
                <Alert key={index} className="flex flex-col items-start">
                  <div className="flex w-full items-start">
                    <Wand2 className="h-5 w-5 mr-3 mt-1 flex-shrink-0" />
                    <div className="flex-grow">
                      <AlertTitle className="font-semibold mb-1">Saran #{index + 1}: <Badge variant="outline" className="ml-1 text-xs">{getControlTypeName(suggestion.suggestedControlType)} ({suggestion.suggestedControlType})</Badge></AlertTitle>
                      <AlertDescription className="text-sm space-y-1">
                        <p><strong>Deskripsi:</strong> {suggestion.description}</p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Justifikasi:</strong> {suggestion.justification}
                        </p>
                      </AlertDescription>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 self-end text-xs" 
                    onClick={() => {
                      onApplySuggestion(suggestion);
                      onOpenChange(false);
                    }}
                  >
                    <CheckCircle className="mr-2 h-3 w-3"/> Terapkan Saran Ini
                  </Button>
                </Alert>
              ))
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
