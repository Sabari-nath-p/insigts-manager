'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Field, FieldRow, Input, Select, Textarea, CheckboxLabel, ErrorText } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

interface ContactRow {
  name: string;
  designation: string;
  email: string;
  phone: string;
  whatsapp: string;
  preferredContactMethod: string;
  isDecisionMaker: boolean;
  isPrimary: boolean;
  notes: string;
}

function emptyContact(): ContactRow {
  return { name: '', designation: '', email: '', phone: '', whatsapp: '', preferredContactMethod: '', isDecisionMaker: false, isPrimary: false, notes: '' };
}

export function CreateClientForm({
  employees,
  onSuccess,
}: {
  employees: { id: string; fullName: string; role: string }[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>([emptyContact()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateContact(index: number, patch: Partial<ContactRow>) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);

    const payload = {
      clientName: form.get('clientName'),
      companyName: form.get('companyName') || undefined,
      website: form.get('website') || undefined,
      industry: form.get('industry') || undefined,
      niche: form.get('niche') || undefined,
      location: form.get('location') || undefined,
      companyDescription: form.get('companyDescription') || undefined,
      aboutText: form.get('aboutText') || undefined,
      status: form.get('status') || undefined,
      dateOnboarded: form.get('dateOnboarded') || undefined,
      contractStartDate: form.get('contractStartDate') || undefined,
      contractEndDate: form.get('contractEndDate') || undefined,
      accountManagerId: form.get('accountManagerId') || undefined,
      contacts: contacts
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name,
          designation: c.designation || undefined,
          email: c.email || undefined,
          phone: c.phone || undefined,
          whatsapp: c.whatsapp || undefined,
          preferredContactMethod: c.preferredContactMethod || undefined,
          isDecisionMaker: c.isDecisionMaker,
          isPrimary: c.isPrimary,
          notes: c.notes || undefined,
        })),
    };

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to create client');
      router.push(`/clients/${data.id}`);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <ErrorText>{error}</ErrorText>}

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Basic information</h3>
        <div className="flex flex-col gap-4">
          <FieldRow>
            <Field label="Client name" htmlFor="clientName">
              <Input id="clientName" name="clientName" required />
            </Field>
            <Field label="Company name" htmlFor="companyName">
              <Input id="companyName" name="companyName" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Website" htmlFor="website">
              <Input id="website" name="website" type="url" placeholder="https://…" />
            </Field>
            <Field label="Location" htmlFor="location">
              <Input id="location" name="location" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Industry" htmlFor="industry">
              <Input id="industry" name="industry" />
            </Field>
            <Field label="Niche" htmlFor="niche">
              <Input id="niche" name="niche" />
            </Field>
          </FieldRow>
          <Field label="Company description" htmlFor="companyDescription">
            <Textarea id="companyDescription" name="companyDescription" className="min-h-16" />
          </Field>
          <Field label="About the client" htmlFor="aboutText">
            <Textarea id="aboutText" name="aboutText" className="min-h-16" />
          </Field>
          <FieldRow>
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue="onboarding">
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="Account manager" htmlFor="accountManagerId">
              <Select id="accountManagerId" name="accountManagerId" defaultValue="">
                <option value="">Unassigned</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Date onboarded" htmlFor="dateOnboarded">
              <Input id="dateOnboarded" name="dateOnboarded" type="date" />
            </Field>
            <FieldRow className="grid-cols-2">
              <Field label="Contract start" htmlFor="contractStartDate">
                <Input id="contractStartDate" name="contractStartDate" type="date" />
              </Field>
              <Field label="Contract end" htmlFor="contractEndDate">
                <Input id="contractEndDate" name="contractEndDate" type="date" />
              </Field>
            </FieldRow>
          </FieldRow>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Client contacts</h3>
          <button
            type="button"
            onClick={() => setContacts((prev) => [...prev, emptyContact()])}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark"
          >
            <Plus size={13} /> Add contact
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {contacts.map((contact, index) => (
            <div key={index} className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Contact {index + 1}</span>
                {contacts.length > 1 && (
                  <button type="button" onClick={() => setContacts((prev) => prev.filter((_, i) => i !== index))} className="text-muted hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <FieldRow>
                  <Field label="Name" htmlFor={`contact-name-${index}`}>
                    <Input id={`contact-name-${index}`} value={contact.name} onChange={(e) => updateContact(index, { name: e.target.value })} />
                  </Field>
                  <Field label="Designation" htmlFor={`contact-designation-${index}`}>
                    <Input id={`contact-designation-${index}`} value={contact.designation} onChange={(e) => updateContact(index, { designation: e.target.value })} />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Email" htmlFor={`contact-email-${index}`}>
                    <Input id={`contact-email-${index}`} type="email" value={contact.email} onChange={(e) => updateContact(index, { email: e.target.value })} />
                  </Field>
                  <Field label="Phone" htmlFor={`contact-phone-${index}`}>
                    <Input id={`contact-phone-${index}`} value={contact.phone} onChange={(e) => updateContact(index, { phone: e.target.value })} />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="WhatsApp" htmlFor={`contact-whatsapp-${index}`}>
                    <Input id={`contact-whatsapp-${index}`} value={contact.whatsapp} onChange={(e) => updateContact(index, { whatsapp: e.target.value })} />
                  </Field>
                  <Field label="Preferred contact method" htmlFor={`contact-method-${index}`}>
                    <Input id={`contact-method-${index}`} value={contact.preferredContactMethod} onChange={(e) => updateContact(index, { preferredContactMethod: e.target.value })} />
                  </Field>
                </FieldRow>
                <div className="flex gap-4">
                  <CheckboxLabel checked={contact.isPrimary} onChange={() => updateContact(index, { isPrimary: !contact.isPrimary })}>
                    Primary contact
                  </CheckboxLabel>
                  <CheckboxLabel checked={contact.isDecisionMaker} onChange={() => updateContact(index, { isDecisionMaker: !contact.isDecisionMaker })}>
                    Decision maker
                  </CheckboxLabel>
                </div>
                <Field label="Notes" htmlFor={`contact-notes-${index}`}>
                  <Textarea id={`contact-notes-${index}`} value={contact.notes} onChange={(e) => updateContact(index, { notes: e.target.value })} className="min-h-12" />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={loading} className="mt-1">
        {loading ? 'Creating…' : 'Create client'}
      </Button>
    </form>
  );
}
