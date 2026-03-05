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

export async function GET(req: Request) {
  try {
    const user = getUserFromToken(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json(
        { error: "Year and month are required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        milk_type,
        SUM(liters) as total_liters,
        SUM(total_amount) as total_amount
      FROM milk_entries
      WHERE user_id = $1
        AND EXTRACT(YEAR FROM date) = $2
        AND EXTRACT(MONTH FROM date) = $3
      GROUP BY milk_type
      `,
      [user.userId, year, month]
    );

    let cow_liters = 0;
    let buffalo_liters = 0;
    let cow_amount = 0;
    let buffalo_amount = 0;

    result.rows.forEach((row) => {
      if (row.milk_type === "cow") {
        cow_liters = Number(row.total_liters);
        cow_amount = Number(row.total_amount);
      } else if (row.milk_type === "buffalo") {
        buffalo_liters = Number(row.total_liters);
        buffalo_amount = Number(row.total_amount);
      }
    });

    const total_liters = cow_liters + buffalo_liters;
    const total_amount = cow_amount + buffalo_amount;

    return NextResponse.json({
      cow_liters,
      buffalo_liters,
      cow_amount,
      buffalo_amount,
      total_liters,
      total_amount,
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}