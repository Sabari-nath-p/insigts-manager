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

function hexToRgb(hex: string): string | null {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function ColorSwatchRow({ label, colors }: { label: string; colors: string[] | null }) {
  if (!colors?.length) return <PropertyRow label={label} value="—" />;
  return (
    <PropertyRow
      label={label}
      value={
        <div className="flex flex-wrap gap-3">
          {colors.map((hex) => (
            <div key={hex} className="flex items-center gap-2">
              <span className="h-6 w-6 rounded border border-border" style={{ background: hex.startsWith('#') ? hex : `#${hex}` }} />
              <div className="text-xs text-muted">
                <div className="font-mono">{hex}</div>
                <div className="font-mono">{hexToRgb(hex) ?? ''}</div>
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
}

export function BrandTab({ client, clientId, canManage }: { client: Client; clientId: string; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(
      Array.from(form.entries())
        .filter(([k]) => !['primaryColors', 'secondaryColors', 'accentColors'].includes(k))
        .map(([k, v]) => [k, v || undefined]),
    );
    for (const key of ['primaryColors', 'secondaryColors', 'accentColors']) {
      const raw = String(form.get(key) ?? '');
      const list = raw.split(',').map((c) => c.trim()).filter(Boolean);
      if (list.length) payload[key] = list;
    }
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
        <p className="text-sm text-muted">
          Logo files and brand guideline documents live in <span className="font-medium text-text">Assets → Logos / Brand Guidelines</span>.
        </p>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={13} /> Edit Brand
          </Button>
        )}
      </div>

      <SectionTitle>Brand identity</SectionTitle>
      <PropertyList className="mb-6">
        <PropertyRow label="Brand name" value={val(client.brandName)} />
        <PropertyRow label="Tagline" value={val(client.tagline)} />
        <PropertyRow label="Description" value={val(client.brandDescription)} />
        <PropertyRow label="Personality" value={val(client.brandPersonality)} />
        <PropertyRow label="Voice" value={val(client.brandVoice)} />
        <PropertyRow label="Tone of voice" value={val(client.toneOfVoice)} />
        <PropertyRow label="Communication style" value={val(client.communicationStyle)} />
      </PropertyList>

      <SectionTitle>Visual identity</SectionTitle>
      <PropertyList>
        <ColorSwatchRow label="Primary colors" colors={client.primaryColors} />
        <ColorSwatchRow label="Secondary colors" colors={client.secondaryColors} />
        <ColorSwatchRow label="Accent colors" colors={client.accentColors} />
        <PropertyRow label="Heading font" value={val(client.headingFont)} />
        <PropertyRow label="Body font" value={val(client.bodyFont)} />
        <PropertyRow label="Logo usage rules" value={val(client.logoUsageRules)} />
      </PropertyList>

      <Panel open={editing} onOpenChange={setEditing} title="Edit Brand">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <ErrorText>{error}</ErrorText>}
          <FieldRow>
            <Field label="Brand name" htmlFor="brandName">
              <Input id="brandName" name="brandName" defaultValue={client.brandName ?? ''} />
            </Field>
            <Field label="Tagline" htmlFor="tagline">
              <Input id="tagline" name="tagline" defaultValue={client.tagline ?? ''} />
            </Field>
          </FieldRow>
          <Field label="Brand description" htmlFor="brandDescription">
            <Textarea id="brandDescription" name="brandDescription" defaultValue={client.brandDescription ?? ''} className="min-h-12" />
          </Field>
          <Field label="Brand personality" htmlFor="brandPersonality">
            <Textarea id="brandPersonality" name="brandPersonality" defaultValue={client.brandPersonality ?? ''} className="min-h-12" />
          </Field>
          <FieldRow>
            <Field label="Brand voice" htmlFor="brandVoice">
              <Input id="brandVoice" name="brandVoice" defaultValue={client.brandVoice ?? ''} />
            </Field>
            <Field label="Tone of voice" htmlFor="toneOfVoice">
              <Input id="toneOfVoice" name="toneOfVoice" defaultValue={client.toneOfVoice ?? ''} />
            </Field>
          </FieldRow>
          <Field label="Communication style" htmlFor="communicationStyle">
            <Textarea id="communicationStyle" name="communicationStyle" defaultValue={client.communicationStyle ?? ''} className="min-h-12" />
          </Field>

          <div className="mt-2 h-px bg-border" />
          <Field label="Primary colors" htmlFor="primaryColors" hint="Comma-separated hex codes, e.g. #5645D4, #2D3FE0">
            <Input id="primaryColors" name="primaryColors" defaultValue={client.primaryColors?.join(', ') ?? ''} />
          </Field>
          <Field label="Secondary colors" htmlFor="secondaryColors" hint="Comma-separated hex codes">
            <Input id="secondaryColors" name="secondaryColors" defaultValue={client.secondaryColors?.join(', ') ?? ''} />
          </Field>
          <Field label="Accent colors" htmlFor="accentColors" hint="Comma-separated hex codes">
            <Input id="accentColors" name="accentColors" defaultValue={client.accentColors?.join(', ') ?? ''} />
          </Field>
          <FieldRow>
            <Field label="Heading font" htmlFor="headingFont">
              <Input id="headingFont" name="headingFont" defaultValue={client.headingFont ?? ''} />
            </Field>
            <Field label="Body font" htmlFor="bodyFont">
              <Input id="bodyFont" name="bodyFont" defaultValue={client.bodyFont ?? ''} />
            </Field>
          </FieldRow>
          <Field label="Logo usage rules" htmlFor="logoUsageRules">
            <Textarea id="logoUsageRules" name="logoUsageRules" defaultValue={client.logoUsageRules ?? ''} className="min-h-12" />
          </Field>

          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
