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

// 📄 GET SINGLE ENTRY
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const user = getUserFromToken(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
WHERE id = $1::uuid AND user_id = $2::uuid
      `,
      [id, user.userId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: result.rows[0],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ✏️ UPDATE ENTRY
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const user = getUserFromToken(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { date, milk_type, liters, price_per_liter } = await req.json();
    const safeDate = date.split("T")[0];

    await pool.query(
      `
      UPDATE milk_entries
      SET date = $1, milk_type = $2, liters = $3, price_per_liter = $4
      WHERE id = $5::uuid AND user_id = $6::uuid
      `,
      [safeDate, milk_type, liters, price_per_liter, id, user.userId],
    );

    return NextResponse.json({ message: "Milk entry updated" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const user = getUserFromToken(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await pool.query(
      `
      DELETE FROM milk_entries
      WHERE id = $1::uuid AND user_id = $2::uuid
      RETURNING *
      `,
      [id, user.userId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Entry not found or not yours" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Milk entry deleted" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
