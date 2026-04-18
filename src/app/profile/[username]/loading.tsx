import FeedSkeleton from "@/components/feed/FeedSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="w-full space-y-6">
      <div className="border-b border-border bg-background">
        <Skeleton className="h-40 w-full rounded-none" />
        <div className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <Skeleton className="h-28 w-28 -translate-y-10 rounded-full border-[6px] border-background" />
              <div className="mb-4 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="mb-4">
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>

      <div className="space-y-4 px-4">
        <Skeleton className="h-8 w-32" />
        <FeedSkeleton />
      </div>
    </div>
  );
}
