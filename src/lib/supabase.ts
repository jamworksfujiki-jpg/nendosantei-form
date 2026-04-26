import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

let _service: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (_service) return _service;
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL', { required: true });
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY', { required: true });
  _service = createClient(url, key, { auth: { persistSession: false } });
  return _service;
}

export const STORAGE_BUCKET = 'application-files';
