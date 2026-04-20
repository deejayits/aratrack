import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getServerSupabase() {
  if (!url || !(serviceKey || anonKey)) return null;
  return createClient(url, serviceKey ?? anonKey!, {
    auth: { persistSession: false },
  });
}
