import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/api';
import styles from './page.module.css';

// Server component: this fetch runs on the server for every request (SSR), never in the browser.
async function getApiStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function HomePage() {
  const apiOnline = await getApiStatus();

  return (
    <main className={styles.main}>
      <span className={`${styles.status} ${apiOnline ? styles.statusOk : styles.statusDown}`}>
        <span className={styles.dot} />
        API {apiOnline ? 'online' : 'offline'}
      </span>
      <h1 className={styles.title}>Insights</h1>
      <p className={styles.subtitle}>
        A complete company management tool. This is the starting scaffold — HR, payroll,
        attendance and the rest of the modules will be added on top of this foundation.
      </p>
      <div className={styles.actions}>
        <Link href="/login" className={styles.button}>
          Sign in
        </Link>
        <Link href="/dashboard" className={styles.buttonSecondary}>
          Dashboard
        </Link>
      </div>
    </main>
  );
}
