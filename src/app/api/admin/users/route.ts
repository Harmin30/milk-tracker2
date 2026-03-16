export const runtime = "nodejs";

import { pool } from "../../../../lib/db";
import { NextResponse } from "next/server";
import { verifyAdminAccess } from "../../../../lib/adminAuth";

export async function GET(req: Request) {
  try {
    const admin = await verifyAdminAccess(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query(`
      SELECT 
        id,
        email,
        name,
        mobile,
        created_at,
        is_active
      FROM users
      WHERE is_admin = FALSE
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await verifyAdminAccess(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, is_active } = await req.json();

    if (!userId || is_active === undefined) {
      return NextResponse.json(
        { error: "userId and is_active are required" },
        { status: 400 },
      );
    }

    await pool.query("UPDATE users SET is_active = $1 WHERE id = $2", [
      is_active,
      userId,
    ]);

    return NextResponse.json({
      message: `User ${is_active ? "activated" : "deactivated"} successfully`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await verifyAdminAccess(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Delete user's milk entries first
    await pool.query("DELETE FROM milk_entries WHERE user_id = $1", [userId]);

    // Then delete the user
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    return NextResponse.json({
      message: "User account and all associated data deleted successfully",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
