import { NextResponse } from "next/server";
import { configuredPin, createToken, safeEqual, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";

export async function POST(request: Request) {
  const configured = configuredPin();
  if (!configured) {
    return NextResponse.json({ error: "No PIN is configured on the server" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!/^\d{4}$/.test(pin) || !safeEqual(pin, configured)) {
    // small delay blunts rapid guessing
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: await createToken(configured),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
