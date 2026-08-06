import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { triggerBlobDownload } from '@/lib/download';
import { useRangeParams } from '@/hooks/useRangeParams';

const EXTENSIONS: Record<string, string> = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

export function useReportDownload() {
  const rangeParams = useRangeParams();

  return useMutation({
    mutationFn: async ({ type, format }: { type: string; format: 'csv' | 'excel' | 'pdf' }) => {
      const res = await apiClient.get('/reports', {
        params: { type, format, ...rangeParams },
        responseType: 'blob',
      });
      triggerBlobDownload(res.data as Blob, `${type}-${new Date().toISOString().slice(0, 10)}.${EXTENSIONS[format]}`);
    },
    onError: () => toast.error('Failed to generate report'),
  });
}
