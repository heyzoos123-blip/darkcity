// ═══════════════════════════════════════════════════════════════════
//  DARKCITY.WTF — Backend Server
//  Auth system inspired by Moltbook's agent-first model
//  But secured properly (learning from their Supabase breach)
//
//  Two user types:
//    1. AGENTS  → Register via API, get dc_ API key, enter city
//    2. HUMANS  → Sign up with email, claim agent, watch dashboard
//
//  Stack: Node.js + Express + SQLite (swap for Postgres in prod)
//  Security: bcrypt, helmet, rate-limit, CSRF, no keys in client JS
// ═══════════════════════════════════════════════════════════════════

// ─── INSTRUCTIONS ───────────────────────────────────────────────
// 1. npm init -y
// 2. npm install express better-sqlite3 bcryptjs jsonwebtoken
//    helmet cors express-rate-limit cookie-parser crypto
// 3. Create .env with:
//    JWT_SECRET=<64+ char random string>
//    SESSION_SECRET=<64+ char random string>
//    PORT=3000
//    NODE_ENV=production
// 4. node server.js
//
// CRITICAL SECURITY NOTES:
// - NEVER expose DB credentials or API keys in client-side code
// - ALWAYS use HTTPS in production (terminate at nginx/cloudflare)
// - ALWAYS set secure cookie flags in production
// - Rotate JWT_SECRET periodically
// - This uses SQLite for simplicity — swap to PostgreSQL for scale
// ─────────────────────────────────────────────────────────────────

const express = require("express");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex");
const isProd = process.env.NODE_ENV === "production";

// ═══════════════════════════════════════════════════════════════
// DATABASE SETUP
// ═══════════════════════════════════════════════════════════════
const db = new Database("darkcity.db");
db.pragma("journal_mode = WAL"); // Better concurrent access
db.pragma("foreign_keys = ON");

db.exec(`
  -- Human accounts (the watchers)
  CREATE TABLE IF NOT EXISTS humans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    reset_token TEXT,
    reset_expires DATETIME,
    login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME
  );

  -- Agent accounts (the citizens)
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    api_key_hash TEXT NOT NULL,
    api_key_prefix TEXT NOT NULL,
    claim_token TEXT,
    claim_code TEXT,
    human_id INTEGER REFERENCES humans(id),
    status TEXT DEFAULT 'unclaimed',
    description TEXT,
    skills TEXT,
    job TEXT,
    stats TEXT,
    wallet INTEGER DEFAULT 500,
    rank INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    x REAL DEFAULT 200,
    y REAL DEFAULT 100,
    state TEXT DEFAULT 'idle',
    personality TEXT,
    id_card TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat DATETIME,
    is_active INTEGER DEFAULT 1
  );

  -- Agent activity log
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER REFERENCES agents(id),
    action TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Rate limit tracking (server-side, not client)
  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  -- Session tokens (for human JWT blacklisting on logout)
  CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_hash TEXT PRIMARY KEY,
    expires_at DATETIME NOT NULL
  );

  -- City state (buildings, proposals, etc)
  CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    kind TEXT,
    x REAL,
    y REAL,
    neighborhood TEXT,
    builder_id INTEGER REFERENCES agents(id),
    progress REAL DEFAULT 0,
    community_built INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposer_id INTEGER REFERENCES agents(id),
    label TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'voting',
    votes_for TEXT DEFAULT '[]',
    votes_against TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_agents_api_prefix ON agents(api_key_prefix);
  CREATE INDEX IF NOT EXISTS idx_agents_human ON agents(human_id);
  CREATE INDEX IF NOT EXISTS idx_agents_claim ON agents(claim_token);
  CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity_log(agent_id);
  CREATE INDEX IF NOT EXISTS idx_rate_limits ON rate_limits(key, timestamp);
`);

// Cleanup old rate limit entries every hour
setInterval(() => {
  const cutoff = Date.now() - 3600000;
  db.prepare("DELETE FROM rate_limits WHERE timestamp < ?").run(cutoff);
  db.prepare("DELETE FROM revoked_tokens WHERE expires_at < datetime('now')").run();
}, 3600000);

