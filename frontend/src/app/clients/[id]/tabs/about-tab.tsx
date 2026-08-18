'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, FieldRow, Input, Textarea, ErrorText } from '@/components/ui/field';
import { PropertyList, PropertyRow } from '@/components/ui/property-row';
import { SectionTitle } from '@/components/ui/page-header';
import type { Client } from '../../types';

function val(v: string | null | undefined) {
  return v && v.trim() ? v : '—';
}

export function AboutTab({ client, clientId, canManage }: { client: Client; clientId: string; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(Array.from(form.entries()).map(([k, v]) => [k, v || undefined]));
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save');
      router.refresh();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Detailed company information — editable by the account manager or a super admin.</p>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={13} /> Edit About
          </Button>
        )}
      </div>

      <SectionTitle>Company overview</SectionTitle>
      <PropertyList className="mb-6">
        <PropertyRow label="About" value={val(client.aboutText)} />
        <PropertyRow label="Mission" value={val(client.mission)} />
        <PropertyRow label="Vision" value={val(client.vision)} />
        <PropertyRow label="Core values" value={val(client.coreValues)} />
        <PropertyRow label="Business model" value={val(client.businessModel)} />
        <PropertyRow label="Products / services" value={val(client.productsServices)} />
        <PropertyRow label="Key differentiators" value={val(client.keyDifferentiators)} />
      </PropertyList>

      <SectionTitle>Business information</SectionTitle>
      <PropertyList className="mb-6">
        <PropertyRow label="Founded" value={val(client.founded)} />
        <PropertyRow label="Company size" value={val(client.companySize)} />
        <PropertyRow label="Locations" value={val(client.locations)} />
      </PropertyList>

      <SectionTitle>Target audience</SectionTitle>
      <PropertyList>
        <PropertyRow label="Primary audience" value={val(client.targetAudiencePrimary)} />
        <PropertyRow label="Secondary audience" value={val(client.targetAudienceSecondary)} />
        <PropertyRow label="Age group" value={val(client.targetAudienceAgeGroup)} />
        <PropertyRow label="Location" value={val(client.targetAudienceLocation)} />
        <PropertyRow label="Interests" value={val(client.targetAudienceInterests)} />
        <PropertyRow label="Pain points" value={val(client.targetAudiencePainPoints)} />
        <PropertyRow label="Buying behavior" value={val(client.targetAudienceBuyingBehavior)} />
      </PropertyList>

      <Panel open={editing} onOpenChange={setEditing} title="Edit About">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <ErrorText>{error}</ErrorText>}
          <Field label="About" htmlFor="aboutText">
            <Textarea id="aboutText" name="aboutText" defaultValue={client.aboutText ?? ''} className="min-h-16" />
          </Field>
          <FieldRow>
            <Field label="Mission" htmlFor="mission">
              <Textarea id="mission" name="mission" defaultValue={client.mission ?? ''} className="min-h-12" />
            </Field>
            <Field label="Vision" htmlFor="vision">
              <Textarea id="vision" name="vision" defaultValue={client.vision ?? ''} className="min-h-12" />
            </Field>
          </FieldRow>
          <Field label="Core values" htmlFor="coreValues">
            <Textarea id="coreValues" name="coreValues" defaultValue={client.coreValues ?? ''} className="min-h-12" />
          </Field>
          <Field label="Business model" htmlFor="businessModel">
            <Textarea id="businessModel" name="businessModel" defaultValue={client.businessModel ?? ''} className="min-h-12" />
          </Field>
          <Field label="Products / services" htmlFor="productsServices">
            <Textarea id="productsServices" name="productsServices" defaultValue={client.productsServices ?? ''} className="min-h-12" />
          </Field>
          <Field label="Key differentiators" htmlFor="keyDifferentiators">
            <Textarea id="keyDifferentiators" name="keyDifferentiators" defaultValue={client.keyDifferentiators ?? ''} className="min-h-12" />
          </Field>
          <FieldRow>
            <Field label="Founded" htmlFor="founded">
              <Input id="founded" name="founded" defaultValue={client.founded ?? ''} />
            </Field>
            <Field label="Company size" htmlFor="companySize">
              <Input id="companySize" name="companySize" defaultValue={client.companySize ?? ''} />
            </Field>
          </FieldRow>
          <Field label="Locations" htmlFor="locations">
            <Input id="locations" name="locations" defaultValue={client.locations ?? ''} />
          </Field>

          <div className="mt-2 h-px bg-border" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Target audience</p>
          <FieldRow>
            <Field label="Primary audience" htmlFor="targetAudiencePrimary">
              <Textarea id="targetAudiencePrimary" name="targetAudiencePrimary" defaultValue={client.targetAudiencePrimary ?? ''} className="min-h-12" />
            </Field>
            <Field label="Secondary audience" htmlFor="targetAudienceSecondary">
              <Textarea id="targetAudienceSecondary" name="targetAudienceSecondary" defaultValue={client.targetAudienceSecondary ?? ''} className="min-h-12" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Age group" htmlFor="targetAudienceAgeGroup">
              <Input id="targetAudienceAgeGroup" name="targetAudienceAgeGroup" defaultValue={client.targetAudienceAgeGroup ?? ''} />
            </Field>
            <Field label="Location" htmlFor="targetAudienceLocation">
              <Input id="targetAudienceLocation" name="targetAudienceLocation" defaultValue={client.targetAudienceLocation ?? ''} />
            </Field>
          </FieldRow>
          <Field label="Interests" htmlFor="targetAudienceInterests">
            <Textarea id="targetAudienceInterests" name="targetAudienceInterests" defaultValue={client.targetAudienceInterests ?? ''} className="min-h-12" />
          </Field>
          <Field label="Pain points" htmlFor="targetAudiencePainPoints">
            <Textarea id="targetAudiencePainPoints" name="targetAudiencePainPoints" defaultValue={client.targetAudiencePainPoints ?? ''} className="min-h-12" />
          </Field>
          <Field label="Buying behavior" htmlFor="targetAudienceBuyingBehavior">
            <Textarea id="targetAudienceBuyingBehavior" name="targetAudienceBuyingBehavior" defaultValue={client.targetAudienceBuyingBehavior ?? ''} className="min-h-12" />
          </Field>

          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
