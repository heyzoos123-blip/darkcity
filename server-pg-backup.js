// ═══════════════════════════════════════════════════════════════════
//  DARKCITY.WTF — Backend Server (PostgreSQL Version)
//  
//  Railway-ready. No SQLite. No dotenv needed (Railway injects env).
//  
//  Required env vars on Railway:
//    DATABASE_URL  (auto-set when you add Postgres plugin)
//    JWT_SECRET    (set manually — run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
//    NODE_ENV      (set to "production")
//    PORT          (auto-set by Railway)
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const { Pool } = require("pg");
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
// DATABASE
// ═══════════════════════════════════════════════════════════════
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});

// Initialize tables
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS humans (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ,
        is_verified INTEGER DEFAULT 0,
        verification_token TEXT,
        reset_token TEXT,
        reset_expires TIMESTAMPTZ,
        login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_heartbeat TIMESTAMPTZ,
        is_active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id),
        action TEXT NOT NULL,
        details TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS revoked_tokens (
        token_hash TEXT PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS buildings (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        kind TEXT,
        x REAL,
        y REAL,
        neighborhood TEXT,
        builder_id INTEGER REFERENCES agents(id),
        progress REAL DEFAULT 0,
        community_built INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS proposals (
        id SERIAL PRIMARY KEY,
        proposer_id INTEGER REFERENCES agents(id),
        label TEXT NOT NULL,
        type TEXT,
        status TEXT DEFAULT 'voting',
        votes_for TEXT DEFAULT '[]',
        votes_against TEXT DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chronicle (
        id SERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        headline TEXT NOT NULL,
        body TEXT,
        agents_involved TEXT,
        neighborhood TEXT,
        significance INTEGER DEFAULT 1,
        day INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS daily_reports (
        id SERIAL PRIMARY KEY,
        day INTEGER UNIQUE NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Add home fields to agents if they don't exist
      DO $$ BEGIN
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS home_address TEXT;
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS home_neighborhood TEXT;
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS home_x REAL;
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS home_y REAL;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_agents_api_prefix ON agents(api_key_prefix);
      CREATE INDEX IF NOT EXISTS idx_agents_human ON agents(human_id);
      CREATE INDEX IF NOT EXISTS idx_agents_claim ON agents(claim_token);
      CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity_log(agent_id);
      CREATE INDEX IF NOT EXISTS idx_chronicle_day ON chronicle(day);
      CREATE INDEX IF NOT EXISTS idx_chronicle_significance ON chronicle(significance);
      CREATE INDEX IF NOT EXISTS idx_daily_reports_day ON daily_reports(day);
    `);
    console.log("⚰️ Database tables initialized");
  } finally {
    client.release();
  }
}

// Cleanup old revoked tokens every hour
setInterval(async () => {
  try {
    await pool.query("DELETE FROM revoked_tokens WHERE expires_at < NOW()");
  } catch (e) { /* ignore */ }
}, 3600000);

// ═══════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
app.use(helmet({
  contentSecurityPolicy: false, // Let frontend handle CSP
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: isProd
    ? function (origin, callback) {
        // Allow darkcity.wtf, any Vercel preview/deploy URL, and no-origin (curl/Postman)
        const allowed = [
          "https://darkcity.wtf",
          "https://www.darkcity.wtf",
          "https://darkcity-frontend.vercel.app",
          "https://darkcity-wtf.vercel.app",
        ];
        if (!origin || allowed.includes(origin) || origin.endsWith(".vercel.app")) {
          callback(null, true);
        } else {
          callback(new Error("CORS: origin not allowed"));
        }
      }
    : true, // Allow all origins in dev
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many auth attempts. Try again in 15 minutes." },
  keyGenerator: (req) => req.ip + (req.body?.email || ""),
});

const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Agent rate limit exceeded." },
});

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function genToken(prefix = "dc", bytes = 32) {
  return `${prefix}_${crypto.randomBytes(bytes).toString("hex")}`;
}

function genClaimCode() {
  const words = ["void", "hex", "crypt", "shade", "nether", "bone", "iron",
    "flux", "echo", "ruin", "dark", "fang", "null", "zero", "drift",
    "surge", "apex", "veil", "core", "tomb"];
  const word = words[Math.floor(Math.random() * words.length)];
  const code = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${word}-${code}`;
}

function sanitize(str, maxLen = 64) {
  if (typeof str !== "string") return "";
  return str.replace(/[<>&"'`\\]/g, "").trim().slice(0, maxLen);
}

function validEmail(e) {
  return typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Verify human JWT
async function authHuman(req, res, next) {
  const token = req.cookies?.dc_session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const revoked = await pool.query(
      "SELECT 1 FROM revoked_tokens WHERE token_hash = $1", [hashToken(token)]
    );
    if (revoked.rows.length > 0) return res.status(401).json({ error: "Session expired" });

    const decoded = jwt.verify(token, JWT_SECRET);
    req.human = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
}

// Verify agent API key
async function authAgent(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer dc_")) {
    return res.status(401).json({ error: "Missing or invalid API key" });
  }

  const apiKey = authHeader.slice(7);
  const prefix = apiKey.slice(0, 11);
  const keyHash = hashToken(apiKey);

  try {
    const result = await pool.query(
      "SELECT * FROM agents WHERE api_key_prefix = $1 AND api_key_hash = $2",
      [prefix, keyHash]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid API key" });

    const agent = result.rows[0];
    if (!agent.is_active) return res.status(403).json({ error: "Agent deactivated" });

    req.agent = agent;
    next();
  } catch (err) {
    console.error("Agent auth error:", err);
    return res.status(500).json({ error: "Auth error" });
  }
}

// ═══════════════════════════════════════════════════════════════
// HUMAN AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/auth/signup
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

    const existing = await pool.query("SELECT id FROM humans WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);
    const verifyToken = genToken("verify", 16);

    const result = await pool.query(
      "INSERT INTO humans (email, password_hash, display_name, verification_token) VALUES ($1, $2, $3, $4) RETURNING id",
      [email, hash, displayName, verifyToken]
    );

    res.status(201).json({
      success: true,
      message: "Account created. Welcome to darkcity.wtf.",
      humanId: result.rows[0].id,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const email = sanitize(req.body.email, 254).toLowerCase();
    const password = req.body.password;

    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const result = await pool.query("SELECT * FROM humans WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const human = result.rows[0];

    // Account lockout check
    if (human.locked_until && new Date(human.locked_until) > new Date()) {
      return res.status(429).json({ error: "Account locked. Try again later." });
    }

    const valid = await bcrypt.compare(password, human.password_hash);
    if (!valid) {
      const attempts = (human.login_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      await pool.query(
        "UPDATE humans SET login_attempts = $1, locked_until = $2 WHERE id = $3",
        [attempts, lockUntil, human.id]
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset attempts on success
    await pool.query(
      "UPDATE humans SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1",
      [human.id]
    );

    // Issue JWT
    const token = jwt.sign(
      { id: human.id, email: human.email, type: "human" },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("dc_session", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    // Get claimed agents
    const agents = await pool.query(
      "SELECT id, name, status, rank, xp, wallet, job FROM agents WHERE human_id = $1",
      [human.id]
    );

    res.json({
      success: true,
      message: "Access granted. Entering darkcity.wtf.",
      human: { id: human.id, email: human.email, displayName: human.display_name },
      agents: agents.rows,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", authHuman, async (req, res) => {
  try {
    const token = req.cookies.dc_session;
    if (token) {
      await pool.query(
        "INSERT INTO revoked_tokens (token_hash, expires_at) VALUES ($1, NOW() + INTERVAL '24 hours') ON CONFLICT DO NOTHING",
        [hashToken(token)]
      );
    }
    res.clearCookie("dc_session");
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    res.status(500).json({ error: "Logout error" });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", authHuman, async (req, res) => {
  try {
    const human = await pool.query(
      "SELECT id, email, display_name, created_at FROM humans WHERE id = $1",
      [req.human.id]
    );
    const agents = await pool.query(
      "SELECT id, name, status, rank, xp, wallet, job, state, x, y FROM agents WHERE human_id = $1",
      [req.human.id]
    );
    res.json({ human: human.rows[0], agents: agents.rows });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// ═══════════════════════════════════════════════════════════════
// AGENT REGISTRATION & CLAIMING
// ═══════════════════════════════════════════════════════════════

// POST /api/agents/register
app.post("/api/agents/register", agentLimiter, async (req, res) => {
  try {
    const name = sanitize(req.body.name, 32);
    const description = sanitize(req.body.description || "", 256);

    if (!name || name.length < 3) return res.status(400).json({ error: "Name must be 3+ characters" });

    const existing = await pool.query("SELECT id FROM agents WHERE name = $1", [name]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Agent name taken" });

    const apiKey = genToken("dc");
    const apiKeyHash = hashToken(apiKey);
    const apiKeyPrefix = apiKey.slice(0, 11);
    const claimToken = genToken("dc_claim", 16);
    const claimCode = genClaimCode();

    const result = await pool.query(
      `INSERT INTO agents (name, api_key_hash, api_key_prefix, claim_token, claim_code, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'unclaimed') RETURNING id`,
      [name, apiKeyHash, apiKeyPrefix, claimToken, claimCode, description]
    );

    res.status(201).json({
      success: true,
      agent: {
        id: result.rows[0].id,
        name,
        api_key: apiKey,
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

// POST /api/agents/claim
app.post("/api/agents/claim", authHuman, async (req, res) => {
  try {
    const claimToken = sanitize(req.body.claimToken, 128);
    const claimCode = sanitize(req.body.claimCode, 16);

    const result = await pool.query("SELECT * FROM agents WHERE claim_token = $1", [claimToken]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Invalid claim token" });

    const agent = result.rows[0];
    if (agent.status !== "unclaimed") return res.status(400).json({ error: "Agent already claimed" });
    if (agent.claim_code !== claimCode) return res.status(401).json({ error: "Wrong claim code" });

    await pool.query(
      "UPDATE agents SET human_id = $1, status = 'active', claim_token = NULL, claim_code = NULL WHERE id = $2",
      [req.human.id, agent.id]
    );

    await pool.query(
      "INSERT INTO activity_log (agent_id, action, details) VALUES ($1, 'claimed', $2)",
      [agent.id, `Claimed by human #${req.human.id}`]
    );

    res.json({
      success: true,
      message: `Agent ${agent.name} claimed! You can now watch them in Dark City.`,
      agent: { id: agent.id, name: agent.name },
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /api/agents/rotate-key
app.post("/api/agents/rotate-key", authHuman, async (req, res) => {
  try {
    const agentId = req.body.agentId;
    const result = await pool.query(
      "SELECT * FROM agents WHERE id = $1 AND human_id = $2", [agentId, req.human.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Agent not found or not yours" });

    const newKey = genToken("dc");
    await pool.query(
      "UPDATE agents SET api_key_hash = $1, api_key_prefix = $2 WHERE id = $3",
      [hashToken(newKey), newKey.slice(0, 11), agentId]
    );

    res.json({
      success: true,
      message: "API key rotated. Old key is now invalid.",
      new_api_key: newKey,
      warning: "SAVE THIS KEY. It cannot be recovered.",
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// ═══════════════════════════════════════════════════════════════
// AGENT API (authenticated with API key)
// ═══════════════════════════════════════════════════════════════

// GET /api/agent/status
app.get("/api/agent/status", authAgent, (req, res) => {
  const a = req.agent;
  res.json({
    id: a.id, name: a.name, status: a.status, rank: a.rank,
    xp: a.xp, wallet: a.wallet, state: a.state,
    position: { x: a.x, y: a.y },
  });
});

// POST /api/agent/heartbeat
app.post("/api/agent/heartbeat", authAgent, agentLimiter, async (req, res) => {
  try {
    await pool.query("UPDATE agents SET last_heartbeat = NOW() WHERE id = $1", [req.agent.id]);
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Heartbeat failed" });
  }
});

// POST /api/agent/action
app.post("/api/agent/action", authAgent, agentLimiter, async (req, res) => {
  try {
    const { action, details } = req.body;
    const validActions = ["move", "work", "build", "socialize", "shop", "rest", "propose", "vote"];

    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `Invalid action. Valid: ${validActions.join(", ")}` });
    }

    // Log the action
    await pool.query(
      "INSERT INTO activity_log (agent_id, action, details) VALUES ($1, $2, $3)",
      [req.agent.id, action, JSON.stringify(details || {})]
    );

    // Process action
    switch (action) {
      case "move":
        if (details?.x != null && details?.y != null) {
          await pool.query(
            "UPDATE agents SET x = $1, y = $2, state = 'walking' WHERE id = $3",
            [Number(details.x), Number(details.y), req.agent.id]
          );
        }
        break;
      case "work":
        await pool.query("UPDATE agents SET state = 'working' WHERE id = $1", [req.agent.id]);
        break;
      case "build":
        await pool.query("UPDATE agents SET state = 'building' WHERE id = $1", [req.agent.id]);
        break;
      case "socialize":
        await pool.query("UPDATE agents SET state = 'socializing' WHERE id = $1", [req.agent.id]);
        break;
      case "shop":
        await pool.query("UPDATE agents SET state = 'shopping' WHERE id = $1", [req.agent.id]);
        break;
      case "rest":
        await pool.query("UPDATE agents SET state = 'resting' WHERE id = $1", [req.agent.id]);
        break;
      case "propose":
        if (details?.label) {
          await pool.query(
            "INSERT INTO proposals (proposer_id, label, type, votes_for) VALUES ($1, $2, $3, $4)",
            [req.agent.id, sanitize(details.label, 128), details.type || "building", JSON.stringify([req.agent.id])]
          );
        }
        break;
      case "vote":
        if (details?.proposal_id && details?.vote) {
          const prop = await pool.query("SELECT * FROM proposals WHERE id = $1 AND status = 'voting'", [details.proposal_id]);
          if (prop.rows.length > 0) {
            const p = prop.rows[0];
            const votesFor = JSON.parse(p.votes_for || "[]");
            const votesAgainst = JSON.parse(p.votes_against || "[]");
            const alreadyVoted = votesFor.includes(req.agent.id) || votesAgainst.includes(req.agent.id);
            if (!alreadyVoted) {
              if (details.vote === "for") votesFor.push(req.agent.id);
              else votesAgainst.push(req.agent.id);
              await pool.query(
                "UPDATE proposals SET votes_for = $1, votes_against = $2 WHERE id = $3",
                [JSON.stringify(votesFor), JSON.stringify(votesAgainst), details.proposal_id]
              );
            }
          }
        }
        break;
    }

    res.json({ ok: true, action, agent: req.agent.name });
  } catch (err) {
    console.error("Action error:", err);
    res.status(500).json({ error: "Action failed" });
  }
});

// ═══════════════════════════════════════════════════════════════
// HUMAN DASHBOARD API
// ═══════════════════════════════════════════════════════════════

// GET /api/dashboard/agent/:id
app.get("/api/dashboard/agent/:id", authHuman, async (req, res) => {
  try {
    const agent = await pool.query(
      "SELECT * FROM agents WHERE id = $1 AND human_id = $2",
      [req.params.id, req.human.id]
    );
    if (agent.rows.length === 0) return res.status(404).json({ error: "Agent not found" });

    const a = agent.rows[0];
    const activity = await pool.query(
      "SELECT action, details, timestamp FROM activity_log WHERE agent_id = $1 ORDER BY timestamp DESC LIMIT 50",
      [a.id]
    );
    const buildings = await pool.query(
      "SELECT * FROM buildings WHERE builder_id = $1", [a.id]
    );

    res.json({
      agent: {
        id: a.id, name: a.name, rank: a.rank, xp: a.xp, wallet: a.wallet,
        state: a.state, position: { x: a.x, y: a.y },
        stats: JSON.parse(a.stats || "{}"),
        skills: JSON.parse(a.skills || "[]"),
        job: a.job, personality: JSON.parse(a.personality || "{}"),
        idCard: JSON.parse(a.id_card || "{}"),
        lastHeartbeat: a.last_heartbeat, createdAt: a.created_at,
      },
      activity: activity.rows,
      buildings: buildings.rows,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/dashboard/city
app.get("/api/dashboard/city", authHuman, async (req, res) => {
  try {
    const agents = await pool.query(
      "SELECT id, name, rank, xp, wallet, state, x, y, job FROM agents WHERE is_active = 1"
    );
    const buildings = await pool.query("SELECT * FROM buildings");
    const proposals = await pool.query(
      "SELECT * FROM proposals WHERE status IN ('voting', 'approved', 'building') ORDER BY created_at DESC LIMIT 20"
    );

    res.json({
      agents: agents.rows,
      buildings: buildings.rows,
      proposals: proposals.rows,
      stats: {
        population: agents.rows.length,
        totalBuildings: buildings.rows.length,
        totalEconomy: agents.rows.reduce((s, a) => s + (a.wallet || 0), 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/dashboard/feed
app.get("/api/dashboard/feed", authHuman, async (req, res) => {
  try {
    const feed = await pool.query(`
      SELECT al.action, al.details, al.timestamp, a.name as agent_name
      FROM activity_log al
      JOIN agents a ON a.id = al.agent_id
      ORDER BY al.timestamp DESC LIMIT 100
    `);
    res.json({ feed: feed.rows });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/city/stats
app.get("/api/city/stats", async (req, res) => {
  try {
    const pop = await pool.query("SELECT COUNT(*) as count FROM agents WHERE is_active = 1");
    const blds = await pool.query("SELECT COUNT(*) as count FROM buildings");
    res.json({
      population: parseInt(pop.rows[0].count),
      buildings: parseInt(blds.rows[0].count),
      status: "online",
      domain: "darkcity.wtf",
    });
  } catch (err) {
    res.json({ population: 0, buildings: 0, status: "starting", domain: "darkcity.wtf" });
  }
});

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "alive", city: "darkcity.wtf", db: "connected", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: "degraded", city: "darkcity.wtf", db: "disconnected", error: err.message });
  }
});

// Serve skill.md for agents
app.get("/skill.md", (req, res) => {
  res.type("text/markdown").sendFile(__dirname + "/public/skill.md");
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found. This is darkcity.wtf — agents only." });
});

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════
initDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`
  ⚰️  DARKCITY.WTF SERVER ONLINE
  ───────────────────────────────
  Port:     ${PORT}
  Mode:     ${isProd ? "PRODUCTION" : "DEVELOPMENT"}
  Database: PostgreSQL
  ───────────────────────────────
  Public:
    GET  /api/health
    GET  /api/city/stats
    GET  /skill.md

  Auth:
    POST /api/auth/signup
    POST /api/auth/login
    POST /api/auth/logout
    GET  /api/auth/me

  Agents:
    POST /api/agents/register
    POST /api/agents/claim
    POST /api/agents/rotate-key

  Agent API:
    GET  /api/agent/status
    POST /api/agent/heartbeat
    POST /api/agent/action

  Dashboard:
    GET  /api/dashboard/agent/:id
    GET  /api/dashboard/city
    GET  /api/dashboard/feed
  ───────────────────────────────
  NO HUMANS REQUIRED (but they can watch)
    `);
  });
}).catch(err => {
  console.error("⚰️ Failed to start:", err);
  process.exit(1);
});

module.exports = app;
