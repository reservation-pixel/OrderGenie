'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
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
      <DateRangePicker
        from={draftFrom}
        to={draftTo}
        onChange={(nextFrom, nextTo) => {
          setDraftFrom(nextFrom);
          setDraftTo(nextTo);
        }}
      />
      <Button size="sm" disabled={!draftFrom || !draftTo} onClick={handleFetch} variant={dirty ? 'default' : 'outline'}>
        <RefreshCw className="mr-1 h-4 w-4" />
        Fetch
      </Button>
    </div>
  );
}
