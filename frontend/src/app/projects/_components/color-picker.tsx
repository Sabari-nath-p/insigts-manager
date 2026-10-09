'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { PALETTE, colorName } from '@/lib/pm/colors';

/** The swatches themselves, six to a row. Used inside the popover and in the "change colour" dialog. */
export function ColorGrid({
  value,
  onChange,
  taken,
}: {
  value: string;
  onChange: (hex: string) => void;
  /** Colours that cannot be chosen, as lowercase hex -> who has it. The current choice is never blocked. */
  taken?: Map<string, string>;
}) {
  return (
    <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Colour">
      {PALETTE.map((c) => {
        const selected = c.hex.toLowerCase() === value.toLowerCase();
        const holder = taken?.get(c.hex.toLowerCase());
        const blocked = !!holder && !selected;
        const description = blocked ? `${c.name}, already used by ${holder}` : c.name;
        return (
          <button
            key={c.hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={blocked}
            disabled={blocked}
            aria-label={description}
            title={description}
            onClick={() => onChange(c.hex)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              selected ? 'border-text' : 'border-transparent',
              blocked ? 'cursor-not-allowed opacity-20' : 'hover:scale-110',
            )}
            style={{ background: c.hex }}
          >
            {selected && <Check size={14} className="text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.6)]" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A button showing the current colour; clicking it opens the full palette in a popover, so the
 * thirty colours never crowd the form. `compact` shows only the swatch (for tight spaces).
 */
export function ColorPicker({
  value,
  onChange,
  compact = false,
  label = 'Colour',
  taken,
}: {
  value: string;
  onChange: (hex: string) => void;
  compact?: boolean;
  label?: string;
  /** Colours that cannot be chosen, as lowercase hex -> who has it. */
  taken?: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const name = colorName(value);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${name}. Change colour`}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-border bg-surface text-sm text-text hover:border-primary',
            compact ? 'h-6 w-6 justify-center p-0' : 'h-9 px-3',
          )}
        >
          <span className={cn('shrink-0 rounded-full', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} style={{ background: value }} />
          {!compact && (
            <>
              <span>{name}</span>
              <ChevronDown size={14} className="text-muted" />
            </>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} className="z-[80] rounded-lg border border-border bg-surface p-3 outline-none">
          <ColorGrid
            value={value}
            taken={taken}
            onChange={(hex) => {
              onChange(hex);
              setOpen(false);
            }}
          />
          <p className="mt-2 text-center text-xs text-muted">{name}</p>
          {taken && taken.size > 0 && <p className="mt-0.5 text-center text-[11px] text-muted">Faded colours are used by other projects.</p>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** A small dialog for changing the colour of something that already exists (e.g. a project). */
export function ColorDialog({
  open,
  onOpenChange,
  title,
  initial,
  taken,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial: string;
  taken?: Map<string, string>;
  onSubmit: (hex: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-[22vh] z-50 w-[min(92vw,380px)] -translate-x-1/2 rounded-lg border border-border bg-surface p-5 outline-none">
          <Dialog.Title className="mb-3 text-base font-semibold text-text">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">Pick one of the available colours</Dialog.Description>
          <ColorGrid value={value} onChange={setValue} taken={taken} />
          <p className="mt-3 text-sm text-muted">{colorName(value)}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                await onSubmit(value);
                onOpenChange(false);
              }}
            >
              Save colour
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
