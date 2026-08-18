'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { ApplyLeaveForm } from './apply-leave-form';

export function RequestLeaveButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Request leave
      </Button>
      <Panel
        open={open}
        onOpenChange={setOpen}
        title="Request leave"
        description="Paid and medical requests are sanctioned by an admin."
      >
        <ApplyLeaveForm onSuccess={() => setOpen(false)} />
      </Panel>
    </>
  );
}
