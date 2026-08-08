'use client';

import { useRouter } from 'next/navigation';
import styles from './app-shell.module.css';

export function SignOutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button type="button" className={styles.signOutButton} onClick={handleLogout}>
      Sign out
    </button>
  );
}
