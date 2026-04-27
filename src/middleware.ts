import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/onboarding",
  "/claim",
  "/records",
  "/exams",
  "/appeals",
  "/payments",
  "/settings",
  "/admin",
];

/**
 * Edge middleware that enforces a session cookie before serving protected
 * routes. Full authorization (role, MFA) is enforced server-side in route
 * handlers and layouts via auth(); this is a fast pre-check.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const sessionCookie =
    req.cookies.get("authjs.session-token") ??
    req.cookies.get("__Secure-authjs.session-token");
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api/auth|api/sign-up|sign-in|sign-up|favicon.ico|$).*)"],
};
