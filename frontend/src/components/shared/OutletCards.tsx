'use client';

import { Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useOutlets } from '@/hooks/useOutlets';
import { useFilterStore } from '@/store/filterStore';

export interface OutletCardsProps {
  /**
   * Only show outlets where this field is set — e.g. 'salesSyncCode' on the Sales
   * page, since only those outlets can ever have real synced Sale data. Omit to
   * show every outlet.
   */
  eligibleField?: 'salesSyncCode' | 'inventorySyncCode';
}

export function OutletCards({ eligibleField }: OutletCardsProps = {}) {
  const { data: allOutlets, isLoading } = useOutlets();
  const { outletId, setOutletId } = useFilterStore();

  if (isLoading || !allOutlets) return null;

  const outlets = eligibleField ? allOutlets.filter((o) => o[eligibleField]) : allOutlets;

  return (
    <div className="flex flex-wrap gap-2">
      <OutletCard
        label="All Outlets"
        sublabel={`${outlets.length} outlets`}
        active={outletId === 'all'}
        onClick={() => setOutletId('all')}
      />
      {outlets.map((o) => (
        <OutletCard
          key={o.id}
          label={o.name}
          sublabel={[o.brand, o.city].filter(Boolean).join(' · ')}
          active={outletId === o.id}
          onClick={() => setOutletId(o.id)}
        />
      ))}
    </div>
  );
}

function OutletCard({
  label,
  sublabel,
  active,
  onClick,
}: {
  label: string;
  sublabel?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className={cn(
        'w-[150px] cursor-pointer select-none transition-colors hover:border-primary/50',
        active ? 'border-primary bg-primary/5' : 'border-border'
      )}
    >
      <CardContent className="flex items-center gap-2 p-3">
        <Store className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
        <div className="min-w-0">
          <div className={cn('truncate text-sm font-medium', active && 'text-primary')}>{label}</div>
          {sublabel && <div className="truncate text-xs text-muted-foreground">{sublabel}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
