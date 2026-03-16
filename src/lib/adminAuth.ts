import { pool } from "./db";
import jwt from "jsonwebtoken";

export function getAdminFromToken(req: Request) {
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

export async function verifyAdminAccess(req: Request) {
  const admin = getAdminFromToken(req);
  if (!admin) return null;

  const result = await pool.query(
    "SELECT id, email, is_admin FROM users WHERE id = $1",
    [admin.userId]
  );

  const user = result.rows[0];
  if (!user || !user.is_admin) return null;

  return user;
}
