import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/health", "/api/pdf-proxy"];
const PUBLIC_EXACT_PATHS = ["/meeting-schedule", "/admin"];
const STATIC_FILE_PATTERN = /\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map|txt|webmanifest)$/;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.includes(pathname)) {
    return true;
  }

  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico" || STATIC_FILE_PATTERN.test(pathname);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isStaticAsset(pathname) || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    const redirectTarget = `${pathname}${search}`;
    loginUrl.searchParams.set("redirect", redirectTarget);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
