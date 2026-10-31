/** One planned post on a day: "Video", "Poster", "GMB" or anything the team types. */
export interface CcPost {
  id: string;
  type: string;
  note: string;
}

export interface CcDay {
  posts: CcPost[];
  /** A special day such as Onam or Valentine's Day. */
  marker: { label: string } | null;
}

/** One client for one month. `days` is keyed by day-of-month ("1".."31"); empty days are left out. */
export interface CcCalendar {
  id: string;
  client: string;
  year: number;
  /** 0-11, like Date#getMonth(). */
  month: number;
  days: Record<string, CcDay>;
}

export interface CcMe {
  /** May add, change and delete calendars, posts and special days. Everyone else views. */
  canEdit: boolean;
  /** May decide who can edit (super admins). */
  canManage: boolean;
}

export interface CcAccessUser {
  id: string;
  fullName: string;
  email: string;
  canEdit: boolean;
}
