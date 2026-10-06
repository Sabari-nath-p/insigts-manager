import { can } from './pm-permissions';

const admin = { userId: 'a', role: 'admin' as const };
const staff = { userId: 's', role: 'staff' as const };

describe('can()', () => {
  it('lets admins do everything', () => {
    for (const action of ['project.edit', 'project.delete', 'team.manage', 'insights.workspace', 'insights.members', 'task.delete'] as const) {
      expect(can(admin, action)).toBe(true);
    }
  });

  it('lets staff create projects and edit tasks', () => {
    expect(can(staff, 'project.create')).toBe(true);
    expect(can(staff, 'task.create')).toBe(true);
    expect(can(staff, 'task.edit')).toBe(true);
  });

  it('only lets staff archive their own projects and delete their own tasks', () => {
    expect(can(staff, 'project.archive', { createdBy: 's' })).toBe(true);
    expect(can(staff, 'project.archive', { createdBy: 'other' })).toBe(false);
    expect(can(staff, 'project.archive')).toBe(false);
    expect(can(staff, 'task.delete', { createdBy: 's' })).toBe(true);
    expect(can(staff, 'task.delete', { createdBy: 'other' })).toBe(false);
  });

  it('keeps rename, delete, team and member insights admin-only', () => {
    for (const action of ['project.edit', 'project.delete', 'team.manage', 'insights.workspace', 'insights.members'] as const) {
      expect(can(staff, action, { createdBy: 's' })).toBe(false);
    }
  });
});
