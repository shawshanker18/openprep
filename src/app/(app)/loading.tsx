import { Skeleton } from "@/components/ui/skeleton";

/** Shown inside the app shell while a page's data loads (sidebar stays put). */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 lg:col-span-2" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}
