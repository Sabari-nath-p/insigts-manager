'use client';

import { useEffect } from 'react';
import { startInstallCapture } from '@/lib/install-prompt';

/** Mounted once in the root layout so the browser's install offer is caught on every page, however early it fires. */
export function InstallCapture() {
  useEffect(() => startInstallCapture(), []);
  return null;
}
