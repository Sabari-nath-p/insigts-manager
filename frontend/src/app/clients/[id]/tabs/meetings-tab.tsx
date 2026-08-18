'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, FieldRow, Input, Textarea, CheckboxLabel, ErrorText } from '@/components/ui/field';
import { SectionTitle } from '@/components/ui/page-header';
import type { ClientMeeting } from '../../types';
import type { Employee } from '../client-workspace';

function zonedToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MeetingsTab({
  meetings,
  clientId,
  currentUserId,
  canManage,
  employees,
}: {
  meetings: ClientMeeting[];
  clientId: string;
  currentUserId: string;
  canManage: boolean;
  employees: Employee[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ClientMeeting | 'new' | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const today = zonedToday();
  const upcoming = useMemo(() => meetings.filter((m) => m.date >= today).sort((a, b) => a.date.localeCompare(b.date)), [meetings, today]);
  const previous = useMemo(() => meetings.filter((m) => m.date < today).sort((a, b) => b.date.localeCompare(a.date)), [meetings, today]);

  function openNew() {
    setParticipants([]);
    setEditing('new');
    setError(null);
  }
  function openEdit(m: ClientMeeting) {
    setParticipants(m.participantUserIds ?? []);
    setEditing(m);
    setError(null);
  }
  function toggleParticipant(id: string) {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get('title'),
      date: form.get('date'),
      time: form.get('time') || undefined,
      meetingLink: form.get('meetingLink') || undefined,
      agenda: form.get('agenda') || undefined,
      notes: form.get('notes') || undefined,
      decisions: form.get('decisions') || undefined,
      actionItems: form.get('actionItems') || undefined,
      followUpDate: form.get('followUpDate') || undefined,
      participantUserIds: participants,
    };
    const isNew = editing === 'new';
    const url = isNew ? `/api/clients/${clientId}/meetings` : `/api/clients/${clientId}/meetings/${(editing as ClientMeeting).id}`;
    try {
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save meeting');
      router.refresh();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(m: ClientMeeting) {
    if (!window.confirm(`Delete meeting "${m.title}"?`)) return;
    await fetch(`/api/clients/${clientId}/meetings/${m.id}`, { method: 'DELETE' });
    router.refresh();
  }

  function nameFor(id: string) {
    return employees.find((e) => e.id === id)?.fullName ?? 'Unknown';
  }

  function renderMeeting(m: ClientMeeting) {
    const canEdit = canManage || m.createdBy === currentUserId;
    return (
      <div key={m.id} className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-text">{m.title}</div>
            <div className="text-xs text-muted">
              {m.date}
              {m.time ? ` · ${m.time}` : ''}
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => openEdit(m)} className="text-muted hover:text-primary">
                <Pencil size={14} />
              </button>
              <button type="button" onClick={() => handleDelete(m)} className="text-muted hover:text-danger">
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        {m.participantUserIds && m.participantUserIds.length > 0 && (
          <div className="mb-1 text-xs text-muted">Participants: {m.participantUserIds.map(nameFor).join(', ')}</div>
        )}
        {m.meetingLink && (
          <a href={m.meetingLink} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:text-primary-dark">
            Meeting link
          </a>
        )}
        {m.agenda && <p className="mt-2 text-sm text-text"><span className="font-medium">Agenda:</span> {m.agenda}</p>}
        {m.notes && <p className="mt-1 text-sm text-text"><span className="font-medium">Notes:</span> {m.notes}</p>}
        {m.decisions && <p className="mt-1 text-sm text-text"><span className="font-medium">Decisions:</span> {m.decisions}</p>}
        {m.actionItems && <p className="mt-1 text-sm text-text"><span className="font-medium">Action items:</span> {m.actionItems}</p>}
        {m.followUpDate && <p className="mt-1 text-xs text-muted">Follow up: {m.followUpDate}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Meeting history, agendas, decisions, and action items.</p>
        <Button size="sm" onClick={openNew}>
          <Plus size={14} /> Schedule Meeting
        </Button>
      </div>

      <SectionTitle>Upcoming ({upcoming.length})</SectionTitle>
      <div className="mb-6 flex flex-col gap-3">
        {upcoming.length === 0 ? <p className="text-sm text-muted">No upcoming meetings.</p> : upcoming.map(renderMeeting)}
      </div>

      <SectionTitle>Previous ({previous.length})</SectionTitle>
      <div className="flex flex-col gap-3">
        {previous.length === 0 ? <p className="text-sm text-muted">No previous meetings.</p> : previous.map(renderMeeting)}
      </div>

      <Panel open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title={editing === 'new' ? 'Schedule meeting' : 'Edit meeting'}>
        {editing && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <ErrorText>{error}</ErrorText>}
            <Field label="Title" htmlFor="title">
              <Input id="title" name="title" defaultValue={editing !== 'new' ? editing.title : ''} required />
            </Field>
            <FieldRow>
              <Field label="Date" htmlFor="date">
                <Input id="date" name="date" type="date" defaultValue={editing !== 'new' ? editing.date : today} required />
              </Field>
              <Field label="Time" htmlFor="time">
                <Input id="time" name="time" type="time" defaultValue={editing !== 'new' ? editing.time ?? '' : ''} />
              </Field>
            </FieldRow>
            <Field label="Meeting link" htmlFor="meetingLink">
              <Input id="meetingLink" name="meetingLink" type="url" defaultValue={editing !== 'new' ? editing.meetingLink ?? '' : ''} />
            </Field>
            <Field label="Participants">
              <div className="flex max-h-28 flex-wrap gap-3 overflow-y-auto">
                {employees.map((e) => (
                  <CheckboxLabel key={e.id} checked={participants.includes(e.id)} onChange={() => toggleParticipant(e.id)}>
                    {e.fullName}
                  </CheckboxLabel>
                ))}
              </div>
            </Field>
            <Field label="Agenda" htmlFor="agenda">
              <Textarea id="agenda" name="agenda" defaultValue={editing !== 'new' ? editing.agenda ?? '' : ''} className="min-h-12" />
            </Field>
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={editing !== 'new' ? editing.notes ?? '' : ''} className="min-h-12" />
            </Field>
            <Field label="Decisions" htmlFor="decisions">
              <Textarea id="decisions" name="decisions" defaultValue={editing !== 'new' ? editing.decisions ?? '' : ''} className="min-h-12" />
            </Field>
            <Field label="Action items" htmlFor="actionItems">
              <Textarea id="actionItems" name="actionItems" defaultValue={editing !== 'new' ? editing.actionItems ?? '' : ''} className="min-h-12" />
            </Field>
            <Field label="Follow-up date" htmlFor="followUpDate">
              <Input id="followUpDate" name="followUpDate" type="date" defaultValue={editing !== 'new' ? editing.followUpDate ?? '' : ''} />
            </Field>
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? 'Saving…' : editing === 'new' ? 'Schedule meeting' : 'Save changes'}
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
