export type PmRole = 'admin' | 'staff';
export type ColumnType = 'todo' | 'doing' | 'review' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface PmMe {
  userId: string;
  role: PmRole;
  name: string;
  email: string;
}

export interface PmProject {
  id: string;
  key: string;
  name: string;
  color: string;
  description: string | null;
  status: 'active' | 'archived';
  createdBy: string;
  openTasks?: number;
}

export interface PmColumn {
  id: string;
  projectId: string;
  name: string;
  position: number;
  type: ColumnType;
}

export interface PmLabel {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

export interface PmMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  designation: string | null;
}

export interface PmTask {
  id: string;
  ref: string;
  projectId: string;
  projectKey: string;
  columnId: string;
  number: number;
  title: string;
  description: string | null;
  priority: Priority;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  position: number;
  createdBy: string;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  labelIds: string[];
  updateCount: number;
}

export interface BoardData {
  project: PmProject;
  columns: PmColumn[];
  labels: PmLabel[];
  tasks: PmTask[];
  olderDone: number;
  members: PmMember[];
}

export interface TaskUpdate {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface TaskActivity {
  id: string;
  type: string;
  actorId: string;
  actorName: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  taskRef?: string | null;
  taskTitle?: string | null;
}

export interface TaskDetail {
  task: PmTask;
  updates: TaskUpdate[];
  activity: TaskActivity[];
}

export interface MyWorkData {
  groups: { overdue: PmTask[]; today: PmTask[]; week: PmTask[]; later: PmTask[]; none: PmTask[] };
  columns: PmColumn[];
}

export interface PmNotification {
  id: string;
  type: string;
  taskId: string | null;
  taskRef: string | null;
  taskTitle: string | null;
  actorName: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface TeamMember extends PmMember {
  openTasks: number;
  lastActive: string | null;
  pmRole: PmRole;
  pmRevoked: boolean;
}

export interface BoardFilters {
  assignee?: string;
  priority?: string;
  label?: string;
  due?: string;
  q?: string;
  olderDone?: string;
}

export interface InsightsData {
  range: { from: string; to: string };
  scope: { canMembers: boolean; project: string | null; member: string | null };
  summary: {
    open: number;
    completed: number;
    completedPrev: number;
    completedChangePct: number | null;
    overdue: number;
    medianCycleDays: number | null;
    onTimeRate: number | null;
  };
  throughput: { daily: Array<{ date: string; count: number }>; weekly: Array<{ date: string; count: number }> };
  burnup: { dates: string[]; created: number[]; completed: number[] };
  statusDistribution: Array<{ project: string; key: string; columns: Array<{ column: string; type: string; count: number }> }>;
  workload: Array<{ id: string | null; name: string; open: number; urgent: number; high: number; medium: number; low: number; highLoad: boolean }> | null;
  stuck: Array<{ id: string; ref: string; title: string; project: string; column: string; assigneeId: string | null; assignee: string | null; daysIdle: number }>;
  dueSoon: Array<{ id: string; ref: string; title: string; dueDate: string; overdue: boolean; assignee: string | null }>;
  priorityMix: Array<{ priority: string; count: number }>;
  health: Array<{ key: string; name: string; color: string; open: number; doneInRange: number; overdue: number; stuck: number; status: 'On track' | 'At risk' | 'Behind' }>;
  takeaways: { throughput: string; burnup: string; stuck: string; workload: string | null; due: string };
}

export interface MyStats {
  completedWeek: number;
  completedMonth: number;
  open: number;
  overdue: number;
  medianCycleDays: number | null;
  weekly: Array<{ date: string; count: number }>;
}
