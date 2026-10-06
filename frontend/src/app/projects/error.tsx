'use client';

import Link from 'next/link';

export default function ProjectsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-lg font-semibold text-text">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted">The page could not load. Try again, and if it keeps happening let an admin know.</p>
      <div className="mt-1 flex gap-4 text-sm">
        <button onClick={reset} className="text-primary hover:underline">
          Try again
        </button>
        <Link href="/projects" className="text-muted hover:text-text">
          Back to projects
        </Link>
      </div>
    </div>
  );
}
