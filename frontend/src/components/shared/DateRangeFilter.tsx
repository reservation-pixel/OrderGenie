'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useFilterStore } from '@/store/filterStore';

export function DateRangeFilter() {
  const { customFrom, customTo, setCustomRange } = useFilterStore();
  const [draftFrom, setDraftFrom] = useState(customFrom ?? '');
  const [draftTo, setDraftTo] = useState(customTo ?? '');

  const dirty = draftFrom !== (customFrom ?? '') || draftTo !== (customTo ?? '');

  function handleFetch() {
    if (draftFrom && draftTo) {
      setCustomRange(draftFrom, draftTo);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="from-date" className="text-xs text-muted-foreground">
          Start Date
        </Label>
        <input
          id="from-date"
          type="date"
          value={draftFrom}
          max={draftTo || undefined}
          onChange={(e) => setDraftFrom(e.target.value)}
          className="flex h-9 w-[150px] rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to-date" className="text-xs text-muted-foreground">
          End Date
        </Label>
        <input
          id="to-date"
          type="date"
          value={draftTo}
          min={draftFrom || undefined}
          onChange={(e) => setDraftTo(e.target.value)}
          className="flex h-9 w-[150px] rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
        />
      </div>
      <Button size="sm" disabled={!draftFrom || !draftTo} onClick={handleFetch} variant={dirty ? 'default' : 'outline'}>
        <RefreshCw className="mr-1 h-4 w-4" />
        Fetch
      </Button>
    </div>
  );
}
