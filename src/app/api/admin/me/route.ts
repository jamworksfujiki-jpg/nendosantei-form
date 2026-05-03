import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_session")?.value;
  if (!token) return NextResponse.json({ authenticated: false });
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return NextResponse.json({
      authenticated: true,
      username: payload.sub ?? null,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
