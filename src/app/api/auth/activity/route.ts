export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUserFromRequest, recordSessionActivity } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.sessionId) {
      // Force activity record for explicit user actions
      await recordSessionActivity(user.sessionId, true);
    }

    const res = NextResponse.json({ success: true, timestamp: Date.now() });

    // Update client session metadata cookie
    res.cookies.set(
      "auth_session_meta",
      JSON.stringify({
        authenticated: true,
        lastActive: Date.now(),
      }),
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 14 * 24 * 60 * 60,
      },
    );

    return res;
  } catch (err) {
    console.error("Activity record error:", err);
    return NextResponse.json({ error: "Failed to record activity" }, { status: 500 });
  }
}
