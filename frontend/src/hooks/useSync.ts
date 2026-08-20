import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, SyncLogRow, SyncType } from '@/types/api';

export function useSyncLogs() {
  return useQuery({
    queryKey: ['sync-logs'],
    // Fetched once as a flat capped list (no server-side page param on this endpoint) and
    // paginated client-side — see usePagedList usage in settings/sync/page.tsx.
    queryFn: async () => (await apiClient.get<ApiEnvelope<SyncLogRow[]>>('/sync/logs', { params: { limit: 100 } })).data.data,
    refetchInterval: 15_000,
  });
}

export function useTriggerManualSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (syncType: SyncType) => apiClient.post('/sync/manual', { syncType }),
    onSuccess: (_data, syncType) => {
      // The trigger now runs in the background (see sync.controller.ts) — this response
      // just confirms it started, not that it finished. Progress/results show up in the
      // Recent Sync Runs table via useSyncLogs' 15s poll.
      toast.success(`${syncType} sync started — check Recent Sync Runs for progress`);
      qc.invalidateQueries({ queryKey: ['sync-logs'] });
      qc.invalidateQueries({ queryKey: ['settings', 'sync-schedule'] });
    },
    onError: (_err, syncType) => toast.error(`${syncType} sync failed to start`),
  });
}
