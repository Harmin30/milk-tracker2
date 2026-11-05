export const runtime = "nodejs";

import { pool } from "../../../lib/db";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "../../../lib/auth";

// 🔎 GET PROFILE
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await pool.query(
      `
      SELECT 
        name,
        address,
        mobile,
        default_cow_price,
        default_buffalo_price,
        brand_milk_name,
        default_brand_price
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
    const user = await getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      name,
      address,
      mobile,
      default_cow_price,
      default_buffalo_price,
      brand_milk_name,
      default_brand_price,
    } = await req.json();
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

    if (default_brand_price !== undefined && Number(default_brand_price) < 0) {
      return NextResponse.json(
        { error: "Invalid brand milk price" },
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
  default_buffalo_price = $5,
  brand_milk_name = $6,
  default_brand_price = $7
WHERE id = $8
`,
      [
        name ?? null,
        address ?? null,
        mobile ?? null,
        default_cow_price ?? null,
        default_buffalo_price ?? null,
        brand_milk_name ?? "Packaged Milk",
        default_brand_price ?? null,
        user.userId,
      ],
    );

    return NextResponse.json({ message: "Profile updated" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
