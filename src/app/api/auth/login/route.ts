import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { db } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "paddytrace-production-cryptographic-secret-2026-secure"
);

export async function POST(request: NextRequest) {
  try {
    const { username, role } = await request.json();

    const user = await db.users.findUnique({
      where: { username: username || "officer_sindhanur" },
    });

    const targetUser = user || {
      id: "usr-demo",
      username: username || "officer_sindhanur",
      name: "Demo Officer",
      role: role || "OFFICER",
      centreId: "centre-raichur-01",
      isActive: true,
    };

    // Create session JWT
    const token = await new SignJWT({
      uid: targetUser.id,
      uname: targetUser.username,
      role: targetUser.role,
      cid: targetUser.centreId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    const response = NextResponse.json({ success: true, user: targetUser });
    response.cookies.set("paddytrace_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });

    return response;
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

