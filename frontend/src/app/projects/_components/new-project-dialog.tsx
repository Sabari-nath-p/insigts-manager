'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pm } from '@/lib/pm/client';
import { colorsInUse, nextColor } from '@/lib/pm/colors';
import type { PmProject } from '@/lib/pm/types';
import { ColorPicker } from './color-picker';

function suggestKey(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  const key = words.length > 1 ? words.map((w) => w[0]).join('') : (words[0] ?? '');
  return key.slice(0, 4);
}

export function NewProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [color, setColor] = useState(() => nextColor([]));

  // Colours held by active projects cannot be picked again; archived and deleted projects give theirs back.
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => pm<PmProject[]>('/projects'), enabled: open });
  const taken = colorsInUse(projects);

  // Each time the dialog opens, suggest a colour no active project is using.
  useEffect(() => {
    if (!open) return;
    const inUse = colorsInUse(qc.getQueryData<PmProject[]>(['projects']) ?? []);
    setColor(nextColor([...inUse.keys()]));
  }, [open, qc]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const project = await pm<PmProject>('/projects', { method: 'POST', body: { name, key, color } });
      await qc.invalidateQueries({ queryKey: ['projects'] });
      onOpenChange(false);
      setName('');
      setKey('');
      setKeyEdited(false);
      router.push(`/projects/${project.key}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-[18vh] z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border border-border bg-surface p-5 outline-none">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-text">New project</Dialog.Title>
            <Dialog.Close aria-label="Close" className="text-muted hover:text-text">
              <X size={16} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Create a project with its own board</Dialog.Description>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm text-text">
              Name
              <input
                autoFocus
                required
                maxLength={100}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!keyEdited) setKey(suggestKey(e.target.value));
                }}
                className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text">
              Key
              <input
                required
                maxLength={10}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  setKeyEdited(true);
                }}
                className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm uppercase tabular-nums outline-none focus:border-primary"
              />
              <span className="text-xs text-muted">Tasks are numbered {key || 'KEY'}-1, {key || 'KEY'}-2 and so on.</span>
            </label>
            <div className="flex flex-col gap-1 text-sm text-text">
              Colour
              <div className="flex items-center gap-2">
                <ColorPicker value={color} onChange={setColor} taken={taken} />
                <span className="text-xs text-muted">Picked for you. Change it if you like.</span>
              </div>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="mt-1 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy || !name.trim() || key.length < 2}>
                Create project
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
