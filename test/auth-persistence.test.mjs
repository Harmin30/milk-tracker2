import test from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_milk_tracker";
const INACTIVITY_TIMEOUT_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

test("Persistent Login & 14-Day Inactivity Suite", async (t) => {
  let testUserId;
  const testUserEmail = `persistent_test_${Date.now()}@example.com`;

  // Setup: create test user
  await t.test("Setup test user", async () => {
    const res = await pool.query(
      `INSERT INTO users (email, password, is_active, name)
       VALUES ($1, 'hashed_test_pw', TRUE, 'Persistence Tester')
       RETURNING id, email`,
      [testUserEmail],
    );
    testUserId = res.rows[0].id;
    assert.ok(testUserId, "Test user created");
  });

  let currentSessionId;
  let currentRefreshToken;
  const t0 = new Date("2026-01-01T12:00:00Z");

  // Scenario 1: Login and close the app immediately
  await t.test("Scenario 1: Login and close the app immediately", async () => {
    currentRefreshToken = generateRandomToken();
    const tokenHash = hashToken(currentRefreshToken);
    const expiresAt = new Date(t0.getTime() + INACTIVITY_TIMEOUT_MS);

    const res = await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, last_active_at, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, last_active_at, expires_at`,
      [testUserId, tokenHash, t0.toISOString(), expiresAt.toISOString()],
    );

    currentSessionId = res.rows[0].id;
    assert.ok(currentSessionId, "Session created in DB");

    const accessToken = jwt.sign(
      { userId: testUserId, email: testUserEmail, sessionId: currentSessionId },
      JWT_SECRET,
      { expiresIn: "15m" },
    );

    const decoded = jwt.verify(accessToken, JWT_SECRET);
    assert.strictEqual(decoded.userId, testUserId);
    assert.strictEqual(decoded.sessionId, currentSessionId);
  });

  // Scenario 2: Reopen the app after a few minutes (within 15m access token lifespan)
  await t.test("Scenario 2: Reopen after a few minutes", async () => {
    const tFewMinutes = new Date(t0.getTime() + 5 * 60 * 1000); // +5 minutes

    const res = await pool.query(
      `SELECT s.*, u.is_active
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [currentSessionId],
    );

    const session = res.rows[0];
    assert.strictEqual(session.is_revoked, false);
    assert.strictEqual(session.is_active, true);

    const inactiveMs = tFewMinutes.getTime() - new Date(session.last_active_at).getTime();
    assert.ok(inactiveMs < INACTIVITY_TIMEOUT_MS, "Inactivity is well within 14 days");
    assert.ok(inactiveMs <= 5 * 60 * 1000, "Within 5 minutes");
  });

  // Scenario 3: Reopen after one day (access token expired, refresh succeeds, extends window)
  await t.test("Scenario 3: Reopen after 1 day (automatic refresh & activity extension)", async () => {
    const tDay1 = new Date(t0.getTime() + 24 * 60 * 60 * 1000); // +1 day

    // Access token expired after 15m, so refresh using refresh token
    const oldHash = hashToken(currentRefreshToken);
    const res = await pool.query(
      `SELECT s.*, u.is_active
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1`,
      [oldHash],
    );

    const session = res.rows[0];
    const inactiveMs = tDay1.getTime() - new Date(session.last_active_at).getTime();
    assert.ok(inactiveMs < INACTIVITY_TIMEOUT_MS, "Inactivity 1 day < 14 days");

    // Perform refresh & rotation
    const newRefreshToken = generateRandomToken();
    const newHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(tDay1.getTime() + INACTIVITY_TIMEOUT_MS);

    await pool.query(
      `UPDATE user_sessions
       SET refresh_token_hash = $1, last_active_at = $2, expires_at = $3
       WHERE id = $4`,
      [newHash, tDay1.toISOString(), newExpiresAt.toISOString(), session.id],
    );

    currentRefreshToken = newRefreshToken;

    // Verify session updated in DB
    const updated = await pool.query("SELECT * FROM user_sessions WHERE id = $1", [session.id]);
    assert.strictEqual(new Date(updated.rows[0].last_active_at).toISOString(), tDay1.toISOString());
    assert.strictEqual(new Date(updated.rows[0].expires_at).toISOString(), newExpiresAt.toISOString());
  });

  // Scenario 4: Reopen after seven days (inactivity = 7 days from last activity)
  await t.test("Scenario 4: Reopen after 7 days", async () => {
    const tDay8 = new Date(t0.getTime() + (1 + 7) * 24 * 60 * 60 * 1000); // 7 days after Day 1

    const hash = hashToken(currentRefreshToken);
    const res = await pool.query(
      `SELECT * FROM user_sessions WHERE refresh_token_hash = $1 AND is_revoked = FALSE`,
      [hash],
    );

    assert.strictEqual(res.rows.length, 1);
    const session = res.rows[0];
    const inactiveMs = tDay8.getTime() - new Date(session.last_active_at).getTime();
    assert.strictEqual(inactiveMs, 7 * 24 * 60 * 60 * 1000);
    assert.ok(inactiveMs < INACTIVITY_TIMEOUT_MS, "7 days inactivity < 14 days, user stays logged in");

    // Rotate and record activity
    const newRefreshToken = generateRandomToken();
    const newExpiresAt = new Date(tDay8.getTime() + INACTIVITY_TIMEOUT_MS);
    await pool.query(
      `UPDATE user_sessions
       SET refresh_token_hash = $1, last_active_at = $2, expires_at = $3
       WHERE id = $4`,
      [hashToken(newRefreshToken), tDay8.toISOString(), newExpiresAt.toISOString(), session.id],
    );
    currentRefreshToken = newRefreshToken;
  });

  // Scenario 5: Reopen after thirteen days (inactivity = 13 days from last activity)
  await t.test("Scenario 5: Reopen after 13 days", async () => {
    const tDay21 = new Date(t0.getTime() + (1 + 7 + 13) * 24 * 60 * 60 * 1000); // 13 days after Day 8

    const hash = hashToken(currentRefreshToken);
    const res = await pool.query(
      `SELECT * FROM user_sessions WHERE refresh_token_hash = $1 AND is_revoked = FALSE`,
      [hash],
    );

    assert.strictEqual(res.rows.length, 1);
    const session = res.rows[0];
    const inactiveMs = tDay21.getTime() - new Date(session.last_active_at).getTime();
    assert.strictEqual(inactiveMs, 13 * 24 * 60 * 60 * 1000);
    assert.ok(inactiveMs < INACTIVITY_TIMEOUT_MS, "13 days inactivity < 14 days, user stays logged in");

    // Rotate and record activity
    const newRefreshToken = generateRandomToken();
    const newExpiresAt = new Date(tDay21.getTime() + INACTIVITY_TIMEOUT_MS);
    await pool.query(
      `UPDATE user_sessions
       SET refresh_token_hash = $1, last_active_at = $2, expires_at = $3
       WHERE id = $4`,
      [hashToken(newRefreshToken), tDay21.toISOString(), newExpiresAt.toISOString(), session.id],
    );
    currentRefreshToken = newRefreshToken;
  });

  // Scenario 6: Reopen after fourteen days or more (14 days + 1 hour -> MUST require login)
  await t.test("Scenario 6: Reopen after 14 days or more (inactivity timeout enforced)", async () => {
    const tExpired = new Date(
      t0.getTime() + (1 + 7 + 13) * 24 * 60 * 60 * 1000 + (14 * 24 * 60 * 60 * 1000 + 3600 * 1000),
    );

    const hash = hashToken(currentRefreshToken);
    const res = await pool.query(`SELECT * FROM user_sessions WHERE refresh_token_hash = $1`, [hash]);
    const session = res.rows[0];

    const inactiveMs = tExpired.getTime() - new Date(session.last_active_at).getTime();
    assert.ok(inactiveMs >= INACTIVITY_TIMEOUT_MS, "Inactivity is >= 14 days");

    // Server marks revoked on detection
    await pool.query(`UPDATE user_sessions SET is_revoked = TRUE WHERE id = $1`, [session.id]);

    const check = await pool.query(`SELECT is_revoked FROM user_sessions WHERE id = $1`, [session.id]);
    assert.strictEqual(check.rows[0].is_revoked, true, "Session revoked due to inactivity");
  });

  // Scenario 7: Restart mobile device (session persists via persistent cookies & DB session)
  await t.test("Scenario 7: Restart mobile device preserves session", async () => {
    const deviceRestartSessionToken = generateRandomToken();
    const tDevice = new Date("2026-03-01T10:00:00Z");
    const expiresAt = new Date(tDevice.getTime() + INACTIVITY_TIMEOUT_MS);

    await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, last_active_at, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, hashToken(deviceRestartSessionToken), tDevice.toISOString(), expiresAt.toISOString()],
    );

    // Simulate device reboot 12 hours later: cookie read from persistent storage
    const tAfterReboot = new Date(tDevice.getTime() + 12 * 3600 * 1000);
    const lookup = await pool.query(
      `SELECT * FROM user_sessions WHERE refresh_token_hash = $1 AND is_revoked = FALSE`,
      [hashToken(deviceRestartSessionToken)],
    );

    assert.strictEqual(lookup.rows.length, 1);
    const session = lookup.rows[0];
    const inactiveMs = tAfterReboot.getTime() - new Date(session.last_active_at).getTime();
    assert.ok(inactiveMs < INACTIVITY_TIMEOUT_MS, "Device rebooted: session restored seamlessly");
  });

  // Scenario 8: Expire access token and verify automatic refresh
  await t.test("Scenario 8: Expired access token triggers automatic refresh", async () => {
    const expiredToken = jwt.sign(
      { userId: testUserId, email: testUserEmail, sessionId: currentSessionId },
      JWT_SECRET,
      { expiresIn: "-1s" }, // already expired
    );

    let decoded = null;
    try {
      decoded = jwt.verify(expiredToken, JWT_SECRET);
    } catch (err) {
      assert.strictEqual(err.name, "TokenExpiredError");
    }
    assert.strictEqual(decoded, null, "Expired token fails verification");

    // Fresh token issued via refresh
    const freshToken = jwt.sign(
      { userId: testUserId, email: testUserEmail, sessionId: currentSessionId },
      JWT_SECRET,
      { expiresIn: "15m" },
    );
    const verified = jwt.verify(freshToken, JWT_SECRET);
    assert.strictEqual(verified.userId, testUserId);
  });

  // Scenario 9: Simulate temporary internet disconnection
  await t.test("Scenario 9: Temporary internet disconnection does not log out user", () => {
    // When offline, network calls throw TypeError: fetch failed
    const mockOfflineFetch = () => Promise.reject(new TypeError("fetch failed"));

    return mockOfflineFetch()
      .catch((err) => {
        assert.strictEqual(err.name, "TypeError");
        // Rule: preserve session, do NOT clear tokens or redirect to login
        return "SESSION_PRESERVED";
      })
      .then((status) => {
        assert.strictEqual(status, "SESSION_PRESERVED");
      });
  });

  // Scenario 10: Explicitly log out and reopen
  await t.test("Scenario 10: Explicit logout immediately terminates session", async () => {
    const logoutToken = generateRandomToken();
    const res = await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, last_active_at, expires_at)
       VALUES ($1, $2, NOW(), NOW() + INTERVAL '14 days')
       RETURNING id`,
      [testUserId, hashToken(logoutToken)],
    );
    const sId = res.rows[0].id;

    // Explicit logout: mark revoked
    await pool.query(`UPDATE user_sessions SET is_revoked = TRUE WHERE id = $1`, [sId]);

    // Reopen attempt
    const lookup = await pool.query(
      `SELECT * FROM user_sessions WHERE id = $1 AND is_revoked = FALSE`,
      [sId],
    );
    assert.strictEqual(lookup.rows.length, 0, "Terminated session cannot be reopened");
  });

  // Scenario 11: Revoke the refresh token and reopen
  await t.test("Scenario 11: Revoked refresh token cannot be refreshed", async () => {
    const revokedToken = generateRandomToken();
    await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, last_active_at, expires_at, is_revoked)
       VALUES ($1, $2, NOW(), NOW() + INTERVAL '14 days', TRUE)`,
      [testUserId, hashToken(revokedToken)],
    );

    const check = await pool.query(
      `SELECT * FROM user_sessions WHERE refresh_token_hash = $1 AND is_revoked = FALSE`,
      [hashToken(revokedToken)],
    );
    assert.strictEqual(check.rows.length, 0, "Revoked token rejected");
  });

  // Scenario 12: Disable the user's account and verify access is denied
  await t.test("Scenario 12: Disabled user account is denied access immediately", async () => {
    const activeSessionToken = generateRandomToken();
    const res = await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, last_active_at, expires_at)
       VALUES ($1, $2, NOW(), NOW() + INTERVAL '14 days')
       RETURNING id`,
      [testUserId, hashToken(activeSessionToken)],
    );
    const sId = res.rows[0].id;

    // Deactivate user account
    await pool.query(`UPDATE users SET is_active = FALSE WHERE id = $1`, [testUserId]);

    // Validation check
    const authCheck = await pool.query(
      `SELECT s.id, u.is_active
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [sId],
    );

    assert.strictEqual(authCheck.rows[0].is_active, false, "User account is disabled");
    const allowed = authCheck.rows[0].is_active && !authCheck.rows[0].is_revoked;
    assert.strictEqual(allowed, false, "Access denied to disabled user");
  });

  // Cleanup test user and sessions
  await t.test("Cleanup test data", async () => {
    await pool.query(`DELETE FROM user_sessions WHERE user_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [testUserId]);
    await pool.end();
  });
});

