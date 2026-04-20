import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn("[AraTrack] Missing Supabase env vars — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "anon", {
  realtime: { params: { eventsPerSecond: 10 } },
});

export type EventRow = {
  id: string;
  event_type: "feed" | "diaper";
  subtype: "wet" | "dirty" | "both" | null;
  quantity_ml: number | null;
  logged_at: string;
  logged_by: string;
};
