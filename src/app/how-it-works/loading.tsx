import { Skeleton } from "@/components/ui/skeleton";

// How it works while its live numbers load: the same shapes as the page, so nothing jumps.
export default function Loading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main aria-busy="true" className="flex flex-1 flex-col gap-6 px-4 pt-safe pb-6">
        <div className="flex flex-col gap-2 pt-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-1/2" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </main>
    </div>
  );
}
