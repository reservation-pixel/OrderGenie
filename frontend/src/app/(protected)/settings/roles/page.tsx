'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoles, useUpdateRole } from '@/hooks/useSettings';

export default function RolesPage() {
  const { data: roles, isLoading, isError } = useRoles();
  const update = useUpdateRole();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError || !roles) return <p className="text-sm text-destructive">Failed to load roles.</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {roles.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <CardTitle className="text-base">{r.name.replace('_', ' ')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              value={drafts[r.id] ?? r.description ?? ''}
              onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
              onBlur={() => {
                if (drafts[r.id] !== undefined && drafts[r.id] !== r.description) {
                  update.mutate({ id: r.id, description: drafts[r.id] });
                }
              }}
              placeholder="Description"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
