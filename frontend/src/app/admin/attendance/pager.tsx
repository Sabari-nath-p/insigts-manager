import { LinkButton, Button } from '@/components/ui/button';

/**
 * `total` counts matching employees, not flattened rows — a page of the Matrix/Records tabs
 * shows every row for that page's employees across the selected range, so "rows" isn't a
 * meaningful denominator here.
 */
export function Pager({
  page,
  total,
  pageSize,
  basePath,
  searchParams,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  searchParams: URLSearchParams;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="text-xs text-muted">
        {total === 0 ? 'No employees match these filters' : `Employees ${start}–${end} of ${total}`}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <LinkButton href={hrefFor(page - 1)} variant="ghost" size="sm">
            Previous
          </LinkButton>
        ) : (
          <Button variant="ghost" size="sm" disabled>
            Previous
          </Button>
        )}
        <span className="text-xs text-muted">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <LinkButton href={hrefFor(page + 1)} variant="ghost" size="sm">
            Next
          </LinkButton>
        ) : (
          <Button variant="ghost" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
