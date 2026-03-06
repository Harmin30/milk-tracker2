export const runtime = "nodejs";

import { pool } from "../../../lib/db";
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

// 🥛 ADD MILK ENTRY
export async function POST(req: Request) {
  try {
    const user = getUserFromToken(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { date, milk_type, liters, price_per_liter } = body;
    const safeDate = date.split("T")[0];

    if (!date || !milk_type || liters === undefined) {
      return NextResponse.json(
        { error: "Date, milk type and liters are required" },
        { status: 400 },
      );
    }

    if (!["cow", "buffalo"].includes(milk_type)) {
      return NextResponse.json({ error: "Invalid milk type" }, { status: 400 });
    }

    const todayString = new Date().toISOString().split("T")[0];

    if (safeDate > todayString) {
      return NextResponse.json(
        { error: "Future date not allowed" },
        { status: 400 },
      );
    }

    const litersNumber = Number(liters);

    if (isNaN(litersNumber) || litersNumber <= 0) {
      return NextResponse.json(
        { error: "Liters must be greater than 0" },
        { status: 400 },
      );
    }

    let finalPrice = price_per_liter;

    // If price not provided, fetch from profile
    if (finalPrice === undefined || finalPrice === null) {
      const profile = await pool.query(
        `
        SELECT default_cow_price, default_buffalo_price
        FROM users
        WHERE id = $1
        `,
        [user.userId],
      );

      const userProfile = profile.rows[0];

      if (!userProfile) {
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 400 },
        );
      }

      finalPrice =
        milk_type === "cow"
          ? userProfile.default_cow_price
          : userProfile.default_buffalo_price;

      if (!finalPrice) {
        return NextResponse.json(
          {
            error:
              "Please set default milk price in profile or enter price manually",
          },
          { status: 400 },
        );
      }
    }

    const priceNumber = Number(finalPrice);

    if (isNaN(priceNumber) || priceNumber <= 0) {
      return NextResponse.json(
        { error: "Price must be greater than 0" },
        { status: 400 },
      );
    }

    const total_amount = litersNumber * priceNumber;

    const result = await pool.query(
      `
      INSERT INTO milk_entries 
      (user_id, date, milk_type, liters, price_per_liter, total_amount)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        user.userId,
        safeDate,
        milk_type,
        litersNumber,
        priceNumber,
        total_amount,
      ],
    );

    return NextResponse.json({
      message: "Milk entry added",
      entry: result.rows[0],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// 📄 GET USER MILK ENTRIES (WITH PAGINATION)
export async function GET(req: Request) {
  try {
    const user = getUserFromToken(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 6);

    const offset = (page - 1) * limit;

    const result = await pool.query(
      `
      SELECT 
      id,
      date::text as date,
      milk_type,
      liters,
      price_per_liter,
      total_amount
      FROM milk_entries
      WHERE user_id = $1
      ORDER BY date DESC
      LIMIT $2 OFFSET $3
      `,
      [user.userId, limit, offset],
    );

    const count = await pool.query(
      `
      SELECT COUNT(*)
      FROM milk_entries
      WHERE user_id = $1
      `,
      [user.userId],
    );

    return NextResponse.json({
      data: result.rows,
      total: Number(count.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
