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

// 🔎 GET PROFILE
export async function GET(req: Request) {
  try {
    const user = getUserFromToken(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await pool.query(
      `
      SELECT 
        name,
        address,
        mobile,
        default_cow_price,
        default_buffalo_price
      FROM users
      WHERE id = $1
      `,
      [user.userId],
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ✏️ UPDATE PROFILE
export async function PUT(req: Request) {
  try {
    const user = getUserFromToken(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, address, mobile, default_cow_price, default_buffalo_price } =
      await req.json();
    // Validate mobile number
    if (mobile && !/^[0-9]{10}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Mobile number must be 10 digits" },
        { status: 400 },
      );
    }

    if (default_cow_price !== undefined && Number(default_cow_price) < 0) {
      return NextResponse.json({ error: "Invalid cow price" }, { status: 400 });
    }

    if (
      default_buffalo_price !== undefined &&
      Number(default_buffalo_price) < 0
    ) {
      return NextResponse.json(
        { error: "Invalid buffalo price" },
        { status: 400 },
      );
    }

    await pool.query(
      `
UPDATE users
SET
  name = $1,
  address = $2,
  mobile = $3,
  default_cow_price = $4,
  default_buffalo_price = $5
WHERE id = $6
`,
      [
        name ?? null,
        address ?? null,
        mobile ?? null,
        default_cow_price ?? null,
        default_buffalo_price ?? null,
        user.userId,
      ],
    );

    return NextResponse.json({ message: "Profile updated" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
