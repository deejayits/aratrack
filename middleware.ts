import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!api/|unlock|favicon|icon|apple-icon|manifest).*)"],
};

async function expectedToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`aratrack:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const pwd = process.env.SITE_PASSWORD;
  if (!pwd) return NextResponse.next();

  const got = req.cookies.get("aratrack_unlocked")?.value ?? "";
  const expected = await expectedToken(pwd);
  if (got === expected) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  const back = req.nextUrl.pathname + req.nextUrl.search;
  if (back && back !== "/") url.searchParams.set("next", back);
  else url.searchParams.delete("next");
  return NextResponse.redirect(url);
}