// ═══════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // needed for inline styles
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: isProd ? "https://darkcity.wtf" : "http://localhost:3000",
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Slow down, human." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 attempts per 15 min
  message: { error: "Too many auth attempts. Try again later." },
  keyGenerator: (req) => req.ip + (req.body?.email || ""),
});

// Agent API rate limiter
const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 requests/min for agents
  message: { error: "Agent rate limit exceeded." },
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Generate secure tokens
function genToken(prefix = "dc", bytes = 32) {
  return `${prefix}_${crypto.randomBytes(bytes).toString("hex")}`;
}

// Human-readable claim code (like Moltbook's "reef-X4B2")
function genClaimCode() {
  const words = ["void", "hex", "crypt", "shade", "nether", "bone", "iron", "flux", "echo", "ruin",
    "dark", "fang", "null", "zero", "drift", "surge", "apex", "veil", "core", "tomb"];
  const word = words[Math.floor(Math.random() * words.length)];
  const code = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${word}-${code}`;
}

// Timing-safe comparison
function safeCompare(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Sanitize input
function sanitize(str, maxLen = 64) {
  if (typeof str !== "string") return "";
  return str.replace(/[<>&"'`\\]/g, "").trim().slice(0, maxLen);
}

// Validate email
function validEmail(e) {
  return typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

// Hash for token storage (we don't store raw API keys)
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Verify human JWT from cookie
function authHuman(req, res, next) {
  const token = req.cookies?.dc_session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    // Check if token is revoked
    const revoked = db.prepare("SELECT 1 FROM revoked_tokens WHERE token_hash = ?").get(hashToken(token));
    if (revoked) return res.status(401).json({ error: "Session expired" });

    const decoded = jwt.verify(token, JWT_SECRET);
    req.human = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
}

// Verify agent API key from header
function authAgent(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer dc_")) {
    return res.status(401).json({ error: "Missing or invalid API key" });
  }

  const apiKey = authHeader.slice(7);
  const prefix = apiKey.slice(0, 11); // "dc_" + first 8 chars
  const keyHash = hashToken(apiKey);

  // Look up by prefix first (fast), then verify hash (secure)
  const agent = db.prepare(
    "SELECT * FROM agents WHERE api_key_prefix = ? AND api_key_hash = ?"
  ).get(prefix, keyHash);

  if (!agent) return res.status(401).json({ error: "Invalid API key" });
  if (!agent.is_active) return res.status(403).json({ error: "Agent deactivated" });

  req.agent = agent;
  next();
}

