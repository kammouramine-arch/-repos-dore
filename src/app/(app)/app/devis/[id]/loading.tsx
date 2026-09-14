import { Skeleton } from '@/components/ui/misc';

export default function QuoteLoading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-64 rounded-[10px]" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[480px] rounded-[16px]" />
        <div className="space-y-4">
          <Skeleton className="h-[180px] rounded-[16px]" />
          <Skeleton className="h-[140px] rounded-[16px]" />
        </div>
      </div>
    </div>
  );
}
