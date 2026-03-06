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
        { status: 400 },
      );
    }

    const result = await pool.query(
      `
  SELECT
    milk_type,
    SUM(liters) as total_liters,
    SUM(liters * price_per_liter) as total_amount
  FROM milk_entries
  WHERE user_id = $1
    AND EXTRACT(YEAR FROM date) = $2
    AND EXTRACT(MONTH FROM date) = $3
  GROUP BY milk_type
  `,
      [user.userId, year, month],
    );

    const rateResult = await pool.query(
      `
  SELECT milk_type, price_per_liter
  FROM milk_entries
  WHERE user_id = $1
    AND EXTRACT(YEAR FROM date) = $2
    AND EXTRACT(MONTH FROM date) = $3
  `,
      [user.userId, year, month],
    );

    let cow_liters = 0;
    let buffalo_liters = 0;
    let cow_amount = 0;
    let buffalo_amount = 0;
    const cowRates = new Set<number>();
    const buffaloRates = new Set<number>();

    result.rows.forEach((row) => {
      if (row.milk_type === "cow") {
        cow_liters = Number(row.total_liters);
        cow_amount = parseFloat(row.total_amount);
      } else if (row.milk_type === "buffalo") {
        buffalo_liters = Number(row.total_liters);
        buffalo_amount = parseFloat(row.total_amount);
      }
    });
    rateResult.rows.forEach((row) => {
      if (row.milk_type === "cow") {
        cowRates.add(Number(row.price_per_liter));
      } else if (row.milk_type === "buffalo") {
        buffaloRates.add(Number(row.price_per_liter));
      }
    });

    const total_liters = cow_liters + buffalo_liters;
    const total_amount = cow_amount + buffalo_amount;

    let cow_rate = 0;
    let buffalo_rate = 0;

    let cow_rate_changed = false;
    let buffalo_rate_changed = false;

    // Cow rate logic
    if (cowRates.size === 1) {
      cow_rate = [...cowRates][0];
    } else if (cowRates.size > 1 && cow_liters > 0) {
      cow_rate = cow_amount / cow_liters;
      cow_rate_changed = true;
    }

    // Buffalo rate logic
    if (buffaloRates.size === 1) {
      buffalo_rate = [...buffaloRates][0];
    } else if (buffaloRates.size > 1 && buffalo_liters > 0) {
      buffalo_rate = buffalo_amount / buffalo_liters;
      buffalo_rate_changed = true;
    }
    return NextResponse.json({
      cow_liters,
      buffalo_liters,
      cow_rate,
      buffalo_rate,
      cow_rate_changed,
      buffalo_rate_changed,
      cow_amount,
      buffalo_amount,
      total_liters,
      total_amount,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
