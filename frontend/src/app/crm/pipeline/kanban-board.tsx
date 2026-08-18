'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Select } from '@/components/ui/field';
import { LEAD_STATUSES, type KanbanBoard, type Lead } from '../types';
import { AGING_LABELS, STATUS_LABELS, formatCurrency } from '@/lib/crm-format';

async function moveLeadStatus(leadId: string, status: string) {
  const res = await fetch(`/api/crm/leads/${leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Failed to move lead');
  }
}

function LeadCard({ lead, nameById, onMoved }: { lead: Lead; nameById: Map<string, string>; onMoved: () => void }) {
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMove(status: string) {
    if (status === lead.status) return;
    setMoving(true);
    setError(null);
    try {
      await moveLeadStatus(lead.id, status);
      onMoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setMoving(false);
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', lead.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="mb-2 cursor-grab rounded-md border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow active:cursor-grabbing"
    >
      <Link href={`/crm/leads/${lead.id}`} className="block">
        <p className="text-sm font-medium text-text">{lead.leadName}</p>
        {lead.companyName && <p className="text-xs text-muted">{lead.companyName}</p>}
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {lead.setterId && <span>S: {nameById.get(lead.setterId) ?? '—'}</span>}
        {lead.closerId && <span>C: {nameById.get(lead.closerId) ?? '—'}</span>}
      </div>

      {lead.dealValue > 0 && <p className="mt-1 text-sm font-semibold text-text">{formatCurrency(lead.dealValue)}</p>}

      {lead.agingStatus && (
        <div className="mt-2 flex items-center gap-1 rounded-md bg-danger-bg px-2 py-1 text-[11px] font-semibold text-danger">
          <AlertTriangle size={11} />
          {AGING_LABELS[lead.agingStatus]}
        </div>
      )}

      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}

      <Select
        value={lead.status}
        disabled={moving}
        onClick={(e) => e.preventDefault()}
        onChange={(e) => handleMove(e.target.value)}
        className="mt-2 py-1 text-xs"
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            Move to: {STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function KanbanBoardView({ board, nameById }: { board: KanbanBoard; nameById: Map<string, string> }) {
  const router = useRouter();
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleDrop(status: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOverStatus(null);
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;
    try {
      await moveLeadStatus(leadId, status);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move lead');
    }
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <div className="thin-scrollbar flex gap-3 overflow-x-auto pb-2">
        {board.columns.map((col) => (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(col.status);
            }}
            onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
            onDrop={(e) => handleDrop(col.status, e)}
            className={`flex w-72 shrink-0 flex-col rounded-lg border p-2 transition-colors ${
              dragOverStatus === col.status ? 'border-primary bg-primary/5' : 'border-border bg-bg'
            }`}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{STATUS_LABELS[col.status]}</p>
              <span className="text-xs text-muted">{col.leads.length}</span>
            </div>
            <div className="thin-scrollbar min-h-16 flex-1 overflow-y-auto">
              {col.leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} nameById={nameById} onMoved={refresh} />
              ))}
              {col.leads.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted">No leads</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
