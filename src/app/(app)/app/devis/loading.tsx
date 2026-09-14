import { Skeleton } from '@/components/ui/misc';

export default function QuotesLoading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-[10px]" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-full max-w-sm rounded-[10px]" />
        <Skeleton className="h-8 w-80 rounded-full" />
      </div>
      <Skeleton className="h-[420px] rounded-[16px]" />
    </div>
  );
}
