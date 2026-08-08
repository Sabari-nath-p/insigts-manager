import Link from 'next/link';
import type { SessionUser } from '@/lib/session';
import { SignOutButton } from './sign-out-button';
import styles from './app-shell.module.css';

const EMPLOYEE_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/attendance', label: 'Attendance' },
  { href: '/leaves', label: 'Leaves' },
  { href: '/status', label: 'Team status' },
];

const ADMIN_LINKS = [{ href: '/admin/users', label: 'Employees' }, { href: '/admin/leaves', label: 'Leave requests' }];

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const links = user.role === 'super_admin' ? [...EMPLOYEE_LINKS, ...ADMIN_LINKS] : EMPLOYEE_LINKS;

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.nav}>
          <Link href="/dashboard" className={styles.brand}>
            Insights
          </Link>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className={styles.userInfo}>
          <span>{user.email}</span>
          <span className={styles.roleBadge}>{user.role.replace('_', ' ')}</span>
          <SignOutButton />
        </div>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
