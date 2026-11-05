export const runtime = "nodejs";

import { pool } from "../../../../lib/db";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../lib/auth";

export async function DELETE(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { year, month } = await req.json();

    if (!year || !month) {
      return NextResponse.json(
        { error: "Year and month required" },
        { status: 400 },
      );
    }

    // DELETE MILK ENTRIES
    await pool.query(
      `
      DELETE FROM milk_entries
      WHERE user_id = $1
      AND EXTRACT(YEAR FROM date) = $2
      AND EXTRACT(MONTH FROM date) = $3
      `,
      [user.userId, year, month],
    );

    // DELETE BILL OF SAME MONTH
    await pool.query(
      `
      DELETE FROM bills
      WHERE user_id = $1
      AND year = $2
      AND month = $3
      `,
      [user.userId, year, month],
    );

    return NextResponse.json({
      message: "All entries and related bill for this month deleted",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
