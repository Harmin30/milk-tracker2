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

    // Total users count
    const totalUsersRes = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE is_admin = FALSE",
    );
    const total_users = Number(totalUsersRes.rows[0].count);

    // Active users count
    const activeUsersRes = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE is_admin = FALSE AND is_active = TRUE",
    );
    const active_users = Number(activeUsersRes.rows[0].count);

    // Inactive users count
    const inactive_users = total_users - active_users;

    // Total milk entries
    const totalEntriesRes = await pool.query(
      "SELECT COUNT(*) as count FROM milk_entries",
    );
    const total_milk_entries = Number(totalEntriesRes.rows[0].count);

    // Today's entries
    const todayRes = await pool.query(
      "SELECT COUNT(*) as count FROM milk_entries WHERE DATE(date) = CURRENT_DATE",
    );
    const today_entries = Number(todayRes.rows[0].count);

    // Monthly trend (last 12 months)
    const trendRes = await pool.query(`
      SELECT 
        TO_CHAR(date, 'Mon YYYY') as month,
        COUNT(*) as entries
      FROM milk_entries
      WHERE date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(date, 'Mon YYYY'), DATE_TRUNC('month', date)
      ORDER BY DATE_TRUNC('month', date) DESC
      LIMIT 12
    `);

    const monthly_trend = trendRes.rows.reverse();

    return NextResponse.json({
      total_users,
      active_users,
      inactive_users,
      total_milk_entries,
      today_entries,
      monthly_trend: monthly_trend.map((row) => ({
        month: row.month,
        entries: Number(row.entries),
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
