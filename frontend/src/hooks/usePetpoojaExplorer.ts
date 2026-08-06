import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, ExplorerApiType, ExplorerResult } from '@/types/api';

export interface ExplorerFetchInput {
  apiType: ExplorerApiType;
  outletIds: string[];
  fromDate: string;
  toDate: string;
}

export function usePetpoojaExplorer() {
  return useMutation({
    mutationFn: async (input: ExplorerFetchInput) => {
      const res = await apiClient.post<ApiEnvelope<ExplorerResult>>('/petpooja-explorer/fetch', input);
      return res.data.data;
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Explorer fetch failed';
      toast.error(message);
    },
  });
}
