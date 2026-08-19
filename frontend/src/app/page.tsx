import { getApiBaseUrl } from '@/lib/api';
import { BrandMark } from '@/components/brand-mark';
import { LinkButton } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';

// Server component: this fetch runs on the server for every request (SSR), never in the browser.
async function getApiStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function HomePage() {
  const apiOnline = await getApiStatus();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 text-center">
        <div className="mb-6 flex items-center justify-center gap-2">
          <BrandMark size={28} />
          <span className="text-base font-semibold text-text">Insights HRMS</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-text">A complete company management tool</h1>
        <p className="mt-2 mb-6 text-sm text-muted">
          HR, payroll, attendance and CRM — everything your team needs, in one place.
        </p>

        <div className="mb-6 flex justify-center">
          <Pill tone={apiOnline ? 'badgeGreen' : 'badgeRed'}>
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
            API {apiOnline ? 'online' : 'offline'}
          </Pill>
        </div>

        <LinkButton href="/login" className="w-full">
          Sign in
        </LinkButton>
      </div>
    </div>
  );
}