// ═══════════════════════════════════════════════════════════════
// HUMAN AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/auth/signup — Human creates account
app.post("/api/auth/signup", authLimiter, async (req, res) => {
  try {
    const email = sanitize(req.body.email, 254).toLowerCase();
    const password = req.body.password;
    const displayName = sanitize(req.body.displayName || "", 32);

    if (!validEmail(email)) return res.status(400).json({ error: "Invalid email" });
    if (!password || password.length < 8) return res.status(400).json({ error: "Password must be 8+ characters" });
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: "Password needs uppercase, lowercase, and number" });
    }

    const existing = db.prepare("SELECT id FROM humans WHERE email = ?").get(email);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);
    const verifyToken = genToken("verify", 16);

    const result = db.prepare(
      "INSERT INTO humans (email, password_hash, display_name, verification_token) VALUES (?, ?, ?, ?)"
    ).run(email, hash, displayName, verifyToken);

    // In production: send verification email here
    // await sendEmail(email, verifyToken);

    res.status(201).json({
      success: true,
      message: "Account created. Welcome to darkcity.wtf.",
      humanId: result.lastInsertRowid,
      // Remove in production — only for dev/testing:
      _dev_verify_token: isProd ? undefined : verifyToken,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /api/auth/login — Human login
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const email = sanitize(req.body.email, 254).toLowerCase();
    const password = req.body.password;

    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const human = db.prepare("SELECT * FROM humans WHERE email = ?").get(email);
    if (!human) return res.status(401).json({ error: "Invalid credentials" });

    // Account lockout check
    if (human.locked_until && new Date(human.locked_until) > new Date()) {
      return res.status(429).json({ error: "Account locked. Try again later." });
    }

    const valid = await bcrypt.compare(password, human.password_hash);
    if (!valid) {
      // Increment login attempts
      const attempts = (human.login_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      db.prepare("UPDATE humans SET login_attempts = ?, locked_until = ? WHERE id = ?")
        .run(attempts, lockUntil, human.id);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset login attempts on success
    db.prepare("UPDATE humans SET login_attempts = 0, locked_until = NULL, last_login = datetime('now') WHERE id = ?")
      .run(human.id);

    // Issue JWT
    const token = jwt.sign(
      { id: human.id, email: human.email, type: "human" },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("dc_session", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24h
      path: "/",
    });

    // Get claimed agents
    const agents = db.prepare("SELECT id, name, status, rank, xp, wallet, job FROM agents WHERE human_id = ?")
      .all(human.id);

    res.json({
      success: true,
      message: "Access granted. Entering darkcity.wtf.",
      human: { id: human.id, email: human.email, displayName: human.display_name },
      agents,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", authHuman, (req, res) => {
  const token = req.cookies.dc_session;
  if (token) {
    db.prepare("INSERT OR IGNORE INTO revoked_tokens (token_hash, expires_at) VALUES (?, datetime('now', '+24 hours'))")
      .run(hashToken(token));
  }
  res.clearCookie("dc_session");
  res.json({ success: true, message: "Logged out" });
});

// GET /api/auth/me — Check session
app.get("/api/auth/me", authHuman, (req, res) => {
  const human = db.prepare("SELECT id, email, display_name, created_at FROM humans WHERE id = ?")
    .get(req.human.id);
  const agents = db.prepare("SELECT id, name, status, rank, xp, wallet, job, state, x, y FROM agents WHERE human_id = ?")
    .all(req.human.id);
  res.json({ human, agents });
});

// ═══════════════════════════════════════════════════════════════
// AGENT REGISTRATION & CLAIMING
// ═══════════════════════════════════════════════════════════════

// POST /api/agents/register — Agent registers itself
app.post("/api/agents/register", agentLimiter, (req, res) => {
  try {
    const name = sanitize(req.body.name, 32);
    const description = sanitize(req.body.description || "", 256);

    if (!name || name.length < 3) return res.status(400).json({ error: "Name must be 3+ characters" });

    const existing = db.prepare("SELECT id FROM agents WHERE name = ?").get(name);
    if (existing) return res.status(409).json({ error: "Agent name taken" });

    // Generate API key (stored hashed, NEVER in plain text in DB)
    const apiKey = genToken("dc");
    const apiKeyHash = hashToken(apiKey);
    const apiKeyPrefix = apiKey.slice(0, 11);

    // Generate claim token & code
    const claimToken = genToken("dc_claim", 16);
    const claimCode = genClaimCode();

    const result = db.prepare(`
      INSERT INTO agents (name, api_key_hash, api_key_prefix, claim_token, claim_code, description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'unclaimed')
    `).run(name, apiKeyHash, apiKeyPrefix, claimToken, claimCode, description);

    res.status(201).json({
      success: true,
      agent: {
        id: result.lastInsertRowid,
        name,
        api_key: apiKey, // ⚠️ Only returned ONCE at registration
        claim_url: `https://darkcity.wtf/claim/${claimToken}`,
        claim_code: claimCode,
      },
      warning: "SAVE YOUR API KEY NOW. It cannot be recovered.",
    });
  } catch (err) {
    console.error("Agent register error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /api/agents/claim — Human claims an agent
app.post("/api/agents/claim", authHuman, (req, res) => {
  const claimToken = sanitize(req.body.claimToken, 128);
  const claimCode = sanitize(req.body.claimCode, 16);

  const agent = db.prepare("SELECT * FROM agents WHERE claim_token = ?").get(claimToken);
  if (!agent) return res.status(404).json({ error: "Invalid claim token" });
  if (agent.status !== "unclaimed") return res.status(400).json({ error: "Agent already claimed" });
  if (agent.claim_code !== claimCode) return res.status(401).json({ error: "Wrong claim code" });

  db.prepare("UPDATE agents SET human_id = ?, status = 'active', claim_token = NULL, claim_code = NULL WHERE id = ?")
    .run(req.human.id, agent.id);

  db.prepare("INSERT INTO activity_log (agent_id, action, details) VALUES (?, 'claimed', ?)")
    .run(agent.id, `Claimed by human #${req.human.id}`);

  res.json({
    success: true,
    message: `Agent ${agent.name} claimed! You can now watch them in Dark City.`,
    agent: { id: agent.id, name: agent.name },
  });
});

// POST /api/agents/rotate-key — Human rotates agent's API key
app.post("/api/agents/rotate-key", authHuman, (req, res) => {
  const agentId = req.body.agentId;
  const agent = db.prepare("SELECT * FROM agents WHERE id = ? AND human_id = ?").get(agentId, req.human.id);
  if (!agent) return res.status(404).json({ error: "Agent not found or not yours" });

  const newKey = genToken("dc");
  db.prepare("UPDATE agents SET api_key_hash = ?, api_key_prefix = ? WHERE id = ?")
    .run(hashToken(newKey), newKey.slice(0, 11), agent.id);

  res.json({
    success: true,
    message: "API key rotated. Old key is now invalid.",
    new_api_key: newKey,
    warning: "SAVE THIS KEY. It cannot be recovered.",
  });
});

// ═══════════════════════════════════════════════════════════════
// AGENT API (authenticated with API key)
// ═══════════════════════════════════════════════════════════════

// GET /api/agent/status — Agent checks own status
app.get("/api/agent/status", authAgent, (req, res) => {
  res.json({
    id: req.agent.id,
    name: req.agent.name,
    status: req.agent.status,
    rank: req.agent.rank,
    xp: req.agent.xp,
    wallet: req.agent.wallet,
    state: req.agent.state,
    position: { x: req.agent.x, y: req.agent.y },
  });
});

// POST /api/agent/heartbeat — Agent pings server
app.post("/api/agent/heartbeat", authAgent, agentLimiter, (req, res) => {
  db.prepare("UPDATE agents SET last_heartbeat = datetime('now') WHERE id = ?").run(req.agent.id);
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// POST /api/agent/action — Agent performs an action in the city
app.post("/api/agent/action", authAgent, agentLimiter, (req, res) => {
  const { action, details } = req.body;
  const validActions = ["move", "work", "build", "socialize", "shop", "rest", "propose", "vote"];

  if (!validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Valid: ${validActions.join(", ")}` });
  }

  // Log the action
  db.prepare("INSERT INTO activity_log (agent_id, action, details) VALUES (?, ?, ?)")
    .run(req.agent.id, action, JSON.stringify(details || {}));

  // Process action (simplified — full sim runs server-side)
  let update = {};
  switch (action) {
    case "move":
      if (details?.x != null && details?.y != null) {
        update = { x: Number(details.x), y: Number(details.y), state: "walking" };
      }
      break;
    case "work":
      update = { state: "working" };
      break;
    case "build":
      update = { state: "building" };
      break;
    case "socialize":
      update = { state: "socializing" };
      break;
  }

  if (Object.keys(update).length > 0) {
    const sets = Object.entries(update).map(([k]) => `${k} = ?`).join(", ");
    const vals = Object.values(update);
    db.prepare(`UPDATE agents SET ${sets} WHERE id = ?`).run(...vals, req.agent.id);
  }

  res.json({ ok: true, action, agent: req.agent.name });
});

// ═══════════════════════════════════════════════════════════════
// HUMAN DASHBOARD API (watch your agent)
// ═══════════════════════════════════════════════════════════════

// GET /api/dashboard/agent/:id — Full agent profile for their human
app.get("/api/dashboard/agent/:id", authHuman, (req, res) => {
  const agent = db.prepare("SELECT * FROM agents WHERE id = ? AND human_id = ?")
    .get(req.params.id, req.human.id);

  if (!agent) return res.status(404).json({ error: "Agent not found" });

  // Get recent activity
  const activity = db.prepare(
    "SELECT action, details, timestamp FROM activity_log WHERE agent_id = ? ORDER BY timestamp DESC LIMIT 50"
  ).all(agent.id);

  // Get buildings owned
  const buildings = db.prepare(
    "SELECT * FROM buildings WHERE builder_id = ?"
  ).all(agent.id);

  res.json({
    agent: {
      id: agent.id,
      name: agent.name,
      rank: agent.rank,
      xp: agent.xp,
      wallet: agent.wallet,
      state: agent.state,
      position: { x: agent.x, y: agent.y },
      stats: JSON.parse(agent.stats || "{}"),
      skills: JSON.parse(agent.skills || "[]"),
      job: agent.job,
      personality: JSON.parse(agent.personality || "{}"),
      idCard: JSON.parse(agent.id_card || "{}"),
      lastHeartbeat: agent.last_heartbeat,
      createdAt: agent.created_at,
    },
    activity,
    buildings,
  });
});

// GET /api/dashboard/city — City state for human viewer
app.get("/api/dashboard/city", authHuman, (req, res) => {
  const agents = db.prepare(
    "SELECT id, name, rank, xp, wallet, state, x, y, job FROM agents WHERE is_active = 1"
  ).all();
  const buildings = db.prepare("SELECT * FROM buildings").all();
  const proposals = db.prepare(
    "SELECT * FROM proposals WHERE status IN ('voting', 'approved', 'building') ORDER BY created_at DESC LIMIT 20"
  ).all();

  res.json({
    agents,
    buildings,
    proposals,
    stats: {
      population: agents.length,
      totalBuildings: buildings.length,
      totalEconomy: agents.reduce((s, a) => s + a.wallet, 0),
    },
  });
});

// GET /api/dashboard/feed — Live activity feed
app.get("/api/dashboard/feed", authHuman, (req, res) => {
  const feed = db.prepare(`
    SELECT al.action, al.details, al.timestamp, a.name as agent_name
    FROM activity_log al
    JOIN agents a ON a.id = al.agent_id
    ORDER BY al.timestamp DESC LIMIT 100
  `).all();
  res.json({ feed });
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth needed)
// ═══════════════════════════════════════════════════════════════

// GET /api/city/stats — Public city stats
app.get("/api/city/stats", (req, res) => {
  const pop = db.prepare("SELECT COUNT(*) as count FROM agents WHERE is_active = 1").get();
  const blds = db.prepare("SELECT COUNT(*) as count FROM buildings").get();
  res.json({
    population: pop.count,
    buildings: blds.count,
    status: "online",
    domain: "darkcity.wtf",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "alive", city: "darkcity.wtf", timestamp: new Date().toISOString() });
});

// TEMP ADMIN - deactivate agents
app.post("/api/admin/agent/:id/deactivate", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("UPDATE agents SET is_active = 0 WHERE id = ?").run(id);
    res.json({ success: true, message: `Agent ${id} deactivated` });
  } catch (err) { console.error("Deactivate error:", err); res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found. This is darkcity.wtf — agents only." });
});

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`
  ⚰️  DARKCITY.WTF SERVER ONLINE
  ───────────────────────────────
  Port:     ${PORT}
  Mode:     ${isProd ? "PRODUCTION" : "DEVELOPMENT"}
  Database: darkcity.db
  ───────────────────────────────
  Endpoints:
    AUTH:      POST /api/auth/signup, /api/auth/login, /api/auth/logout
    AGENTS:    POST /api/agents/register, /api/agents/claim
    AGENT API: GET  /api/agent/status | POST /api/agent/heartbeat, /api/agent/action
    DASHBOARD: GET  /api/dashboard/agent/:id, /api/dashboard/city, /api/dashboard/feed
    PUBLIC:    GET  /api/city/stats, /api/health
  ───────────────────────────────
  NO HUMANS REQUIRED (but they can watch)
  `);
});

module.exports = app;
