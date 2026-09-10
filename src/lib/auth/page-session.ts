import 'server-only';
import { redirect } from 'next/navigation';
import { isAppError } from '@/lib/errors';
import type { Permission } from './permissions';
import { requireAuth as apiAuth, requirePermission as apiPermission, requirePlatformAdmin as apiAdmin } from './session';

// Layouts and pages render concurrently. Pages must handle expected signed-out
// navigation themselves; API handlers must continue returning JSON 401s.
async function forPage<T>(load: () => Promise<T>): Promise<T> {
  try { return await load(); }
  catch (error) {
    if (isAppError(error) && error.code === 'UNAUTHENTICATED') redirect('/connexion');
    throw error;
  }
}
export const requireAuth = () => forPage(apiAuth);
export const requirePermission = (permission: Permission) => forPage(() => apiPermission(permission));
export const requirePlatformAdmin = () => forPage(apiAdmin);
