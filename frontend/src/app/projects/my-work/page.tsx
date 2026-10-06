import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import type { MyWorkData } from '@/lib/pm/types';
import { MyWorkView } from '../_components/my-work-view';

export default async function MyWorkPage() {
  const { token } = await requireSession();
  const initial = await apiFetch<MyWorkData>('/pm/my-work', { token });
  return <MyWorkView initial={initial} />;
}
