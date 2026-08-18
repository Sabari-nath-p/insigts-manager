import { Target } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Field, Input } from '@/components/ui/field';
import { Metric, MetricStrip, PropertyList, PropertyRow } from '@/components/ui/property-row';
import { formatCurrency } from '@/lib/crm-format';

interface Scenario {
  assumptions: { meetingsRemaining: number; showUpRate: number; offerRate: number; closeRateOnOffers: number; avgDealSize: number };
  expectedCalls: number;
  expectedOffers: number;
  projectedSales: number;
  projectedRevenue: number;
}

interface Projection {
  month: string;
  best: Scenario;
  expected: Scenario;
  worst: Scenario;
  goal: number | null;
  currentNetRevenue: number;
  remaining: number | null;
  expectedForecastTotal: number;
  forecastVsGoal: number | null;
}

function ScenarioCard({ title, scenario }: { title: string; scenario: Scenario }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="mb-3 text-sm font-semibold text-text">{title}</p>
      <p className="mb-3 text-2xl font-bold text-text">{formatCurrency(scenario.projectedRevenue)}</p>
      <PropertyList>
        <PropertyRow label="Meetings remaining" value={scenario.assumptions.meetingsRemaining} />
        <PropertyRow label="Show-up rate" value={`${scenario.assumptions.showUpRate}%`} />
        <PropertyRow label="Expected calls" value={scenario.expectedCalls} />
        <PropertyRow label="Offer rate" value={`${scenario.assumptions.offerRate}%`} />
        <PropertyRow label="Close rate on offers" value={`${scenario.assumptions.closeRateOnOffers}%`} />
        <PropertyRow label="Avg deal size" value={formatCurrency(scenario.assumptions.avgDealSize)} />
        <PropertyRow label="Projected sales" value={scenario.projectedSales} />
      </PropertyList>
    </div>
  );
}

export default async function ProjectionPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { token, user } = await requireSession();
  const { month } = await searchParams;
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const projection = await apiFetch<Projection>(`/crm/projection?month=${targetMonth}`, { token });

  return (
    <AppShell user={user}>
      <PageHeader title="Projection" icon={Target} tone="orange" subtitle="Forecast derived from the current pipeline — not manually entered." />

      <form className="mb-8 flex items-end gap-2">
        <Field label="Month" htmlFor="month">
          <Input id="month" name="month" type="month" defaultValue={targetMonth} className="w-auto" />
        </Field>
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark">
          View
        </button>
      </form>

      {projection.goal != null && (
        <>
          <SectionTitle>Goal gap</SectionTitle>
          <MetricStrip className="mb-8">
            <Metric label="Revenue goal" value={formatCurrency(projection.goal)} />
            <Metric label="Current net revenue" value={formatCurrency(projection.currentNetRevenue)} />
            <Metric label="Remaining" value={formatCurrency(projection.remaining)} />
            <Metric label="Expected forecast" value={formatCurrency(projection.expectedForecastTotal)} />
            <Metric
              label="Forecast vs. goal"
              value={
                <span
                  className={projection.forecastVsGoal != null && projection.forecastVsGoal < 0 ? 'text-danger' : ''}
                  style={
                    projection.forecastVsGoal != null && projection.forecastVsGoal >= 0
                      ? { color: 'var(--badge-green-text)' }
                      : undefined
                  }
                >
                  {projection.forecastVsGoal != null && projection.forecastVsGoal < 0
                    ? `${formatCurrency(Math.abs(projection.forecastVsGoal))} below target`
                    : `${formatCurrency(projection.forecastVsGoal ?? 0)} above target`}
                </span>
              }
            />
          </MetricStrip>
        </>
      )}

      <SectionTitle>End-of-month forecast</SectionTitle>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ScenarioCard title="Best Case" scenario={projection.best} />
        <ScenarioCard title="Expected Case" scenario={projection.expected} />
        <ScenarioCard title="Worst Case" scenario={projection.worst} />
      </div>
    </AppShell>
  );
}
