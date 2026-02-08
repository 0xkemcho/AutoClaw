import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function createSupabaseAdmin(url: string, serviceRoleKey: string) {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
