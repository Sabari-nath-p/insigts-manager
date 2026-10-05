import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import type { BoardData, PmMe } from '@/lib/pm/types';
import { BoardView } from '../_components/board-view';

export default async function ProjectBoardPage({ params }: { params: Promise<{ key: string }> }) {
  const { token } = await requireSession();
  const { key } = await params;
  const projectKey = key.toUpperCase();

  // Filters, view and the open task live in the URL but are applied in the browser, so this
  // one query always loads the whole board.
  let board: BoardData;
  try {
    board = await apiFetch<BoardData>(`/pm/projects/${projectKey}/board`, { token });
  } catch (err) {
    if ((err as Error).message.toLowerCase().includes('not found')) notFound();
    throw err;
  }
  const me = await apiFetch<PmMe>('/pm/me', { token });

  return <BoardView projectKey={projectKey} me={me} initial={board} />;
}
