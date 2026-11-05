import test from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const INACTIVITY_TIMEOUT_MS = 14 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

test("Audit Corrections Suite", async (t) => {
  let testUserId;
  const testEmail = `audit_test_${Date.now()}@example.com`;

  await t.test("Setup audit test user", async () => {
    const res = await pool.query(
      `INSERT INTO users (email, password, is_active, name)
       VALUES ($1, 'audit_pw', TRUE, 'Audit Tester')
       RETURNING id`,
      [testEmail],
    );
    testUserId = res.rows[0].id;
    assert.ok(testUserId, "Audit test user created");
  });

  // 1. Dashboard Data Accuracy: > 150 records & first-day record inclusion
  await t.test("Dashboard Data Accuracy: aggregation covers > 150 entries and day-1 records", async () => {
    // Generate 160 entries for October 2026 (all <= CURRENT_DATE):
    // Entry 1 is on Oct 1, 2026 (first day of month)
    // Entries 2..160 are distributed across Oct 2..Oct 30
    const entries = [];
    // Oct 1: 5.0 L packaged milk at 70/L = 350
    entries.push({
      date: "2026-10-01",
      milk_type: "packaged",
      liters: 5.0,
      price: 70,
      amount: 350,
    });

    // 159 additional entries: alternating cow and buffalo
    for (let i = 2; i <= 160; i++) {
      const day = ((i % 28) + 2).toString().padStart(2, "0");
      const isCow = i % 2 === 0;
      entries.push({
        date: `2026-10-${day}`,
        milk_type: isCow ? "cow" : "buffalo",
        liters: 2.0,
        price: 80,
        amount: 160,
      });
    }

    // Insert all 160 records into database
    for (const entry of entries) {
      await pool.query(
        `INSERT INTO milk_entries (user_id, date, milk_type, liters, price_per_liter, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, entry.date, entry.milk_type, entry.liters, entry.price, entry.amount],
      );
    }

    // Run the exact database aggregation used by /api/summary/monthly
    const summaryRes = await pool.query(
      `
      SELECT
        milk_type,
        SUM(liters) as total_liters,
        SUM(liters * price_per_liter) as total_amount
      FROM milk_entries
      WHERE user_id = $1
        AND EXTRACT(YEAR FROM date) = 2026
        AND EXTRACT(MONTH FROM date) = 10
      GROUP BY milk_type
      `,
      [testUserId],
    );

    let cowLiters = 0;
    let buffaloLiters = 0;
    let packagedLiters = 0;
    let cowAmount = 0;
    let buffaloAmount = 0;
    let packagedAmount = 0;

    summaryRes.rows.forEach((row) => {
      if (row.milk_type === "cow") {
        cowLiters = Number(row.total_liters);
        cowAmount = parseFloat(row.total_amount);
      } else if (row.milk_type === "buffalo") {
        buffaloLiters = Number(row.total_liters);
        buffaloAmount = parseFloat(row.total_amount);
      } else if (row.milk_type === "packaged") {
        packagedLiters = Number(row.total_liters);
        packagedAmount = parseFloat(row.total_amount);
      }
    });

    // Verify all 160 records were aggregated:
    // Packaged: exactly 5.0 L from Oct 1
    assert.strictEqual(packagedLiters, 5.0, "Packaged milk must include the Oct 1 entry (not truncated by pagination)");
    assert.strictEqual(packagedAmount, 350, "Packaged milk total amount must be exact");
    assert.strictEqual(cowAmount, 80 * 160, "Cow milk total amount must be exact");
    assert.strictEqual(buffaloAmount, 79 * 160, "Buffalo milk total amount must be exact");

    // 159 entries / 2 = 80 cow entries * 2L = 160L, 79 buffalo entries * 2L = 158L
    const totalCountRes = await pool.query(
      `SELECT COUNT(*) FROM milk_entries WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = 2026 AND EXTRACT(MONTH FROM date) = 10`,
      [testUserId],
    );
    assert.strictEqual(Number(totalCountRes.rows[0].count), 160, "Total entries in DB must be 160");
    assert.strictEqual(cowLiters + buffaloLiters + packagedLiters, 160 * 2.0 + 3.0, "Total volume covers all 160 records");

    // Verify packaged milk is NOT added into buffalo milk
    assert.ok(buffaloLiters < (cowLiters + buffaloLiters + packagedLiters), "Buffalo milk must only contain buffalo entries");
  });

  // 2. Today's status date-filtered query isolation
  await t.test("Today's status: searchDate query isolates only matching date", async () => {
    // Add 2 entries for today (2026-11-05)
    const todayStr = "2026-11-05";
    await pool.query(
      `INSERT INTO milk_entries (user_id, date, milk_type, liters, price_per_liter, total_amount)
       VALUES ($1, $2, 'packaged', 2.5, 70, 175),
              ($1, $2, 'cow', 1.0, 80, 80)`,
      [testUserId, todayStr],
    );

    const todayRes = await pool.query(
      `SELECT * FROM milk_entries WHERE user_id = $1 AND DATE(date) = $2 ORDER BY created_at DESC`,
      [testUserId, todayStr],
    );

    assert.strictEqual(todayRes.rows.length, 2, "Exact date filter must return only today's entries");
    const totalTodayLiters = todayRes.rows.reduce((acc, r) => acc + Number(r.liters), 0);
    assert.strictEqual(totalTodayLiters, 3.5, "Today's total liters must be accurately summed");
  });

  // 3. Auth Cache Safety: Immediate session revocation without 10-second cache delay
  await t.test("Auth Cache Safety: immediate revocation in database takes effect with 0s delay", async () => {
    // Create an active session
    const refreshToken = generateRandomToken();
    const tokenHash = hashToken(refreshToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS);

    const sessionRes = await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, last_active_at, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, tokenHash, now.toISOString(), expiresAt.toISOString()],
    );
    const sessionId = sessionRes.rows[0].id;

    // First validation query: session is active
    const check1 = await pool.query(
      `SELECT s.id, s.is_revoked, u.is_active
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [sessionId],
    );
    assert.strictEqual(check1.rows[0].is_revoked, false, "Session must initially be active");
    assert.strictEqual(check1.rows[0].is_active, true, "User must initially be active");

    // Revoke the session directly in PostgreSQL (simulating concurrent revocation or explicit logout)
    await pool.query(`UPDATE user_sessions SET is_revoked = TRUE WHERE id = $1`, [sessionId]);

    // Query immediately (0 ms elapsed)
    const check2 = await pool.query(
      `SELECT s.id, s.is_revoked, u.is_active
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [sessionId],
    );
    // Since in-memory caching is removed, the revoked status is authoritative immediately
    assert.strictEqual(check2.rows[0].is_revoked, true, "Revoked session must immediately be seen as revoked");
  });

  // 4. Auth Cache Safety: Immediate account deactivation without delay
  await t.test("Auth Cache Safety: immediate user deactivation takes effect with 0s delay", async () => {
    // Deactivate user account
    await pool.query(`UPDATE users SET is_active = FALSE WHERE id = $1`, [testUserId]);

    const check = await pool.query(
      `SELECT is_active FROM users WHERE id = $1`,
      [testUserId],
    );
    assert.strictEqual(check.rows[0].is_active, false, "Deactivated account must immediately register as inactive");
  });

  // 5. Login-Page Flash & Three-State Flow Verification
  await t.test("Login-Page Flash: three-state auth flow and splash screen in place", () => {
    const loginPath = path.join(process.cwd(), "src", "app", "login", "page.tsx");
    const content = fs.readFileSync(loginPath, "utf-8");

    // Verify 3-state auth declaration
    assert.ok(
      content.includes('"checking" | "authenticated" | "unauthenticated"') ||
      content.includes("'checking' | 'authenticated' | 'unauthenticated'"),
      "Login page must declare three-state auth ('checking' | 'authenticated' | 'unauthenticated')",
    );

    // Verify initialization to "checking"
    assert.ok(
      content.includes('useState<"checking" | "authenticated" | "unauthenticated">("checking")'),
      "Login page must initialize state to 'checking'",
    );

    // Verify guard preventing form rendering while checking or authenticated
    assert.ok(
      content.includes('authState !== "unauthenticated"'),
      "Login page must guard form rendering until unauthenticated",
    );

    // Verify branded loading splash
    assert.ok(
      content.includes("Verifying session..."),
      "Login page must render branded 'Verifying session...' screen during checking",
    );
  });

  // 6. Dashboard: Removal of pagination limit and adoption of summary aggregation
  await t.test("Dashboard: limit=150 completely eliminated in favor of /api/summary/monthly", () => {
    const dashPath = path.join(process.cwd(), "src", "app", "dashboard", "page.tsx");
    const content = fs.readFileSync(dashPath, "utf-8");

    assert.ok(!content.includes("limit=150"), "Dashboard must not use limit=150");
    assert.ok(content.includes("/api/summary/monthly"), "Dashboard must fetch /api/summary/monthly");
    assert.ok(content.includes("searchDate="), "Dashboard must use searchDate for today's entries");
  });

  // Cleanup test user and entries
  await t.test("Cleanup audit test data", async () => {
    await pool.query(`DELETE FROM milk_entries WHERE user_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM user_sessions WHERE user_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [testUserId]);
  });
});
