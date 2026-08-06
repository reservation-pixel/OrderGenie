'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useSettings';

const OPTIONS = [
  { key: 'lowStockAlerts' as const, label: 'Low Stock Alerts', description: 'Notify when inventory items fall below their threshold.' },
  { key: 'syncFailureAlerts' as const, label: 'Sync Failure Alerts', description: 'Notify when a Petpooja sync run fails.' },
  { key: 'dailySummaryEmail' as const, label: 'Daily Summary Email', description: 'Send a daily digest of sales and operations.' },
];

export default function NotificationsPage() {
  const { data, isLoading, isError } = useNotificationSettings();
  const update = useUpdateNotificationSettings();

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError || !data) return <p className="text-sm text-destructive">Failed to load notification preferences.</p>;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Notification Preferences</CardTitle>
        <CardDescription>Choose which alerts you want to receive.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {OPTIONS.map((opt) => (
          <div key={opt.key} className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor={opt.key}>{opt.label}</Label>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
            <Switch
              id={opt.key}
              checked={data[opt.key]}
              onCheckedChange={(checked) => update.mutate({ [opt.key]: checked })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
