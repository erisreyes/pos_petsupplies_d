export type UserRole = 'admin' | 'staff' | 'manager';

export function isStaff(role: string | null | undefined): boolean {
  return role === 'staff';
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === 'admin';
}
