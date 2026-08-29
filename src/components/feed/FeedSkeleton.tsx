import { Skeleton } from "@/components/ui/skeleton";

export function PostSkeleton() {
  return (
    <article className="px-5 py-4 flex gap-4 w-full border-b border-border">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-56 w-full rounded-md mt-3" />
        <div className="flex gap-4 mt-3">
          <Skeleton className="h-7 w-12 rounded-md" />
          <Skeleton className="h-7 w-12 rounded-md" />
          <Skeleton className="h-7 w-12 rounded-md" />
          <Skeleton className="h-7 w-12 rounded-md" />
        </div>
      </div>
    </article>
  );
}

export default function FeedSkeleton() {
  return (
    <div className="divide-y divide-border border-x border-border w-full">
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </div>
  );
}
