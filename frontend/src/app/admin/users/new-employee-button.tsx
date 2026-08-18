'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { CreateUserForm } from './new/create-user-form';

export function NewEmployeeButton({ managers }: { managers: { id: string; fullName: string; role: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} />
        New account
      </Button>
      <Panel open={open} onOpenChange={setOpen} title="New account" description="Create a super admin, manager, or employee account.">
        <CreateUserForm managers={managers} onSuccess={() => setOpen(false)} />
      </Panel>
    </>
  );
}
