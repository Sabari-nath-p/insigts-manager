'use client';

import { useEffect, useState } from 'react';

/**
 * Renders a real UTC instant (an ISO string with an explicit offset, e.g. `2026-08-15T09:32:00Z`)
 * formatted in the *viewer's own device* timezone. Never format an instant with
 * `toLocaleString`/`toLocaleTimeString`/`Intl.DateTimeFormat` directly inside a Next.js Server
 * Component (any `app/` file without `'use client'`) — that code runs on the server at request
 * time and uses the server's timezone, not the visiting browser's, so every viewer would see the
 * same (wrong-for-them) time. This component defers formatting to the client: it renders
 * `placeholder` during the server-rendered/pre-hydration pass and swaps in the real localized
 * text once mounted in the browser.
 *
 * Not for the attendance module's check-in/check-out/scheduled times — those are deliberately
 * pinned to the company's own operating timezone everywhere (see attendance-format.ts) since a
 * single physical office's clock, not a per-viewer conversion, is what makes late/early/overtime
 * comparisons meaningful there.
 */
function LocalMoment({
  iso,
  format,
  placeholder = '—',
}: {
  iso: string | null | undefined;
  format: (date: Date) => string;
  placeholder?: string;
}) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(iso ? format(new Date(iso)) : null);
    // `format` is expected to be a stable/inline function of `iso` alone; re-running per render
    // would be wasteful, so only `iso` is depended on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  if (!iso) return <>{placeholder}</>;
  return <>{text ?? placeholder}</>;
}

/** e.g. "15 Aug, 09:32" */
export function LocalDateTime({ iso, placeholder = '—' }: { iso: string | null | undefined; placeholder?: string }) {
  return (
    <LocalMoment
      iso={iso}
      placeholder={placeholder}
      format={(d) => d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
    />
  );
}

/** The device/browser's full default date+time format. */
export function LocalFullDateTime({ iso, placeholder = '—' }: { iso: string | null | undefined; placeholder?: string }) {
  return <LocalMoment iso={iso} placeholder={placeholder} format={(d) => d.toLocaleString()} />;
}

/** e.g. "15 Aug 2026" — the viewer's own local calendar date for this instant. */
export function LocalDate({ iso, placeholder = '—' }: { iso: string | null | undefined; placeholder?: string }) {
  return (
    <LocalMoment
      iso={iso}
      placeholder={placeholder}
      format={(d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
    />
  );
}

/** e.g. "Today — 09:32", "Yesterday — 14:05", "12 Aug — 09:10" — all in the viewer's own timezone. */
export function LocalRelativeDay({ iso, placeholder = '—' }: { iso: string | null | undefined; placeholder?: string }) {
  return (
    <LocalMoment
      iso={iso}
      placeholder={placeholder}
      format={(date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (sameDay(date, today)) return `Today — ${time}`;
        if (sameDay(date, yesterday)) return `Yesterday — ${time}`;
        return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} — ${time}`;
      }}
    />
  );
}
