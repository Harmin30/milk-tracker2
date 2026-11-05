export const runtime = "nodejs";

import { pool } from "../../../lib/db";
import { NextResponse, NextRequest } from "next/server";
import { getUserFromRequest } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT id, bill_type, year, month, from_date, to_date, total_amount, created_at
       FROM bills
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.userId],
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}