import { Skeleton } from '@/components/ui/skeleton';

export default function SwapLoading() {
  return (
    <div className="flex justify-center pt-8">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-6 w-20" />
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-8 w-8 mx-auto rounded-full" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
