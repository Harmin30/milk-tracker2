export const runtime = "nodejs";

import { pool } from "../../../lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await pool.query("SELECT * FROM users");
    return NextResponse.json({ data: result.rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}