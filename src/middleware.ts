import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

const PUBLIC_API_PATHS = ["/api/admin/login", "/api/admin/logout", "/api/admin/me"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_session")?.value;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // fallthrough
    }
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
