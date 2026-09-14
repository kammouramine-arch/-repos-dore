import { Skeleton } from '@/components/ui/misc';

/**
 * Squelette générique de l'espace : un en-tête, une rangée de cartes et une
 * liste. Épouse la forme réelle des pages pour que rien ne saute à l'arrivée.
 */
export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-[16px]" />
        ))}
      </div>
      <Skeleton className="h-[320px] rounded-[16px]" />
    </div>
  );
}
