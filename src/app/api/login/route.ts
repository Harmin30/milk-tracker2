export const runtime = "nodejs";

import { pool } from "../../../lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createSession, setAuthCookies } from "../../../lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, remember } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Check if user account is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact support." },
        { status: 403 },
      );
    }

    // Remember Me by Default with 14-day inactivity lifecycle
    const shouldRemember = remember !== false;

    // Create session in user_sessions table
    const { session, accessToken, refreshToken } = await createSession(
      user.id,
      req,
    );

    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      sessionId: session.id,
    });

    // Set secure HTTP-only cookies
    setAuthCookies(response, accessToken, refreshToken, shouldRemember);

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
