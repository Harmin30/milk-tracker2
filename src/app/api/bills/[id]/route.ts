export const runtime = "nodejs";

import { pool } from "../../../../lib/db";
import { NextResponse, NextRequest } from "next/server";
import { getUserFromRequest } from "../../../../lib/auth";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const result = await pool.query(
      `DELETE FROM bills
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, user.userId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Bill deleted successfully" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
