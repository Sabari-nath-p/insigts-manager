import { cn } from '@/lib/cn';
import { typeDotClass } from '@/lib/content-calendar/type-colors';

/** The small coloured dot that goes with a post type. Decorative: the type's name is always written next to it. */
export function TypeDot({ type, className }: { type: string; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-2 w-2 shrink-0 rounded-full', typeDotClass(type), className)} />;
}
