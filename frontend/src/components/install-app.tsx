'use client';

import { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Download, Share } from 'lucide-react';
import { askToInstall, getInstallEvent, runningAsApp, startInstallCapture, subscribeInstall, wasInstalled } from '@/lib/install-prompt';

type Mode = 'hidden' | 'prompt' | 'ios';

const PILL =
  'inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-medium text-text transition-colors hover:border-primary';

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, with a touch screen.
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * "Install app" button for the top bar. Shown only when the browser can install the site (Chrome, Edge,
 * Android) or is an iPhone/iPad, which needs a two-step hint. Hidden once the site runs as an installed app.
 */
export function InstallApp() {
  const [mode, setMode] = useState<Mode>('hidden');

  useEffect(() => {
    startInstallCapture();
    const update = () => {
      if (runningAsApp() || wasInstalled()) return setMode('hidden');
      if (getInstallEvent()) return setMode('prompt');
      setMode(isIos() ? 'ios' : 'hidden');
    };
    update();
    return subscribeInstall(update);
  }, []);

  if (mode === 'hidden') return null;

  if (mode === 'prompt') {
    return (
      <button type="button" onClick={() => void askToInstall()} className={PILL}>
        <Download size={13} />
        <span className="hidden sm:inline">Install app</span>
      </button>
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className={PILL}>
          <Download size={13} />
          <span className="hidden sm:inline">Install app</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-64 rounded-lg border border-border bg-surface p-3 text-sm text-text outline-none">
          <p className="font-medium">Add Insights to your Home Screen</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted">
            <li>
              Tap the <Share size={12} className="inline align-text-bottom" /> Share button in Safari.
            </li>
            <li>Choose &ldquo;Add to Home Screen&rdquo;.</li>
            <li>Open Insights from the new icon.</li>
          </ol>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
