import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  event_type?: "feed" | "diaper";
  subtype?: "wet" | "dirty" | "both" | null;
  quantity_oz?: number | null;
  logged_by?: string;
  logged_at?: string;
};

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const secret = process.env.AUTOMATION_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "AUTOMATION_SECRET not configured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token !== secret) return unauthorized();

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const event_type = body.event_type;
  const logged_by = body.logged_by?.trim() || "Automation";
  if (event_type !== "feed" && event_type !== "diaper") {
    return NextResponse.json({ ok: false, error: "event_type must be 'feed' or 'diaper'" }, { status: 400 });
  }

  const row: Record<string, unknown> = {
    event_type,
    logged_by,
    logged_at: body.logged_at ?? new Date().toISOString(),
  };
  if (event_type === "feed") {
    const oz = Number(body.quantity_oz);
    if (!Number.isFinite(oz) || oz <= 0) {
      return NextResponse.json({ ok: false, error: "quantity_oz required for feed" }, { status: 400 });
    }
    row.quantity_oz = Math.round(oz * 10) / 10;
  } else {
    if (body.subtype !== "wet" && body.subtype !== "dirty" && body.subtype !== "both") {
      return NextResponse.json({ ok: false, error: "subtype must be wet|dirty|both" }, { status: 400 });
    }
    row.subtype = body.subtype;
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 500 });
  }

  const { data, error } = await supabase.from("events").insert(row).select().single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, event: data });
}
