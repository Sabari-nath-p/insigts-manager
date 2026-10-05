import Link from 'next/link';

export default function ProjectNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-lg font-semibold text-text">Project not found</h1>
      <p className="max-w-sm text-sm text-muted">It may have been deleted, or the key in the address is wrong.</p>
      <Link href="/projects" className="mt-1 text-sm text-primary hover:underline">
        Back to projects
      </Link>
    </div>
  );
}
