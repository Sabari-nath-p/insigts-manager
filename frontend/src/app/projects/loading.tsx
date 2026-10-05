/** Skeleton shown while any /projects page loads. Plain blocks, no motion beyond a gentle pulse. */
export default function ProjectsLoading() {
  return (
    <div className="flex h-full flex-col px-4 pt-4" aria-busy="true" aria-label="Loading">
      <div className="mb-4 h-6 w-56 animate-pulse rounded-md bg-black/[0.06]" />
      <div className="mb-4 flex gap-2">
        <div className="h-8 w-40 animate-pulse rounded-md bg-black/[0.05]" />
        <div className="h-8 w-28 animate-pulse rounded-md bg-black/[0.05]" />
        <div className="h-8 w-28 animate-pulse rounded-md bg-black/[0.05]" />
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {[0, 1, 2, 3].map((c) => (
          <div key={c} className="flex w-72 shrink-0 flex-col gap-2 rounded-md border border-border bg-sidebar p-2">
            <div className="h-5 w-24 animate-pulse rounded-sm bg-black/[0.06]" />
            {[0, 1, 2].map((r) => (
              <div key={r} className="h-20 animate-pulse rounded-md bg-black/[0.05]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
