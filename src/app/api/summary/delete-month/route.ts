export const runtime = "nodejs";

import { pool } from "../../../../lib/db";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

function getUserFromToken(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const token = cookieHeader
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      email: string;
    };
  } catch {
    return null;
  }
}

export async function DELETE(req: Request) {
  try {
    const user = getUserFromToken(req);

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
