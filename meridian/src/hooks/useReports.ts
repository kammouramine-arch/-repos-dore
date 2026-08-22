import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteReport, fetchLatestReport, fetchReports, type AiReport } from '@/services/reports';
import { useCachedQuery } from './useCachedQuery';

export function useReports(kind?: AiReport['kind']) {
  return useCachedQuery(['reports', kind ?? 'all'], `reports.${kind ?? 'all'}`, () =>
    fetchReports(kind),
  );
}

export function useLatestReport(kind: AiReport['kind']) {
  return useCachedQuery(['report', kind], `report.${kind}`, () => fetchLatestReport(kind));
}

export function useReportActions() {
  const client = useQueryClient();
  return {
    remove: useMutation({
      mutationFn: (id: string) => deleteReport(id),
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: ['reports'] });
        void client.invalidateQueries({ queryKey: ['report'] });
      },
    }),
  };
}
