'use client';

import { useRouter } from 'next/navigation';

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button type="button" className={className} onClick={handleLogout}>
      Sign out
    </button>
  );
}
