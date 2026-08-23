import { NextResponse, type NextRequest } from "next/server";
import { configuredPin, SESSION_COOKIE, verifyToken } from "@/lib/auth";

/*
  PIN gate. With TABZ_PIN unset the app is open (local dev convenience);
  with it set, every page and API call needs a valid session cookie.
  Pages bounce to /pin, API calls get a 401.
*/
export async function proxy(request: NextRequest) {
  const pin = configuredPin();
  if (!pin) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const authed = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value, pin);

  if (pathname === "/pin") {
    return authed ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (authed) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "PIN required" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/pin", request.url));
}

export const config = {
  // everything except static assets, icons/manifest, and the login endpoint
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|api/auth).*)"],
};
