import { Skeleton } from '@/components/ui/skeleton';

export default function YieldAgentLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 mt-2" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  );
}
