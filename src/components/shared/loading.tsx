import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-control bg-muted motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export function FilterSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-card border border-border bg-surface", className)}
    >
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-4">
        {Array.from({ length: fields }).map((_, index) => (
          <div className="space-y-2" key={index}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function FormSkeleton({
  fields = 6,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-card border border-border bg-surface", className)}
    >
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-3">
        {Array.from({ length: fields }).map((_, index) => (
          <div
            className={cn("space-y-2", index % 5 === 0 ? "md:col-span-2" : "")}
            key={index}
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-36 md:col-span-3" />
      </div>
    </section>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-card border border-border bg-surface", className)}
    >
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="overflow-hidden">
        <div
          className="grid gap-3 border-b border-border bg-surface-muted px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton className="h-3" key={index} />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              className="grid gap-3 px-4 py-4"
              key={rowIndex}
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: columns }).map((__, columnIndex) => (
                <Skeleton
                  className={cn("h-4", columnIndex === 0 ? "w-4/5" : "w-2/3")}
                  key={columnIndex}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MetricGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="rounded-card border border-border bg-surface p-4"
          key={index}
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-7 w-24" />
          </div>
          <Skeleton className="mt-5 h-9 w-20" />
        </div>
      ))}
    </div>
  );
}

export function PageContentSkeleton() {
  return (
    <div className="space-y-5">
      <FilterSkeleton />
      <TableSkeleton />
    </div>
  );
}

export function DashboardContentSkeleton() {
  return (
    <div className="space-y-5">
      <MetricGridSkeleton />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="rounded-card border border-border bg-surface p-4"
            key={index}
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-7 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <TableSkeleton rows={5} columns={5} />
        <TableSkeleton rows={5} columns={2} />
      </div>
    </div>
  );
}

export function OperationalPageSkeleton() {
  return (
    <div className="space-y-5">
      <FormSkeleton fields={7} />
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
}
