import { requireSuperAdmin } from '@/lib/session';
import { AppShell } from '@/components/app-shell';
import shared from '@/components/shared.module.css';
import { CreateUserForm } from './create-user-form';

export default async function NewUserPage() {
  const { user } = await requireSuperAdmin();

  return (
    <AppShell user={user}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>New account</h1>
          <p className={shared.pageSubtitle}>
            Create another super admin or a regular employee account.
          </p>
        </div>
      </div>
      <CreateUserForm />
    </AppShell>
  );
}
