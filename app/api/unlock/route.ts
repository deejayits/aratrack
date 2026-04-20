import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function tokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(`aratrack:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SITE_PASSWORD not configured on the server" },
      { status: 500 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const supplied = typeof body.password === "string" ? body.password : "";
  if (supplied !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const token = await tokenFor(expected);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("aratrack_unlocked", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  return res;
}
