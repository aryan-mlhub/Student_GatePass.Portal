import { NextResponse, type NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. Allow public routes, assets, and auth APIs
  if (
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/api/health") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  // 2. Allow if user has active campus session cookie
  const sessionCookie = req.cookies.get("gp_session")?.value;
  if (sessionCookie) {
    return NextResponse.next();
  }

  // 3. For protected portal pages without a session cookie, redirect to /login
  if (
    path.startsWith("/student") ||
    path.startsWith("/mentor") ||
    path.startsWith("/hod") ||
    path.startsWith("/security") ||
    path.startsWith("/admin")
  ) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

