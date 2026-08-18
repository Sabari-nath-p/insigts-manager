import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Users2,
  UserCog,
  ClipboardList,
  BarChart3,
  Settings,
  NotebookPen,
  ClipboardCheck,
  UserSearch,
  BookOpen,
  Building2,
  Wallet,
  IndianRupee,
  Target,
  KanbanSquare,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

export type NavRole = 'employee' | 'manager' | 'super_admin';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Omit to allow every authenticated role. */
  roles?: NavRole[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
  /** Roles allowed to see this section. Omit to allow every authenticated role. */
  roles?: NavRole[];
}

export function hasNavRole(role: string, allowed?: NavRole[]): boolean {
  if (!allowed) return true;
  return allowed.includes(role as NavRole);
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/clients', label: 'Clients', icon: Building2 },
      { href: '/attendance', label: 'My Attendance', icon: Clock },
      { href: '/leaves', label: 'My Leaves', icon: CalendarDays },
      { href: '/worklogs', label: 'Daily Work Log', icon: NotebookPen },
      { href: '/status', label: 'Team Status', icon: Users2 },
      { href: '/knowledge-base', label: 'Internal Knowledge Base', icon: BookOpen },
      { href: '/payroll', label: 'My Payroll', icon: Wallet },
    ],
  },
  {
    label: 'CRM',
    roles: ['manager', 'super_admin', 'employee'],
    items: [
      { href: '/crm/pipeline', label: 'Sales Pipeline', icon: KanbanSquare },
      { href: '/crm/leads', label: 'Lead Log', icon: ClipboardList },
      { href: '/crm/dashboard', label: 'CRM Dashboard', icon: BarChart3 },
      { href: '/crm/projection', label: 'Projection', icon: Target },
      { href: '/crm/leaks', label: 'Sales Leaks', icon: AlertTriangle },
      { href: '/crm/my-sales', label: 'My Sales', icon: Wallet },
      { href: '/crm/activities', label: 'Daily Activity', icon: NotebookPen },
    ],
  },
  {
    label: 'Team',
    roles: ['manager', 'super_admin'],
    items: [
      { href: '/admin/worklogs', label: 'Review Work Logs', icon: ClipboardCheck },
      { href: '/admin/worklogs/pending', label: 'Pending Submissions', icon: UserSearch },
    ],
  },
  {
    label: 'Management',
    roles: ['super_admin'],
    items: [
      { href: '/admin/users', label: 'Employees', icon: UserCog },
      { href: '/admin/attendance', label: 'Attendance Management', icon: ClipboardList },
      { href: '/admin/leaves', label: 'Leave Requests', icon: CalendarDays },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { href: '/admin/attendance/settings', label: 'Settings', icon: Settings },
      { href: '/admin/payroll', label: 'Payroll Management', icon: IndianRupee },
      { href: '/crm/settings', label: 'CRM Settings', icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/** Finds the deepest-matching nav item for a given pathname, for breadcrumb/title derivation. */
export function findNavItem(pathname: string): NavItem | undefined {
  const matches = ALL_NAV_ITEMS.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (matches.length === 0) return undefined;
  return matches.reduce((best, item) => (item.href.length > best.href.length ? item : best));
}
