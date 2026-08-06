import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, SyncLogRow, SyncType } from '@/types/api';

export function useSyncLogs() {
  return useQuery({
    queryKey: ['sync-logs'],
    queryFn: async () => (await apiClient.get<ApiEnvelope<SyncLogRow[]>>('/sync/logs', { params: { limit: 20 } })).data.data,
    refetchInterval: 15_000,
  });
}

export function useTriggerManualSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (syncType: SyncType) => apiClient.post('/sync/manual', { syncType }),
    onSuccess: (_data, syncType) => {
      toast.success(`${syncType} sync completed`);
      qc.invalidateQueries({ queryKey: ['sync-logs'] });
      qc.invalidateQueries({ queryKey: ['settings', 'sync-schedule'] });
    },
    onError: (_err, syncType) => toast.error(`${syncType} sync failed`),
  });
}
