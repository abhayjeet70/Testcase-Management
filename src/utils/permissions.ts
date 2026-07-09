import { User, UserRole } from '../types';

export const PERMISSIONS = {
  admin: ['*'], // Has all permissions
  team_lead: [
    'project:view', 'project:create', 'project:edit', 'project:delete',
    'module:create', 'module:edit', 'module:delete',
    'testcase:view', 'testcase:create', 'testcase:edit', 'testcase:delete', 'testcase:execute',
    'bug:view', 'bug:report', 'bug:assign', 'bug:update_status', 'bug:resolve', 'bug:comment',
    'report:view', 'report:export',
    'template:manage',
    'document:import', 'document:export',
    'image:view_hd'
  ],
  developer: [
    'project:view',
    'bug:view', 'bug:report', 'bug:update_status', 'bug:resolve', 'bug:comment',
    'report:view',
    'document:export', 'document:view',
    'image:view_hd'
  ],
  tester: [
    'project:view',
    'testcase:view', 'testcase:create', 'testcase:edit', 'testcase:delete', 'testcase:execute',
    'bug:view', 'bug:report', 'bug:update_status', 'bug:comment', // cannot resolve
    'report:view', 'report:export',
    'document:export', 'document:view',
    'image:view_hd', 'image:upload'
  ],
  intern: [
    'project:view',
    'testcase:view', 'testcase:create', 'testcase:execute', // cannot edit/delete test cases
    'bug:view', 'bug:report', 'bug:comment', // cannot update status or resolve
    'document:view', 'document:export_limited',
    'image:view_hd'
  ]
};

export const hasPermission = (role: UserRole | undefined, action: string): boolean => {
  if (!role) return false;
  if (role === 'admin') return true;
  
  const rolePermissions = PERMISSIONS[role] || [];
  return rolePermissions.includes('*') || rolePermissions.includes(action);
};

export const can = (user: User | null, action: string): boolean => {
  if (!user || !user.isActive) return false;
  return hasPermission(user.role, action);
};
