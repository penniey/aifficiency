export function CompareSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-9 w-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-2 h-5 w-full max-w-xl animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-[74px] animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-[74px] animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-[154px] animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-[154px] animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div className="h-80 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />

        <div className="h-64 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
