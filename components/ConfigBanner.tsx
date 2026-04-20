"use client";

import { supabaseConfigured } from "@/lib/supabase";

export function ConfigBanner() {
  if (supabaseConfigured) return null;
  return (
    <div className="bg-rose-950/70 border-b border-rose-800 text-rose-100 text-sm px-4 py-3 text-center">
      Supabase env vars are missing. Set{" "}
      <code className="text-rose-200">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="text-rose-200">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then redeploy.
    </div>
  );
}
