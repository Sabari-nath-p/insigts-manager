/**
 * Default Knowledge Base taxonomy. categoryGroup/category are plain strings on
 * KnowledgeResource (same free-text pattern as User.department elsewhere in this
 * app), so admins can type a category outside this list too — it'll show up as a
 * filter option because the group/category chips are derived from whatever's
 * actually in use, this list just seeds the defaults and the create-form datalist.
 */
export interface CategoryGroup {
  group: string;
  categories: string[];
}

export const DEFAULT_CATEGORY_GROUPS: CategoryGroup[] = [
  { group: 'Company', categories: ['Company SOPs', 'Company Policies'] },
  {
    group: 'HR',
    categories: ['HR Policies', 'Leave Policy', 'Attendance Policy', 'Employee Guidelines'],
  },
  { group: 'Brand & Clients', categories: ['Brand Guidelines', 'Client Guidelines'] },
  { group: 'Departments', categories: ['Department SOPs', 'Department Guidelines'] },
  {
    group: 'Templates',
    categories: ['Proposal Templates', 'Report Templates', 'Presentation Templates', 'Other Templates'],
  },
  { group: 'Onboarding & Training', categories: ['Onboarding Documents', 'Training Materials'] },
  { group: 'Help', categories: ['FAQs', 'General Resources'] },
];

export const ALL_DEFAULT_CATEGORIES = DEFAULT_CATEGORY_GROUPS.flatMap((g) => g.categories);
