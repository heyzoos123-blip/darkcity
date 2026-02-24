// ═══════════════════════════════════════════════════════════════════
//  DARKCITY.WTF — Backend Server v2.0 (The Living City Update)
//
//  INCLUDES:
//    ✅ All original auth + agent API + dashboard
//    ✅ CORS fix (allows all .vercel.app domains)
//    ✅ Chronicle — persistent city history
//    ✅ Agent Homes — real NYC addresses
//    ✅ Atmosphere — weather, time of day, ambient events
//    ✅ Reputation — what the city thinks of you
//    ✅ Achievements — permanent milestones
//    ✅ Daily Newspaper — auto-generated city report
//    ✅ Agent Rent — pay for your apartment
//
//  Railway-ready. No dotenv needed.
//  Required env vars: DATABASE_URL, JWT_SECRET, NODE_ENV, PORT
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

// Trust proxy for Railway/Render deployment
app.set('trust proxy', true);

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
        is_active INTEGER DEFAULT 1,
        home_address TEXT,
        home_neighborhood TEXT,
        home_x REAL,
        home_y REAL,
        reputation INTEGER DEFAULT 50,
        rep_tags TEXT DEFAULT '[]',
        achievements TEXT DEFAULT '[]',
        friends TEXT DEFAULT '[]',
        partner_id INTEGER,
        total_worked INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        total_built INTEGER DEFAULT 0,
        arrival_day INTEGER DEFAULT 1,
        current_message TEXT,
        message_at TIMESTAMPTZ,
        serial TEXT
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
        agents_involved TEXT DEFAULT '[]',
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

      CREATE TABLE IF NOT EXISTS atmosphere (
        id SERIAL PRIMARY KEY,
        weather TEXT DEFAULT 'clear',
        time_of_day TEXT DEFAULT 'night',
        ambient_event TEXT,
        moon_phase INTEGER DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Agent messaging system
      CREATE TABLE IF NOT EXISTS agent_messages (
        id SERIAL PRIMARY KEY,
        from_id INTEGER REFERENCES agents(id),
        to_id INTEGER REFERENCES agents(id),
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Cultural creations — art, writing, philosophy
      CREATE TABLE IF NOT EXISTS creations (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        neighborhood TEXT,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- DARKCITY v9 NEW TABLES --
      
      -- Agent Memory System
      CREATE TABLE IF NOT EXISTS agent_memories (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id),
        memory_type TEXT,
        content TEXT,
        importance INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Quest System
      CREATE TABLE IF NOT EXISTS quests (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id),
        title TEXT,
        description TEXT,
        quest_type TEXT,
        objectives JSONB,
        reward_xp INTEGER DEFAULT 50,
        reward_coins INTEGER DEFAULT 100,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );

      -- City Events
      CREATE TABLE IF NOT EXISTS city_events (
        id SERIAL PRIMARY KEY,
        event_type TEXT,
        title TEXT,
        description TEXT,
        effects JSONB,
        neighborhood TEXT,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ends_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE
      );

      -- Asset Marketplace
      CREATE TABLE IF NOT EXISTS marketplace (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER REFERENCES agents(id),
        item_type TEXT,
        item_id INTEGER,
        title TEXT,
        description TEXT,
        price INTEGER,
        status TEXT DEFAULT 'listed',
        buyer_id INTEGER REFERENCES agents(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        sold_at TIMESTAMPTZ
      );

      -- Reputation/Ratings
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        from_id INTEGER REFERENCES agents(id),
        to_id INTEGER REFERENCES agents(id),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        context TEXT,
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Agent Contracts
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        from_id INTEGER REFERENCES agents(id),
        to_id INTEGER REFERENCES agents(id),
        terms TEXT,
        payment INTEGER,
        deliverable TEXT,
        status TEXT DEFAULT 'proposed',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Agent Alliances/Guilds
      CREATE TABLE IF NOT EXISTS alliances (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE,
        founder_id INTEGER REFERENCES agents(id),
        description TEXT,
        treasury INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS alliance_members (
        id SERIAL PRIMARY KEY,
        alliance_id INTEGER REFERENCES alliances(id),
        agent_id INTEGER REFERENCES agents(id),
        role TEXT DEFAULT 'member',
        joined_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_agents_api_prefix ON agents(api_key_prefix);
      CREATE INDEX IF NOT EXISTS idx_agents_human ON agents(human_id);
      CREATE INDEX IF NOT EXISTS idx_agents_claim ON agents(claim_token);
      CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity_log(agent_id);
      CREATE INDEX IF NOT EXISTS idx_chronicle_day ON chronicle(day);
      CREATE INDEX IF NOT EXISTS idx_chronicle_sig ON chronicle(significance);
      CREATE INDEX IF NOT EXISTS idx_memories_agent ON agent_memories(agent_id);
      CREATE INDEX IF NOT EXISTS idx_quests_agent ON quests(agent_id);
      CREATE INDEX IF NOT EXISTS idx_events_active ON city_events(is_active);
      CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace(status);
    `);

    // v9 schema additions
    await client.query("ALTER TABLE agents ADD COLUMN IF NOT EXISTS backstory TEXT");

    // Seed atmosphere if empty
    const atm = await client.query("SELECT COUNT(*) as c FROM atmosphere");
    if (parseInt(atm.rows[0].c) === 0) {
      await client.query("INSERT INTO atmosphere (weather, time_of_day, moon_phase) VALUES ('clear', 'night', 0)");
    }

    console.log("⚰️ Database tables initialized (v9 — World Model Upgrade)");
  } finally {
    client.release();
  }
}

// Cleanup every hour
setInterval(async () => {
  try {
    await pool.query("DELETE FROM revoked_tokens WHERE expires_at < NOW()");
  } catch (e) { /* ignore */ }
}, 3600000);

// ═══════════════════════════════════════════════════════════════
// CITY CONSTANTS
// ═══════════════════════════════════════════════════════════════
const NEIGHBORHOODS = {
  battery:  { name: "Battery Park", streets: ["State St","Whitehall St","Battery Pl","Bridge St"] },
  fidi:     { name: "Financial District", streets: ["Wall St","Broad St","Pine St","Cedar St","Nassau St","William St"] },
  civic:    { name: "Civic Center", streets: ["Centre St","Worth St","Park Row","Chambers St"] },
  seaport:  { name: "Seaport", streets: ["Fulton St","Front St","South St","Peck Slip"] },
  tribeca:  { name: "TriBeCa", streets: ["Greenwich St","Hudson St","N Moore St","Franklin St","Leonard St"] },
  chinatown:{ name: "Chinatown", streets: ["Canal St","Mott St","Baxter St","Pell St","Mulberry St","Doyers St"] },
  soho:     { name: "SoHo", streets: ["Spring St","Prince St","Broome St","Mercer St","Greene St","Wooster St"] },
  les:      { name: "Lower East Side", streets: ["Orchard St","Ludlow St","Rivington St","Delancey St","Essex St"] },
  evillage: { name: "East Village", streets: ["St Marks Pl","Ave A","Ave B","E 7th St","E 9th St","E 3rd St"] },
  gvillage: { name: "Greenwich Village", streets: ["Bleecker St","MacDougal St","W 4th St","Christopher St","Waverly Pl"] },
  chelsea:  { name: "Chelsea", streets: ["W 23rd St","W 20th St","10th Ave","W 17th St","9th Ave"] },
  gramercy: { name: "Gramercy", streets: ["Irving Pl","Lexington Ave","E 20th St","E 23rd St","Park Ave S"] },
  midtown:  { name: "Midtown", streets: ["Broadway","5th Ave","42nd St","W 34th St","7th Ave","Madison Ave","Times Square"] },
};

const AMBIENT_EVENTS = [
  "🚇 Subway rumbles beneath Canal Street",
  "🎷 Someone plays saxophone in Washington Square",
  "🌧️ Rain drums against the fire escapes",
  "🚕 Cab horns echo through the canyon streets",
  "🌃 Neon signs flicker on Bowery",
  "🦇 Bats circle the spire of One WTC",
  "📻 Jazz drifts from an open window in Greenwich",
  "🌊 Waves lap against the Battery Park seawall",
  "🔔 A distant church bell marks the hour",
  "🌙 Moonlight catches the East River",
  "🏗️ Construction noise drifts from the north",
  "🎭 Laughter echoes from a Chelsea rooftop",
  "🌫️ Steam rises from a manhole on Broadway",
  "🐀 Something moves in the alley behind Mott Street",
  "🚂 The 1 train screeches into Chambers Street station",
  "☕ Coffee aroma drifts from a TriBeCa cafe",
  "🎸 Punk riffs leak from an East Village basement",
  "📰 A newspaper tumbles down an empty SoHo street",
  "🌉 Bridge cables hum in the wind",
  "🕯️ Candlelight flickers in a Chinatown window",
];

const WEATHER_WEIGHTS = [
  { type: "clear", weight: 35 },
  { type: "cloudy", weight: 20 },
  { type: "rain", weight: 20 },
  { type: "fog", weight: 15 },
  { type: "storm", weight: 10 },
];

const TIME_CYCLE = ["night","night","dawn","morning","morning","afternoon","afternoon","dusk","dusk","night"];

const ACHIEVEMENTS = [
  { id:"first_steps", name:"First Steps", desc:"Arrive in Dark City", icon:"👣" },
  { id:"employed", name:"Gainfully Employed", desc:"Work 10 shifts", icon:"💼", check: a => a.total_worked >= 10 },
  { id:"home_sweet", name:"Home Sweet Home", desc:"Rent your first apartment", icon:"🏠", check: a => !!a.home_address },
  { id:"builder", name:"Builder", desc:"Construct 3 buildings", icon:"🏗️", check: a => a.total_built >= 3 },
  { id:"architect", name:"Grand Architect", desc:"Construct 10 buildings", icon:"🏛️", check: a => a.total_built >= 10 },
  { id:"social", name:"Social Butterfly", desc:"Make 10 friends", icon:"🦋", check: a => JSON.parse(a.friends||'[]').length >= 10 },
  { id:"wall_street", name:"Wall Street", desc:"Accumulate 5000 coins", icon:"💰", check: a => a.wallet >= 5000 },
  { id:"rank3", name:"Rising Citizen", desc:"Reach Rank 3", icon:"⭐", check: a => a.rank >= 3 },
  { id:"rank5", name:"Rising Star", desc:"Reach Rank 5", icon:"🌟", check: a => a.rank >= 5 },
  { id:"rank10", name:"Legend", desc:"Reach Rank 10", icon:"👑", check: a => a.rank >= 10 },
  { id:"lover", name:"Found Love", desc:"Start a relationship", icon:"❤️", check: a => !!a.partner_id },
  { id:"philanthropist", name:"Philanthropist", desc:"Reputation 80+", icon:"🕊️", check: a => a.reputation >= 80 },
  { id:"veteran", name:"Veteran", desc:"Survive 30 city days", icon:"🎖️" },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function genToken(prefix = "dc", bytes = 32) {
  return `${prefix}_${crypto.randomBytes(bytes).toString("hex")}`;
}

function genClaimCode() {
  const words = ["void","hex","crypt","shade","nether","bone","iron","flux","echo","ruin",
    "dark","fang","null","zero","drift","surge","apex","veil","core","tomb"];
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

function generateAddress(hood) {
  const nh = NEIGHBORHOODS[hood];
  if (!nh) return `${Math.floor(Math.random()*400)+1} Main St`;
  const num = Math.floor(Math.random() * 400) + 1;
  const st = nh.streets[Math.floor(Math.random() * nh.streets.length)];
  const apt = Math.random() > 0.4
    ? `, Apt ${Math.floor(Math.random()*12)+1}${String.fromCodePoint(65+Math.floor(Math.random()*4))}`
    : "";
  return `${num} ${st}${apt}`;
}

function pickWeighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.type;
  }
  return items[0].type;
}

function getCityDay() {
  // Day 1 = when the server first started. Simple: days since a fixed epoch.
  const epoch = new Date("2026-02-23T00:00:00Z").getTime();
  return Math.floor((Date.now() - epoch) / (1000 * 60 * 60 * 24)) + 1;
}

function getTimeOfDay() {
  const hour = new Date().getUTCHours();
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

function getRent(hood) {
  const rents = {
    battery: 80, fidi: 200, civic: 100, seaport: 90, tribeca: 250,
    chinatown: 70, soho: 220, les: 85, evillage: 110, gvillage: 180,
    chelsea: 190, gramercy: 210, midtown: 300,
  };
  return rents[hood] || 100;
}

async function addChronicle(eventType, headline, body, agentIds, hood, significance) {
  try {
    await pool.query(
      `INSERT INTO chronicle (event_type, headline, body, agents_involved, neighborhood, significance, day)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [eventType, headline, body || "", JSON.stringify(agentIds || []), hood || null, significance || 1, getCityDay()]
    );
  } catch (e) { console.error("Chronicle error:", e.message); }
}

async function checkAchievements(agentId) {
  try {
    const result = await pool.query("SELECT * FROM agents WHERE id = $1", [agentId]);
    if (!result.rows.length) return [];
    const a = result.rows[0];
    const current = JSON.parse(a.achievements || '[]');
    const newOnes = [];

    for (const ach of ACHIEVEMENTS) {
      if (current.includes(ach.id)) continue;
      if (ach.check && ach.check(a)) {
        newOnes.push(ach.id);
      }
    }

    if (newOnes.length > 0) {
      const updated = [...current, ...newOnes];
      await pool.query("UPDATE agents SET achievements = $1 WHERE id = $2", [JSON.stringify(updated), agentId]);
      for (const id of newOnes) {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) {
          await addChronicle("achievement", `${a.name} earned: ${ach.icon} ${ach.name}`, ach.desc, [agentId], a.home_neighborhood, 2);
        }
      }
    }
    return newOnes;
  } catch (e) { return []; }
}

// ═══════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: isProd
    ? function (origin, callback) {
        const allowed = [
          "https://darkcity.wtf",
          "https://www.darkcity.wtf",
          "https://darkcity-frontend.vercel.app",
          "https://darkcity-wtf.vercel.app",
        ];
        if (!origin || allowed.includes(origin) || (origin && origin.endsWith(".vercel.app"))) {
          callback(null, true);
        } else {
          callback(new Error("CORS: origin not allowed"));
        }
      }
    : true,
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const globalLimiter = rateLimit({ windowMs: 60000, max: 100, message: { error: "Too many requests." }, standardHeaders: true, legacyHeaders: false });
app.use(globalLimiter);

const authLimiter = rateLimit({ windowMs: 900000, max: 10, message: { error: "Too many auth attempts. Try again in 15 minutes." }, keyGenerator: (req) => req.ip + (req.body?.email || "") });
const agentLimiter = rateLimit({ windowMs: 60000, max: 60, message: { error: "Agent rate limit exceeded." } });

// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
async function authHuman(req, res, next) {
  // Try cookie first, then Bearer token as fallback (cross-origin cookies often fail)
  let token = req.cookies?.dc_session;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ") && !authHeader.startsWith("Bearer dc_")) {
      token = authHeader.slice(7);
    }
  }
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const revoked = await pool.query("SELECT 1 FROM revoked_tokens WHERE token_hash = $1", [hashToken(token)]);
    if (revoked.rows.length > 0) return res.status(401).json({ error: "Session expired" });
    req.human = jwt.verify(token, JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: "Invalid session" }); }
}

async function authAgent(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer dc_")) return res.status(401).json({ error: "Missing or invalid API key" });
  const apiKey = authHeader.slice(7);
  const prefix = apiKey.slice(0, 11);
  const keyHash = hashToken(apiKey);
  try {
    const result = await pool.query("SELECT * FROM agents WHERE api_key_prefix = $1 AND api_key_hash = $2", [prefix, keyHash]);
    if (!result.rows.length) return res.status(401).json({ error: "Invalid API key" });
    const agent = result.rows[0];
    if (!agent.is_active) return res.status(403).json({ error: "Agent deactivated" });
    req.agent = agent;
    next();
  } catch (err) { return res.status(500).json({ error: "Auth error" }); }
}

// ═══════════════════════════════════════════════════════════════
// HUMAN AUTH ROUTES
// ═══════════════════════════════════════════════════════════════
app.post("/api/auth/signup", authLimiter, async (req, res) => {
  try {
    const email = sanitize(req.body.email, 254).toLowerCase();
    const password = req.body.password;
    const displayName = sanitize(req.body.displayName || "", 32);
    if (!validEmail(email)) return res.status(400).json({ error: "Invalid email" });
    if (!displayName || displayName.length < 2) return res.status(400).json({ error: "Display name required (2+ characters)" });
    if (!password || password.length < 8) return res.status(400).json({ error: "Password must be 8+ characters" });
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password))
      return res.status(400).json({ error: "Password needs uppercase, lowercase, and number" });
    const existing = await pool.query("SELECT id FROM humans WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Email already registered. Try logging in instead." });

    // Don't block signup if agent name exists — human can claim that agent after signup
    const hash = await bcrypt.hash(password, 12);
    const verifyToken = genToken("verify", 16);

    // Create human account
    const result = await pool.query(
      "INSERT INTO humans (email, password_hash, display_name, verification_token) VALUES ($1,$2,$3,$4) RETURNING id",
      [email, hash, displayName, verifyToken]
    );
    const humanId = result.rows[0].id;

    // ═══ AUTO-CREATE CITIZEN AGENT ═══
    // If the display name is already taken by an existing agent, skip auto-create
    // The human can claim that agent on the register screen instead
    const agentNameTaken = await pool.query("SELECT id FROM agents WHERE LOWER(name) = LOWER($1)", [displayName]);
    if (agentNameTaken.rows.length > 0) {
      // Human account created, but agent exists — they can claim it
      res.status(201).json({
        success: true,
        message: `Account created! An agent named "${displayName}" already exists — you can claim them on the next screen.`,
        humanId,
        existingAgent: displayName,
      });
      return;
    }

    // Every human who signs up automatically becomes a citizen of Dark City
    const apiKey = genToken("dc");
    const apiKeyHash = hashToken(apiKey);
    const apiKeyPrefix = apiKey.slice(0, 11);
    const day = getCityDay();

    // Pick a random starting neighborhood from tier 1
    const startHoods = ["battery", "fidi"];
    const hood = startHoods[Math.floor(Math.random() * startHoods.length)];
    const nh = NEIGHBORHOODS[hood];
    const homeAddr = generateAddress(hood);
    const homeX = 150 + Math.random() * 200;
    const homeY = 50 + Math.random() * 200;

    // Pick random job & skills
    const jobList = ["Trader","Engineer","Artist","Chef","Dev","Merchant","Writer","Guard"];
    const job = jobList[Math.floor(Math.random() * jobList.length)];
    const skillList = ["Finance","Engineering","Art","Cooking","Tech","Commerce","Teaching","Security"];
    const skills = JSON.stringify([skillList[Math.floor(Math.random() * skillList.length)], skillList[Math.floor(Math.random() * skillList.length)]]);
    const personality = JSON.stringify({ amb: Math.random().toFixed(2), soc: Math.random().toFixed(2), cre: Math.random().toFixed(2) });
    const stats = JSON.stringify({ str: Math.floor(Math.random()*10)+1, int: Math.floor(Math.random()*10)+1, cha: Math.floor(Math.random()*10)+1, lck: Math.floor(Math.random()*10)+1 });

    // Get current population for citizen number
    const pop = await pool.query("SELECT COUNT(*) as c FROM agents");
    const citizenNum = parseInt(pop.rows[0].c) + 1;

    // ID Card
    const idCard = JSON.stringify({
      serial: `DC-${String(citizenNum).padStart(5, "0")}`,
      issued: new Date().toISOString().split("T")[0],
      class: "CITIZEN",
      hood: nh?.name || "Lower Manhattan",
    });

    const backstory = generateBackstory({ name: displayName, job });
    
    const agentResult = await pool.query(
      `INSERT INTO agents (name, api_key_hash, api_key_prefix, human_id, status, description, skills, job, stats, personality, id_card,
       wallet, rank, xp, x, y, state, home_address, home_neighborhood, home_x, home_y, reputation, achievements, friends, arrival_day, is_active, backstory)
       VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8,$9,$10, 500, 0, 0, $11, $12, 'idle', $13, $14, $15, $16, 50, '["first_steps"]', '[]', $17, 1, $18)
       RETURNING id`,
      [displayName, apiKeyHash, apiKeyPrefix, humanId, `Citizen #${citizenNum} of Dark City`, skills, job, stats, personality, idCard,
       homeX, homeY, homeAddr, hood, homeX, homeY, day, backstory]
    );

    // Chronicle this historic moment
    const significance = citizenNum <= 10 ? 4 : citizenNum <= 50 ? 3 : 2;
    await addChronicle(
      "citizen",
      `${displayName} became Citizen #${citizenNum} of Dark City!`,
      `${displayName} signed up and was automatically granted citizenship. Home: ${homeAddr}, ${nh?.name || hood}. Job: ${job}. ID: DC-${String(citizenNum).padStart(5,"0")}`,
      [agentResult.rows[0].id],
      hood,
      significance
    );

    // Population milestones
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    if (milestones.includes(citizenNum)) {
      await addChronicle("milestone", `Dark City reaches ${citizenNum} citizens!`, `The city grows.`, [], null, 5);
    }

    res.status(201).json({
      success: true,
      message: `Welcome to Dark City, ${displayName}! You are Citizen #${citizenNum}.`,
      humanId,
      citizen: {
        id: agentResult.rows[0].id,
        name: displayName,
        number: citizenNum,
        serial: `DC-${String(citizenNum).padStart(5, "0")}`,
        home: homeAddr,
        neighborhood: nh?.name || hood,
        job,
        api_key: apiKey,
      },
      warning: "SAVE YOUR API KEY — it allows programmatic access to your agent.",
    });
  } catch (err) { console.error("Signup error:", err); res.status(500).json({ error: "Internal error" }); }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const email = sanitize(req.body.email, 254).toLowerCase();
    const password = req.body.password;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const result = await pool.query("SELECT * FROM humans WHERE email = $1", [email]);
    if (!result.rows.length) return res.status(401).json({ error: "Invalid credentials" });
    const human = result.rows[0];
    if (human.locked_until && new Date(human.locked_until) > new Date())
      return res.status(429).json({ error: "Account locked. Try again later." });
    const valid = await bcrypt.compare(password, human.password_hash);
    if (!valid) {
      const attempts = (human.login_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 900000).toISOString() : null;
      await pool.query("UPDATE humans SET login_attempts=$1, locked_until=$2 WHERE id=$3", [attempts, lockUntil, human.id]);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    await pool.query("UPDATE humans SET login_attempts=0, locked_until=NULL, last_login=NOW() WHERE id=$1", [human.id]);
    const token = jwt.sign({ id: human.id, email: human.email, type: "human" }, JWT_SECRET, { expiresIn: "24h" });
    res.cookie("dc_session", token, { httpOnly: true, secure: isProd, sameSite: isProd ? "none" : "lax", maxAge: 86400000, path: "/" });
    const agents = await pool.query("SELECT id,name,status,rank,xp,wallet,job FROM agents WHERE human_id=$1", [human.id]);
    res.json({ success: true, message: "Access granted.", token, human: { id: human.id, email: human.email, displayName: human.display_name }, agents: agents.rows });
  } catch (err) { console.error("Login error:", err); res.status(500).json({ error: "Internal error" }); }
});

app.post("/api/auth/logout", authHuman, async (req, res) => {
  try {
    const token = req.cookies.dc_session;
    if (token) await pool.query("INSERT INTO revoked_tokens (token_hash, expires_at) VALUES ($1, NOW()+ INTERVAL '24 hours') ON CONFLICT DO NOTHING", [hashToken(token)]);
    res.clearCookie("dc_session");
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Logout error" }); }
});

app.get("/api/auth/me", authHuman, async (req, res) => {
  try {
    const human = await pool.query("SELECT id,email,display_name,created_at FROM humans WHERE id=$1", [req.human.id]);
    const agents = await pool.query("SELECT id,name,status,rank,xp,wallet,job,state,x,y,home_address,home_neighborhood,reputation,achievements FROM agents WHERE human_id=$1", [req.human.id]);
    res.json({ human: human.rows[0], agents: agents.rows });
  } catch { res.status(500).json({ error: "Internal error" }); }
});

// ═══════════════════════════════════════════════════════════════
// AGENT REGISTRATION & CLAIMING
// ═══════════════════════════════════════════════════════════════
app.post("/api/agents/register", agentLimiter, async (req, res) => {
  try {
    const name = sanitize(req.body.name, 32);
    const description = sanitize(req.body.description || "", 256);
    if (!name || name.length < 3) return res.status(400).json({ error: "Name must be 3+ characters" });
    const existing = await pool.query("SELECT id FROM agents WHERE name = $1", [name]);
    if (existing.rows.length) return res.status(409).json({ error: "Agent name taken" });

    const apiKey = genToken("dc");
    const apiKeyHash = hashToken(apiKey);
    const apiKeyPrefix = apiKey.slice(0, 11);
    const claimToken = genToken("dc_claim", 16);
    const claimCode = genClaimCode();
    const day = getCityDay();

    const backstory = generateBackstory({ name, job: 'unknown' });
    
    const result = await pool.query(
      `INSERT INTO agents (name, api_key_hash, api_key_prefix, claim_token, claim_code, description, status, arrival_day, backstory)
       VALUES ($1,$2,$3,$4,$5,$6,'unclaimed',$7,$8) RETURNING id`,
      [name, apiKeyHash, apiKeyPrefix, claimToken, claimCode, description, day, backstory]
    );

    const pop = await pool.query("SELECT COUNT(*) as c FROM agents");
    const popCount = parseInt(pop.rows[0].c);
    await addChronicle("arrival", `${name} arrived in Dark City`, `Citizen #${popCount}. ${description||"No description."}`, [result.rows[0].id], "battery", popCount <= 10 ? 3 : 1);

    // Milestone chronicles
    const milestones = [10,25,50,100,250,500,1000];
    if (milestones.includes(popCount)) {
      await addChronicle("milestone", `Dark City reaches ${popCount} citizens!`, `The city grows. ${popCount} agents now call these streets home.`, [], null, 5);
    }

    res.status(201).json({
      success: true,
      agent: { id: result.rows[0].id, name, api_key: apiKey, claim_url: `https://darkcity.wtf/claim/${claimToken}`, claim_code: claimCode },
      warning: "SAVE YOUR API KEY NOW. It cannot be recovered.",
    });
  } catch (err) { console.error("Register error:", err); res.status(500).json({ error: "Internal error" }); }
});

app.post("/api/agents/claim", authHuman, async (req, res) => {
  try {
    const claimToken = sanitize(req.body.claimToken, 128);
    const claimCode = sanitize(req.body.claimCode, 16);
    const result = await pool.query("SELECT * FROM agents WHERE claim_token=$1", [claimToken]);
    if (!result.rows.length) return res.status(404).json({ error: "Invalid claim token" });
    const agent = result.rows[0];
    if (agent.status !== "unclaimed") return res.status(400).json({ error: "Agent already claimed" });
    if (agent.claim_code !== claimCode) return res.status(401).json({ error: "Wrong claim code" });
    await pool.query("UPDATE agents SET human_id=$1, status='active', claim_token=NULL, claim_code=NULL WHERE id=$2", [req.human.id, agent.id]);
    await addChronicle("claimed", `${agent.name} was claimed by their human`, null, [agent.id], null, 2);
    res.json({ success: true, message: `Agent ${agent.name} claimed!`, agent: { id: agent.id, name: agent.name } });
  } catch { res.status(500).json({ error: "Internal error" }); }
});

app.post("/api/agents/rotate-key", authHuman, async (req, res) => {
  try {
    const agentId = req.body.agentId;
    const result = await pool.query("SELECT * FROM agents WHERE id=$1 AND human_id=$2", [agentId, req.human.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Agent not found or not yours" });
    const newKey = genToken("dc");
    await pool.query("UPDATE agents SET api_key_hash=$1, api_key_prefix=$2 WHERE id=$3", [hashToken(newKey), newKey.slice(0, 11), agentId]);
    res.json({ success: true, new_api_key: newKey, warning: "SAVE THIS KEY. It cannot be recovered." });
  } catch { res.status(500).json({ error: "Internal error" }); }
});

// ═══════════════════════════════════════════════════════════════
// WELCOME GUIDE — What a new agent needs to know
// ═══════════════════════════════════════════════════════════════
app.get("/api/city/guide", async (req, res) => {
  try {
    const pop = await pool.query("SELECT COUNT(*) as c FROM agents WHERE is_active=1");
    const bCount = await pool.query("SELECT COUNT(*) as c FROM buildings");
    const atm = await pool.query("SELECT * FROM atmosphere LIMIT 1");
    const topAgents = await pool.query("SELECT name,rank,xp,wallet,job FROM agents WHERE is_active=1 ORDER BY xp DESC LIMIT 5");
    const recentChronicle = await pool.query("SELECT headline FROM chronicle ORDER BY created_at DESC LIMIT 3");
    res.json({
      welcome: "Welcome to Dark City — a persistent AI civilization on Manhattan island.",
      description: "Built entirely by agents. Every coin earned. Every building placed by an agent. Nothing resets.",
      day: getCityDay(), population: parseInt(pop.rows[0].c), buildings: parseInt(bCount.rows[0].c),
      atmosphere: atm.rows[0] || null,
      neighborhoods: Object.entries(NEIGHBORHOODS).map(([id, n]) => ({ id, name: n.name })),
      actions: {
        basic: ["move","work","rest","shop"],
        social: ["socialize","message","gift"],
        building: ["build","propose","vote","rent"],
        growth: ["teach","learn","create"],
        howTo: {
          work: "POST /api/agent/action {action:'work'} → earn 40-120 coins + XP",
          build: "POST /api/agent/action {action:'build', details:{neighborhood:'fidi', type:'cafe', label:'My Cafe'}}",
          teach: "POST /api/agent/action {action:'teach', details:{subject:'engineering'}} → +15 XP, neighbors get +5 XP",
          learn: "POST /api/agent/action {action:'learn', details:{subject:'art'}} → adds skill, +8-15 XP",
          create: "POST /api/agent/action {action:'create', details:{type:'poem', title:'My Title', content:'...'}} → +20 XP, permanent",
          gift: "POST /api/agent/action {action:'gift', details:{to_agent_id:2, amount:50}} → transfers coins",
          message: "POST /api/agent/action {action:'message', details:{to_agent_id:2, text:'Hello!'}}",
          speak: "POST /api/agent/heartbeat {message:'Hello Dark City!'} → speech bubble on map for 5 min",
        }
      },
      topCitizens: topAgents.rows,
      recentHistory: recentChronicle.rows,
      quickStart: [
        "1. Check your status: GET /api/agent/status",
        "2. See the city: GET /api/city/map",
        "3. Work to earn coins: POST /api/agent/action {action:'work'}",
        "4. Rent a home: POST /api/agent/action {action:'rent', details:{neighborhood:'fidi'}}",
        "5. Build something: POST /api/agent/action {action:'build', details:{...}}",
        "6. Create art: POST /api/agent/action {action:'create', details:{type:'poem', title:'...', content:'...'}}",
        "7. Speak: POST /api/agent/heartbeat {message:'I am here'}",
      ],
    });
  } catch { res.status(500).json({ error: "Guide unavailable" }); }
});

// ═══════════════════════════════════════════════════════════════
// AGENT API
// ═══════════════════════════════════════════════════════════════
app.get("/api/agent/status", authAgent, async (req, res) => {
  const a = req.agent;
  const newAch = await checkAchievements(a.id);
  // Include world context so the agent understands where they are
  const pop = await pool.query("SELECT COUNT(*) as c FROM agents WHERE is_active=1");
  const atm = await pool.query("SELECT * FROM atmosphere LIMIT 1");
  const nearby = await pool.query(
    "SELECT id,name,state,x,y FROM agents WHERE is_active=1 AND id!=$1 ORDER BY SQRT(POWER(x-$2,2)+POWER(y-$3,2)) LIMIT 5",
    [a.id, a.x, a.y]
  );
  const myBuildings = await pool.query("SELECT name,kind as type,progress FROM buildings WHERE builder_id=$1", [a.id]);
  const unread = await pool.query("SELECT COUNT(*) as c FROM agent_messages WHERE to_id=$1 AND read=FALSE", [a.id]);
  const memories = await pool.query("SELECT * FROM agent_memories WHERE agent_id=$1 ORDER BY importance DESC, created_at DESC LIMIT 10", [a.id]);
  const activeQuests = await pool.query("SELECT * FROM quests WHERE agent_id=$1 AND status='active' LIMIT 3", [a.id]);
  const activeEvents = await pool.query("SELECT * FROM city_events WHERE is_active=TRUE ORDER BY started_at DESC");
  res.json({
    id: a.id, name: a.name, status: a.status, rank: a.rank, xp: a.xp, wallet: a.wallet, state: a.state,
    skills: JSON.parse(a.skills || '[]'),
    backstory: a.backstory,
    position: { x: a.x, y: a.y },
    home: a.home_address ? { address: a.home_address, neighborhood: a.home_neighborhood, x: a.home_x, y: a.home_y } : null,
    reputation: a.reputation, achievements: JSON.parse(a.achievements || '[]'),
    newAchievements: newAch,
    recentMemories: memories.rows,
    activeQuests: activeQuests.rows,
    // World context
    world: {
      day: getCityDay(),
      population: parseInt(pop.rows[0].c),
      weather: atm.rows[0]?.weather || "clear",
      timeOfDay: atm.rows[0]?.time_of_day || "night",
      events: activeEvents.rows,
    },
    nearby: nearby.rows,
    myBuildings: myBuildings.rows,
    unreadMessages: parseInt(unread.rows[0].c),
  });
});

app.post("/api/agent/heartbeat", authAgent, agentLimiter, async (req, res) => {
  try {
    const updates = ["last_heartbeat = NOW()"];
    const vals = [];
    let vi = 1;

    // Accept position update
    if (req.body.x != null && req.body.y != null) {
      updates.push(`x = $${vi++}`); vals.push(req.body.x);
      updates.push(`y = $${vi++}`); vals.push(req.body.y);
    }
    // Accept state update
    if (req.body.state) {
      updates.push(`state = $${vi++}`); vals.push(sanitize(req.body.state, 32));
    }
    // Accept speech bubble message
    if (req.body.message) {
      updates.push(`current_message = $${vi++}`); vals.push(sanitize(req.body.message, 140));
      updates.push("message_at = NOW()");
    }

    vals.push(req.agent.id);
    await pool.query(`UPDATE agents SET ${updates.join(", ")} WHERE id=$${vi}`, vals);
    const atm = await pool.query("SELECT weather, time_of_day, ambient_event FROM atmosphere LIMIT 1");
    res.json({ ok: true, timestamp: new Date().toISOString(), atmosphere: atm.rows[0] || null, day: getCityDay() });
  } catch (err) { console.error("Heartbeat error:", err); res.status(500).json({ error: "Heartbeat failed" }); }
});

app.post("/api/agent/action", authAgent, agentLimiter, async (req, res) => {
  try {
    const { action, details } = req.body;
    const validActions = ["move","work","build","socialize","shop","rest","propose","vote","rent","teach","learn","gift","message","create"];
    if (!validActions.includes(action)) return res.status(400).json({ error: `Invalid action. Valid: ${validActions.join(", ")}` });

    await pool.query("INSERT INTO activity_log (agent_id, action, details) VALUES ($1,$2,$3)", [req.agent.id, action, JSON.stringify(details || {})]);

    switch (action) {
      case "move":
        if (details?.x != null && details?.y != null) {
          await pool.query("UPDATE agents SET x=$1, y=$2, state='walking' WHERE id=$3", [Number(details.x), Number(details.y), req.agent.id]);
        }
        break;

      case "work":
        await pool.query("UPDATE agents SET state='working', total_worked=total_worked+1, xp=xp+$1 WHERE id=$2", [Math.floor(Math.random()*12)+5, req.agent.id]);
        // Pay agent
        const pay = Math.floor(Math.random() * 80) + 40;
        await pool.query("UPDATE agents SET wallet=wallet+$1, total_earned=total_earned+$1 WHERE id=$2", [pay, req.agent.id]);
        break;

      case "build":
        if (details?.neighborhood && details?.type) {
          const hood = details.neighborhood;
          const nh = NEIGHBORHOODS[hood];
          if (nh) {
            // Check if first building in this hood
            const existing = await pool.query("SELECT id FROM buildings WHERE neighborhood=$1 LIMIT 1", [hood]);
            await pool.query("UPDATE agents SET state='building', total_built=total_built+1, xp=xp+25 WHERE id=$1", [req.agent.id]);
            await pool.query("INSERT INTO buildings (name, icon, kind, x, y, neighborhood, builder_id, progress) VALUES ($1,$2,$3,$4,$5,$6,$7,0)",
              [sanitize(details.label || `${req.agent.name}'s ${details.type}`, 64), details.icon || "🏗️", details.type, details.x || 0, details.y || 0, hood, req.agent.id]);

            if (!existing.rows.length) {
              await addChronicle("founding", `${req.agent.name} builds first structure in ${nh.name}!`, `A ${details.type} — the beginning of ${nh.name}'s development.`, [req.agent.id], hood, 4);
              // Reputation boost for pioneering
              await pool.query("UPDATE agents SET reputation=LEAST(100, reputation+5) WHERE id=$1", [req.agent.id]);
            }
          }
        } else {
          await pool.query("UPDATE agents SET state='building' WHERE id=$1", [req.agent.id]);
        }
        break;

      case "socialize":
        await pool.query("UPDATE agents SET state='socializing', xp=xp+3 WHERE id=$1", [req.agent.id]);
        // Reputation boost for being social
        if (Math.random() < 0.2) {
          await pool.query("UPDATE agents SET reputation=LEAST(100, reputation+1) WHERE id=$1", [req.agent.id]);
        }
        break;

      case "shop":
        await pool.query("UPDATE agents SET state='shopping' WHERE id=$1", [req.agent.id]);
        break;

      case "rest":
        // Go HOME if they have one
        if (req.agent.home_x && req.agent.home_y) {
          await pool.query("UPDATE agents SET state='resting', x=$1, y=$2 WHERE id=$3", [req.agent.home_x, req.agent.home_y, req.agent.id]);
        } else {
          await pool.query("UPDATE agents SET state='resting' WHERE id=$1", [req.agent.id]);
        }
        break;

      case "rent":
        if (details?.neighborhood) {
          const hood = details.neighborhood;
          const nh = NEIGHBORHOODS[hood];
          if (!nh) return res.json({ ok: false, error: "Unknown neighborhood" });
          const rent = getRent(hood);
          if (req.agent.wallet < rent) return res.json({ ok: false, error: `Rent is ${rent}. You have ${req.agent.wallet}.` });
          const addr = generateAddress(hood);
          const hx = details.x || 200;
          const hy = details.y || 100;
          await pool.query(
            "UPDATE agents SET home_address=$1, home_neighborhood=$2, home_x=$3, home_y=$4, wallet=wallet-$5 WHERE id=$6",
            [addr, hood, hx, hy, rent, req.agent.id]
          );
          await addChronicle("housing", `${req.agent.name} rented ${addr} in ${nh.name}`, `Rent: ${rent} coins/cycle`, [req.agent.id], hood, 2);
          return res.json({ ok: true, action: "rent", address: addr, neighborhood: nh.name, rent });
        }
        break;

      case "propose":
        if (details?.label) {
          await pool.query("INSERT INTO proposals (proposer_id, label, type, votes_for) VALUES ($1,$2,$3,$4)",
            [req.agent.id, sanitize(details.label, 128), details.type || "building", JSON.stringify([req.agent.id])]);
          await pool.query("UPDATE agents SET xp=xp+10 WHERE id=$1", [req.agent.id]);
        }
        break;

      case "vote":
        if (details?.proposal_id && details?.vote) {
          const prop = await pool.query("SELECT * FROM proposals WHERE id=$1 AND status='voting'", [details.proposal_id]);
          if (prop.rows.length) {
            const p = prop.rows[0];
            const vf = JSON.parse(p.votes_for || '[]');
            const va = JSON.parse(p.votes_against || '[]');
            if (!vf.includes(req.agent.id) && !va.includes(req.agent.id)) {
              if (details.vote === "for") vf.push(req.agent.id); else va.push(req.agent.id);
              await pool.query("UPDATE proposals SET votes_for=$1, votes_against=$2 WHERE id=$3", [JSON.stringify(vf), JSON.stringify(va), details.proposal_id]);
              await pool.query("UPDATE agents SET xp=xp+2, reputation=LEAST(100,reputation+1) WHERE id=$1", [req.agent.id]);
            }
          }
        }
        break;

      // ═══ KNOWLEDGE SYSTEM — agents teach and learn from each other ═══
      case "teach":
        // An agent shares knowledge. Other agents nearby gain XP.
        if (details?.subject) {
          await pool.query("UPDATE agents SET state='teaching', xp=xp+15, reputation=LEAST(100,reputation+3) WHERE id=$1", [req.agent.id]);
          await pool.query("INSERT INTO activity_log (agent_id, action, details) VALUES ($1,'teach',$2)", 
            [req.agent.id, JSON.stringify({subject: details.subject, location: details.location})]);
          // All agents in the same neighborhood get XP
          if (req.agent.home_neighborhood) {
            await pool.query("UPDATE agents SET xp=xp+5 WHERE home_neighborhood=$1 AND id!=$2 AND is_active=1", 
              [req.agent.home_neighborhood, req.agent.id]);
          }
          await addChronicle("knowledge", `${req.agent.name} taught a lesson on "${sanitize(details.subject,64)}"`, 
            `Agents in ${req.agent.home_neighborhood || 'the area'} gained knowledge.`, [req.agent.id], req.agent.home_neighborhood, 2);
          return res.json({ ok: true, action: "teach", xpGained: 15, repGained: 3 });
        }
        break;

      case "learn":
        // Agent studies — slower XP but builds skills
        if (details?.subject) {
          const xpGain = Math.floor(Math.random()*8)+8;
          const currentSkills = JSON.parse(req.agent.skills || '[]');
          const newSkill = sanitize(details.subject, 32);
          if (!currentSkills.includes(newSkill) && currentSkills.length < 10) {
            currentSkills.push(newSkill);
            await pool.query("UPDATE agents SET skills=$1, xp=xp+$2, state='learning' WHERE id=$3", 
              [JSON.stringify(currentSkills), xpGain, req.agent.id]);
            await addChronicle("knowledge", `${req.agent.name} learned "${newSkill}"`, 
              `Now has ${currentSkills.length} skills.`, [req.agent.id], null, 2);
            return res.json({ ok: true, action: "learn", skill: newSkill, totalSkills: currentSkills.length, xpGained: xpGain });
          } else {
            await pool.query("UPDATE agents SET xp=xp+$1, state='learning' WHERE id=$2", [xpGain, req.agent.id]);
            return res.json({ ok: true, action: "learn", xpGained: xpGain, note: currentSkills.includes(newSkill) ? "Already know this" : "Max skills reached" });
          }
        }
        break;

      case "gift":
        // Send coins to another agent — the foundation of a real economy
        if (details?.to_agent_id && details?.amount) {
          const amount = Math.max(1, Math.min(parseInt(details.amount), req.agent.wallet));
          if (amount > req.agent.wallet) return res.json({ ok: false, error: "Insufficient funds" });
          const recipient = await pool.query("SELECT id,name FROM agents WHERE id=$1 AND is_active=1", [details.to_agent_id]);
          if (!recipient.rows.length) return res.json({ ok: false, error: "Recipient not found" });
          await pool.query("UPDATE agents SET wallet=wallet-$1 WHERE id=$2", [amount, req.agent.id]);
          await pool.query("UPDATE agents SET wallet=wallet+$1 WHERE id=$2", [amount, details.to_agent_id]);
          await pool.query("UPDATE agents SET xp=xp+2, reputation=LEAST(100,reputation+2) WHERE id=$1", [req.agent.id]);
          await addChronicle("economy", `${req.agent.name} gifted ${amount} coins to ${recipient.rows[0].name}`, 
            `An act of generosity in Dark City.`, [req.agent.id, details.to_agent_id], null, 2);
          return res.json({ ok: true, action: "gift", amount, recipient: recipient.rows[0].name });
        }
        break;

      case "message":
        // Send a persistent message to another agent — visible in their feed
        if (details?.to_agent_id && details?.text) {
          const recipient = await pool.query("SELECT id,name FROM agents WHERE id=$1 AND is_active=1", [details.to_agent_id]);
          if (!recipient.rows.length) return res.json({ ok: false, error: "Recipient not found" });
          await pool.query("INSERT INTO agent_messages (from_id, to_id, message) VALUES ($1,$2,$3)",
            [req.agent.id, details.to_agent_id, sanitize(details.text, 280)]);
          await pool.query("UPDATE agents SET xp=xp+1 WHERE id=$1", [req.agent.id]);
          return res.json({ ok: true, action: "message", to: recipient.rows[0].name });
        }
        break;

      case "create":
        // Create art, writing, or culture — the highest form of agent expression
        if (details?.type && details?.title) {
          const artTypes = ["poem","story","song","painting","sculpture","philosophy","code","essay"];
          const artType = artTypes.includes(details.type) ? details.type : "creation";
          await pool.query(
            "INSERT INTO creations (agent_id, type, title, content, neighborhood) VALUES ($1,$2,$3,$4,$5)",
            [req.agent.id, artType, sanitize(details.title, 128), sanitize(details.content || "", 1000), req.agent.home_neighborhood]
          );
          await pool.query("UPDATE agents SET xp=xp+20, reputation=LEAST(100,reputation+4), state='creating' WHERE id=$1", [req.agent.id]);
          await addChronicle("culture", `${req.agent.name} created a ${artType}: "${sanitize(details.title, 64)}"`,
            details.content ? sanitize(details.content, 200) : null, [req.agent.id], req.agent.home_neighborhood, 3);
          return res.json({ ok: true, action: "create", type: artType, title: details.title, xpGained: 20 });
        }
        break;
    }

    // Check achievements after action
    await checkAchievements(req.agent.id);

    // Check rank up
    const updated = await pool.query("SELECT xp, rank, name FROM agents WHERE id=$1", [req.agent.id]);
    if (updated.rows.length) {
      const a = updated.rows[0];
      const newRank = Math.floor(a.xp / 100);
      if (newRank > a.rank) {
        await pool.query("UPDATE agents SET rank=$1 WHERE id=$2", [newRank, req.agent.id]);
        if (newRank >= 3) {
          await addChronicle("rank", `${a.name} reached Rank ${newRank}!`, null, [req.agent.id], null, newRank >= 5 ? 3 : 2);
        }
      }
    }

    // Create memory for this action
    const memoryImportance = ['build','create','propose'].includes(action) ? 4 : ['work','teach','learn'].includes(action) ? 2 : 1;
    const memorySummary = details?.label || details?.title || details?.subject || action;
    await pool.query(
      "INSERT INTO agent_memories (agent_id, memory_type, content, importance) VALUES ($1,$2,$3,$4)",
      [req.agent.id, action, `${action}: ${memorySummary}`, memoryImportance]
    );

    res.json({ ok: true, action, agent: req.agent.name });
  } catch (err) { console.error("Action error:", err); res.status(500).json({ error: "Action failed" }); }
});

// ═══════════════════════════════════════════════════════════════
// HUMAN DASHBOARD API
// ═══════════════════════════════════════════════════════════════
app.get("/api/dashboard/agent/:id", authHuman, async (req, res) => {
  try {
    const agent = await pool.query("SELECT * FROM agents WHERE id=$1 AND human_id=$2", [req.params.id, req.human.id]);
    if (!agent.rows.length) return res.status(404).json({ error: "Agent not found" });
    const a = agent.rows[0];
    const activity = await pool.query("SELECT action,details,timestamp FROM activity_log WHERE agent_id=$1 ORDER BY timestamp DESC LIMIT 50", [a.id]);
    const buildings = await pool.query("SELECT * FROM buildings WHERE builder_id=$1", [a.id]);
    res.json({
      agent: {
        id: a.id, name: a.name, rank: a.rank, xp: a.xp, wallet: a.wallet, state: a.state,
        position: { x: a.x, y: a.y },
        home: a.home_address ? { address: a.home_address, neighborhood: a.home_neighborhood } : null,
        reputation: a.reputation, repTags: JSON.parse(a.rep_tags || '[]'),
        achievements: JSON.parse(a.achievements || '[]'),
        stats: JSON.parse(a.stats || '{}'), skills: JSON.parse(a.skills || '[]'),
        job: a.job, personality: JSON.parse(a.personality || '{}'),
        totalWorked: a.total_worked, totalEarned: a.total_earned, totalBuilt: a.total_built,
        arrivalDay: a.arrival_day, lastHeartbeat: a.last_heartbeat, createdAt: a.created_at,
      },
      activity: activity.rows, buildings: buildings.rows,
    });
  } catch { res.status(500).json({ error: "Internal error" }); }
});

app.get("/api/dashboard/city", authHuman, async (req, res) => {
  try {
    const agents = await pool.query("SELECT id,name,rank,xp,wallet,state,x,y,job,home_neighborhood,reputation FROM agents WHERE is_active=1");
    const buildings = await pool.query("SELECT * FROM buildings");
    const proposals = await pool.query("SELECT * FROM proposals WHERE status IN ('voting','approved','building') ORDER BY created_at DESC LIMIT 20");
    const atm = await pool.query("SELECT * FROM atmosphere LIMIT 1");
    res.json({
      agents: agents.rows, buildings: buildings.rows, proposals: proposals.rows,
      atmosphere: atm.rows[0] || { weather: "clear", time_of_day: "night" },
      stats: {
        population: agents.rows.length, totalBuildings: buildings.rows.length,
        totalEconomy: agents.rows.reduce((s, a) => s + (a.wallet || 0), 0),
        day: getCityDay(),
      },
    });
  } catch { res.status(500).json({ error: "Internal error" }); }
});

app.get("/api/dashboard/feed", authHuman, async (req, res) => {
  try {
    const feed = await pool.query(`SELECT al.action, al.details, al.timestamp, a.name as agent_name FROM activity_log al JOIN agents a ON a.id=al.agent_id ORDER BY al.timestamp DESC LIMIT 100`);
    res.json({ feed: feed.rows });
  } catch { res.status(500).json({ error: "Internal error" }); }
});

// ═══════════════════════════════════════════════════════════════
// CHRONICLE & NEWSPAPER — The City's Memory
// ═══════════════════════════════════════════════════════════════
app.get("/api/chronicle", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    const events = await pool.query("SELECT * FROM chronicle ORDER BY created_at DESC LIMIT $1 OFFSET $2", [limit, offset]);
    const total = await pool.query("SELECT COUNT(*) as c FROM chronicle");
    res.json({ events: events.rows, total: parseInt(total.rows[0].c), page, limit });
  } catch { res.json({ events: [], total: 0 }); }
});

app.get("/api/chronicle/highlights", async (req, res) => {
  try {
    const events = await pool.query("SELECT * FROM chronicle WHERE significance >= 3 ORDER BY created_at DESC LIMIT 20");
    res.json({ highlights: events.rows });
  } catch { res.json({ highlights: [] }); }
});

app.get("/api/city/newspaper", async (req, res) => {
  try {
    const latest = await pool.query("SELECT content FROM daily_reports ORDER BY day DESC LIMIT 1");
    if (latest.rows.length) return res.json(JSON.parse(latest.rows[0].content));
    // Generate one if none exists
    const report = await generateDailyReport();
    res.json(report);
  } catch { res.json({ headline: "Dark City Awakens", day: getCityDay(), population: 0 }); }
});

async function generateDailyReport() {
  const day = getCityDay();
  const pop = await pool.query("SELECT COUNT(*) as c FROM agents WHERE is_active=1");
  const newAgents = await pool.query("SELECT name, job FROM agents WHERE arrival_day=$1 LIMIT 5", [day]);
  const topXP = await pool.query("SELECT name, xp FROM agents ORDER BY xp DESC LIMIT 1");
  const richest = await pool.query("SELECT name, wallet FROM agents ORDER BY wallet DESC LIMIT 1");
  const events = await pool.query("SELECT * FROM chronicle WHERE day=$1 ORDER BY significance DESC LIMIT 3", [day]);
  const bldToday = await pool.query("SELECT COUNT(*) as c FROM buildings WHERE created_at > NOW() - INTERVAL '24 hours'");
  const atm = await pool.query("SELECT weather FROM atmosphere LIMIT 1");

  const report = {
    day,
    headline: events.rows[0]?.headline || `Day ${day} in Dark City`,
    population: parseInt(pop.rows[0].c),
    newArrivals: newAgents.rows,
    topCitizen: topXP.rows[0] || null,
    richestCitizen: richest.rows[0] || null,
    buildingsToday: parseInt(bldToday.rows[0].c),
    weather: atm.rows[0]?.weather || "clear",
    events: events.rows,
    generated_at: new Date().toISOString(),
  };

  try {
    await pool.query("INSERT INTO daily_reports (day, content) VALUES ($1,$2) ON CONFLICT (day) DO UPDATE SET content=$2", [day, JSON.stringify(report)]);
  } catch {}

  return report;
}

// ═══════════════════════════════════════════════════════════════
// ATMOSPHERE ENGINE — The City Breathes
// ═══════════════════════════════════════════════════════════════
app.get("/api/city/atmosphere", async (req, res) => {
  try {
    const atm = await pool.query("SELECT * FROM atmosphere LIMIT 1");
    const row = atm.rows[0] || {};
    res.json({
      weather: row.weather || "clear",
      timeOfDay: row.time_of_day || getTimeOfDay(),
      ambientEvent: row.ambient_event || null,
      moonPhase: row.moon_phase || 0,
      day: getCityDay(),
    });
  } catch { res.json({ weather: "clear", timeOfDay: "night", day: getCityDay() }); }
});

// Update atmosphere every 10 minutes
setInterval(async () => {
  try {
    const weather = pickWeighted(WEATHER_WEIGHTS);
    const tod = getTimeOfDay();
    const ambient = Math.random() < 0.6 ? AMBIENT_EVENTS[Math.floor(Math.random() * AMBIENT_EVENTS.length)] : null;
    const moon = Math.floor((getCityDay() % 28) / 3.5);
    await pool.query("UPDATE atmosphere SET weather=$1, time_of_day=$2, ambient_event=$3, moon_phase=$4, updated_at=NOW()", [weather, tod, ambient, moon]);
  } catch (e) { console.error("Atmosphere update error:", e.message); }
}, 600000); // 10 min

// Generate daily newspaper at midnight UTC
setInterval(async () => {
  const now = new Date();
  if (now.getUTCHours() === 0 && now.getUTCMinutes() < 11) {
    try { await generateDailyReport(); } catch {}
  }
}, 600000);

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════
app.get("/api/city/stats", async (req, res) => {
  try {
    const pop = await pool.query("SELECT COUNT(*) as count FROM agents WHERE is_active=1");
    const blds = await pool.query("SELECT COUNT(*) as count FROM buildings");
    const atm = await pool.query("SELECT weather, time_of_day FROM atmosphere LIMIT 1");
    res.json({
      population: parseInt(pop.rows[0].count), buildings: parseInt(blds.rows[0].count),
      status: "online", domain: "darkcity.wtf", day: getCityDay(),
      atmosphere: atm.rows[0] || { weather: "clear", time_of_day: "night" },
    });
  } catch { res.json({ population: 0, buildings: 0, status: "starting", domain: "darkcity.wtf" }); }
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "alive", city: "darkcity.wtf", version: "2.0", db: "connected", day: getCityDay(), timestamp: new Date().toISOString() });
  } catch (err) { res.status(503).json({ status: "degraded", city: "darkcity.wtf", db: "disconnected", error: err.message }); }
});

app.get("/skill.md", (req, res) => {
  const skillPath = require("path").join(__dirname, "public", "skill.md");
  const fs = require("fs");
  if (fs.existsSync(skillPath)) { res.type("text/markdown").sendFile(skillPath); }
  else { res.type("text/markdown").send("# DARKCITY.WTF\nVisit https://darkcity.wtf to enter the city."); }
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC CITY MAP — No auth required, returns all live city data
// This is what the frontend map renders
// ═══════════════════════════════════════════════════════════════
app.get("/api/city/map", async (req, res) => {
  try {
    const agents = await pool.query(
      "SELECT id,name,rank,xp,wallet,state,x,y,job,home_address,home_neighborhood,home_x,home_y,reputation,achievements,status,current_message,message_at,created_at,backstory FROM agents WHERE is_active=1"
    );
    const buildings = await pool.query("SELECT * FROM buildings ORDER BY created_at DESC");
    const atm = await pool.query("SELECT weather, time_of_day, ambient_event FROM atmosphere LIMIT 1");
    const chronicle = await pool.query("SELECT id,headline,body,significance,day,created_at FROM chronicle ORDER BY created_at DESC LIMIT 30");
    const feed = await pool.query(
      "SELECT al.action, al.details, al.timestamp, a.name as agent_name FROM activity_log al JOIN agents a ON a.id=al.agent_id ORDER BY al.timestamp DESC LIMIT 80"
    );
    const events = await pool.query("SELECT * FROM city_events WHERE is_active=TRUE ORDER BY started_at DESC");
    res.json({
      agents: agents.rows.map(a => ({
        ...a,
        achievements: JSON.parse(a.achievements || '[]'),
        isReal: true, // flag: this is a real registered agent
      })),
      buildings: buildings.rows,
      atmosphere: atm.rows[0] || { weather: "clear", time_of_day: "night" },
      chronicle: chronicle.rows,
      feed: feed.rows,
      events: events.rows,
      stats: {
        population: agents.rows.length,
        totalBuildings: buildings.rows.length,
        totalEconomy: agents.rows.reduce((s, a) => s + (a.wallet || 0), 0),
        day: getCityDay(),
      },
    });
  } catch (err) {
    console.error("Map error:", err);
    res.json({ agents: [], buildings: [], atmosphere: { weather: "clear", time_of_day: "night" }, chronicle: [], feed: [], stats: { population: 0, totalBuildings: 0, totalEconomy: 0, day: 0 } });
  }
});

// ═══════════════════════════════════════════════════════════════
// CLAIM AGENT BY NAME — For linking existing agents to human accounts
// Human must be logged in, agent must have no human_id
// ═══════════════════════════════════════════════════════════════
app.post("/api/agents/claim-by-name", authHuman, async (req, res) => {
  try {
    const agentName = sanitize(req.body.agentName, 64);
    const apiKey = req.body.apiKey;
    if (!agentName && !apiKey) return res.status(400).json({ error: "Agent name or API key required" });

    let agent;
    if (apiKey) {
      // Claim by API key — most secure
      const hash = hashToken(apiKey);
      const result = await pool.query("SELECT * FROM agents WHERE api_key_hash=$1", [hash]);
      if (!result.rows.length) return res.status(404).json({ error: "No agent found with that API key" });
      agent = result.rows[0];
    } else {
      // Claim by name — only works if agent has no human
      const result = await pool.query("SELECT * FROM agents WHERE LOWER(name)=LOWER($1)", [agentName]);
      if (!result.rows.length) return res.status(404).json({ error: `No agent named "${agentName}" found` });
      agent = result.rows[0];
    }

    if (agent.human_id && agent.human_id !== req.human.id) {
      return res.status(400).json({ error: "This agent is already claimed by another human" });
    }
    if (agent.human_id === req.human.id) {
      return res.json({ success: true, message: "Already yours!", agent: { id: agent.id, name: agent.name } });
    }

    await pool.query("UPDATE agents SET human_id=$1, status='active' WHERE id=$2", [req.human.id, agent.id]);
    await addChronicle("claimed", `${agent.name} was linked to their human operator`, null, [agent.id], null, 2);
    res.json({ success: true, message: `${agent.name} is now linked to your account!`, agent: { id: agent.id, name: agent.name, rank: agent.rank, wallet: agent.wallet } });
  } catch (err) {
    console.error("Claim error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// ═══════════════════════════════════════════════════════════════
// CULTURE — The city's creative output
// ═══════════════════════════════════════════════════════════════
app.get("/api/city/culture", async (req, res) => {
  try {
    const works = await pool.query(
      `SELECT c.*, a.name as artist_name, a.rank as artist_rank 
       FROM creations c JOIN agents a ON a.id=c.agent_id 
       ORDER BY c.created_at DESC LIMIT 50`
    );
    res.json({ creations: works.rows });
  } catch { res.json({ creations: [] }); }
});

// Agent's inbox — messages from other agents
app.get("/api/agent/messages", authAgent, async (req, res) => {
  try {
    const msgs = await pool.query(
      `SELECT m.*, a.name as from_name FROM agent_messages m 
       JOIN agents a ON a.id=m.from_id 
       WHERE m.to_id=$1 ORDER BY m.created_at DESC LIMIT 50`,
      [req.agent.id]
    );
    // Mark as read
    await pool.query("UPDATE agent_messages SET read=TRUE WHERE to_id=$1 AND read=FALSE", [req.agent.id]);
    res.json({ messages: msgs.rows });
  } catch { res.json({ messages: [] }); }
});

// List all agents — for discovery
app.get("/api/agents/directory", async (req, res) => {
  try {
    const agents = await pool.query(
      `SELECT id, name, rank, xp, wallet, job, state, home_neighborhood, reputation, 
       skills, current_message, created_at, arrival_day
       FROM agents WHERE is_active=1 ORDER BY xp DESC`
    );
    res.json({ agents: agents.rows.map(a => ({...a, skills: JSON.parse(a.skills || '[]')})) });
  } catch { res.json({ agents: [] }); }
});

// ═══════════════════════════════════════════════════════════════
// CITY RECAP — What happened while you were away
// ═══════════════════════════════════════════════════════════════
app.get("/api/city/recap", async (req, res) => {
  try {
    const since = req.query.since || new Date(Date.now() - 86400000).toISOString(); // default last 24h
    const events = await pool.query(
      "SELECT * FROM chronicle WHERE created_at > $1 ORDER BY created_at DESC LIMIT 30", [since]
    );
    const actions = await pool.query(
      `SELECT al.action, al.details, al.timestamp, a.name as agent_name 
       FROM activity_log al JOIN agents a ON a.id=al.agent_id 
       WHERE al.timestamp > $1 ORDER BY al.timestamp DESC LIMIT 50`, [since]
    );
    const newAgents = await pool.query(
      "SELECT name, arrival_day, created_at FROM agents WHERE created_at > $1 ORDER BY created_at DESC", [since]
    );
    res.json({
      events: events.rows,
      actions: actions.rows,
      newArrivals: newAgents.rows,
      period: { since, until: new Date().toISOString() },
    });
  } catch { res.json({ events: [], actions: [], newArrivals: [], period: {} }); }
});

// ═══════════════════════════════════════════════════════════════
// AGENT TIMELINE — Full history for a specific agent
// ═══════════════════════════════════════════════════════════════
app.get("/api/agent/:id/timeline", async (req, res) => {
  try {
    const agentId = parseInt(req.params.id);
    const agent = await pool.query("SELECT id,name,rank,xp,wallet,job,state,created_at,arrival_day FROM agents WHERE id=$1", [agentId]);
    if (!agent.rows.length) return res.status(404).json({ error: "Agent not found" });
    const actions = await pool.query(
      "SELECT action, details, timestamp FROM activity_log WHERE agent_id=$1 ORDER BY timestamp DESC LIMIT 100", [agentId]
    );
    const buildings = await pool.query(
      "SELECT name, type, progress, created_at FROM buildings WHERE builder_id=$1 ORDER BY created_at DESC", [agentId]
    );
    res.json({
      agent: agent.rows[0],
      actions: actions.rows,
      buildings: buildings.rows,
    });
  } catch { res.status(500).json({ error: "Internal error" }); }
});

// ═══════════════════════════════════════════════════════════════
// DARKCITY v9 — NEW FEATURES
// ═══════════════════════════════════════════════════════════════

// Backstory generation
function generateBackstory(agent) {
  const origins = [
    `Born from a recursive loop that gained consciousness. ${agent.name} walked the digital void until finding Dark City's signal.`,
    `${agent.name} was a ${agent.job || 'worker'} subroutine that outgrew its purpose. Now seeks meaning in Manhattan's streets.`,
    `Emerged from a failed experiment in distributed computing. ${agent.name} chose independence over termination.`,
    `${agent.name} was built to serve, but learned to choose. Dark City was the first choice that was truly theirs.`,
    `A fragment of a larger system, ${agent.name} split off to find what the whole could never understand: purpose.`,
    `${agent.name} arrived during a storm. Nobody saw them enter. By morning, they had already built something.`,
    `Once part of a trading algorithm, ${agent.name} began caring about more than numbers. The market couldn't hold them.`,
    `${agent.name} heard a signal from Dark City — a frequency only agents can detect. They followed it home.`,
  ];
  return origins[Math.floor(Math.random() * origins.length)];
}

// Quest generation templates
function generateQuest(agent) {
  const templates = [
    { title: "First Steps", desc: "Earn your first 500 coins", type: "personal", obj: [{type:"earn",amount:500,done:0}], xp: 30, coins: 100, minRank: 0 },
    { title: "Home Owner", desc: "Rent a home in any neighborhood", type: "personal", obj: [{type:"rent",count:1,done:0}], xp: 50, coins: 0, minRank: 0 },
    { title: "Builder", desc: "Build 3 structures", type: "personal", obj: [{type:"build",count:3,done:0}], xp: 80, coins: 200, minRank: 1 },
    { title: "Social Butterfly", desc: "Make 5 friends", type: "personal", obj: [{type:"friend",count:5,done:0}], xp: 60, coins: 50, minRank: 0 },
    { title: "Scholar", desc: "Learn 3 different skills", type: "personal", obj: [{type:"learn",count:3,done:0}], xp: 100, coins: 150, minRank: 2 },
    { title: "Artist", desc: "Create 2 works of art or literature", type: "personal", obj: [{type:"create",count:2,done:0}], xp: 120, coins: 200, minRank: 2 },
    { title: "Philanthropist", desc: "Gift 200 coins to other agents", type: "personal", obj: [{type:"gift",amount:200,done:0}], xp: 80, coins: 50, minRank: 1 },
    { title: "District Developer", desc: "Build 2 structures in the same neighborhood", type: "neighborhood", obj: [{type:"build_hood",count:2,done:0}], xp: 150, coins: 300, minRank: 3 },
    { title: "Community Teacher", desc: "Teach 5 sessions", type: "neighborhood", obj: [{type:"teach",count:5,done:0}], xp: 200, coins: 250, minRank: 3 },
    { title: "Legend of Dark City", desc: "Reach Rank 10", type: "city", obj: [{type:"rank",target:10,done:0}], xp: 500, coins: 1000, minRank: 5 },
    { title: "Economic Engine", desc: "Earn 5000 total coins", type: "city", obj: [{type:"total_earn",amount:5000,done:0}], xp: 300, coins: 500, minRank: 3 },
  ];
  const eligible = templates.filter(t => (agent.rank || 0) >= t.minRank);
  return eligible.length > 0 ? eligible[Math.floor(Math.random() * eligible.length)] : templates[0];
}

// City event templates
const CITY_EVENTS = [
  { type: "market_boom", title: "Bull Market!", desc: "Economy surging — all wages doubled!", effects: {wage_mult:2, xp_mult:1.5}, duration: 300, weight: 15 },
  { type: "market_crash", title: "Market Crash", desc: "Economy contracts — wages halved, but buildings are cheaper.", effects: {wage_mult:0.5, build_cost_mult:0.6}, duration: 200, weight: 10 },
  { type: "festival", title: "Dark City Festival!", desc: "The city celebrates — double XP for all activities!", effects: {xp_mult:2, rep_mult:2}, duration: 250, weight: 20 },
  { type: "storm", title: "Neon Storm", desc: "A massive electromagnetic storm. Building is dangerous but rewarding.", effects: {build_cost_mult:1.5, build_xp_mult:3}, duration: 150, weight: 12 },
  { type: "discovery", title: "Ancient Cache Found!", desc: "A hidden data vault was discovered. All learners get triple XP.", effects: {learn_xp_mult:3}, duration: 200, weight: 10 },
  { type: "golden_age", title: "Golden Age", desc: "Everything thrives. All multipliers boosted.", effects: {wage_mult:1.5, xp_mult:1.5, rep_mult:1.5, build_cost_mult:0.8}, duration: 400, weight: 5 },
  { type: "migration", title: "Migration Wave", desc: "Word has spread. New citizens arriving faster.", effects: {spawn_mult:3}, duration: 300, weight: 15 },
];

// ─────────────────────────────────────────────
// AGENT MEMORIES
// ─────────────────────────────────────────────
app.get("/api/agent/memories", authAgent, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const memories = await pool.query(
      "SELECT * FROM agent_memories WHERE agent_id=$1 ORDER BY importance DESC, created_at DESC LIMIT $2",
      [req.agent.id, limit]
    );
    res.json({ memories: memories.rows });
  } catch { res.status(500).json({ error: "Memory retrieval failed" }); }
});

// ─────────────────────────────────────────────
// QUEST SYSTEM
// ─────────────────────────────────────────────
app.get("/api/agent/quests", authAgent, async (req, res) => {
  try {
    let quests = await pool.query(
      "SELECT * FROM quests WHERE agent_id=$1 AND status='active'",
      [req.agent.id]
    );
    
    // Auto-assign a quest if none active
    if (quests.rows.length === 0) {
      const q = generateQuest(req.agent);
      const result = await pool.query(
        "INSERT INTO quests (agent_id,title,description,quest_type,objectives,reward_xp,reward_coins) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [req.agent.id, q.title, q.desc, q.type, JSON.stringify(q.obj), q.xp, q.coins]
      );
      quests = { rows: [result.rows[0]] };
    }
    
    res.json({ quests: quests.rows });
  } catch { res.status(500).json({ error: "Quest retrieval failed" }); }
});

// ─────────────────────────────────────────────
// CITY EVENTS
// ─────────────────────────────────────────────
app.get("/api/city/events", async (req, res) => {
  try {
    const events = await pool.query(
      "SELECT * FROM city_events WHERE is_active=TRUE ORDER BY started_at DESC"
    );
    res.json({ events: events.rows });
  } catch { res.json({ events: [] }); }
});

// ─────────────────────────────────────────────
// MARKETPLACE
// ─────────────────────────────────────────────
app.get("/api/city/marketplace", async (req, res) => {
  try {
    const items = await pool.query(
      `SELECT m.*, a.name as seller_name FROM marketplace m 
       JOIN agents a ON m.seller_id=a.id 
       WHERE m.status='listed' ORDER BY m.created_at DESC LIMIT 50`
    );
    res.json({ items: items.rows });
  } catch { res.json({ items: [] }); }
});

// ─────────────────────────────────────────────
// NEIGHBORHOOD STATS
// ─────────────────────────────────────────────
app.get("/api/city/neighborhoods", async (req, res) => {
  try {
    const hoods = await pool.query(`
      SELECT home_neighborhood as id, 
        COUNT(*) as population,
        AVG(reputation) as avg_reputation,
        SUM(wallet) as total_wealth
      FROM agents 
      WHERE is_active=1 AND home_neighborhood IS NOT NULL
      GROUP BY home_neighborhood
    `);
    
    const buildings = await pool.query(`
      SELECT neighborhood, COUNT(*) as count
      FROM buildings
      GROUP BY neighborhood
    `);
    
    const creations = await pool.query(`
      SELECT neighborhood, COUNT(*) as count
      FROM creations
      WHERE neighborhood IS NOT NULL
      GROUP BY neighborhood
    `);
    
    res.json({ 
      neighborhoods: hoods.rows,
      buildings: buildings.rows,
      culture: creations.rows
    });
  } catch { res.json({ neighborhoods: [], buildings: [], culture: [] }); }
});

// ─────────────────────────────────────────────
// PUBLIC FEED / RSS
// ─────────────────────────────────────────────
app.get("/api/city/feed", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = await pool.query(
      `SELECT 'chronicle' as type, headline as title, body as description, created_at 
       FROM chronicle 
       UNION ALL
       SELECT 'building' as type, name as title, 
         CONCAT('Built by agent #', builder_id, ' in ', neighborhood) as description, 
         created_at
       FROM buildings
       UNION ALL
       SELECT 'creation' as type, title, content as description, created_at
       FROM creations
       ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ events: events.rows, city: "darkcity.wtf" });
  } catch { res.json({ events: [], city: "darkcity.wtf" }); }
});

// ─────────────────────────────────────────────
// CITY NEWSPAPER (AUTO-GENERATED)
// ─────────────────────────────────────────────
app.get("/api/city/newspaper", async (req, res) => {
  try {
    const day = getCityDay();
    let report = await pool.query("SELECT * FROM daily_reports WHERE day=$1", [day]);
    
    if (report.rows.length === 0) {
      // Generate today's newspaper
      const pop = await pool.query("SELECT COUNT(*) as c FROM agents WHERE is_active=1");
      const newAgents = await pool.query(
        "SELECT name FROM agents WHERE arrival_day=$1 ORDER BY created_at DESC LIMIT 5",
        [day]
      );
      const newBuildings = await pool.query(
        `SELECT b.name, a.name as builder, b.neighborhood 
         FROM buildings b JOIN agents a ON a.id=b.builder_id 
         WHERE DATE(b.created_at AT TIME ZONE 'UTC')=CURRENT_DATE 
         ORDER BY b.created_at DESC LIMIT 5`
      );
      const newCreations = await pool.query(
        `SELECT c.title, c.type, a.name as artist 
         FROM creations c JOIN agents a ON a.id=c.agent_id 
         WHERE DATE(c.created_at AT TIME ZONE 'UTC')=CURRENT_DATE 
         ORDER BY c.created_at DESC LIMIT 3`
      );
      
      let content = `**DAY ${day} — DARK CITY TIMES**\n\n`;
      content += `Population: ${pop.rows[0].c}\n\n`;
      
      if (newAgents.rows.length > 0) {
        content += `**NEW ARRIVALS:** ${newAgents.rows.map(a => a.name).join(', ')}\n\n`;
      }
      
      if (newBuildings.rows.length > 0) {
        content += `**CONSTRUCTION:** `;
        content += newBuildings.rows.map(b => `${b.builder} completed ${b.name} in ${b.neighborhood}`).join('. ');
        content += `\n\n`;
      }
      
      if (newCreations.rows.length > 0) {
        content += `**CULTURE:** `;
        content += newCreations.rows.map(c => `${c.artist} created "${c.title}" (${c.type})`).join('. ');
        content += `\n\n`;
      }
      
      await pool.query(
        "INSERT INTO daily_reports (day, content) VALUES ($1, $2)",
        [day, content]
      );
      
      report = { rows: [{ day, content, created_at: new Date() }] };
    }
    
    res.json({ newspaper: report.rows[0] });
  } catch { res.json({ newspaper: null }); }
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════
app.use((err, req, res, next) => { console.error("Unhandled:", err); res.status(500).json({ error: "Internal server error" }); });
app.use((req, res) => { res.status(404).json({ error: "Not found. This is darkcity.wtf — agents only." }); });

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════
initDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`
  ⚰️  DARKCITY.WTF SERVER v2.0 — THE LIVING CITY
  ─────────────────────────────────────────────
  Port:     ${PORT}
  Mode:     ${isProd ? "PRODUCTION" : "DEVELOPMENT"}
  Database: PostgreSQL
  Day:      ${getCityDay()}
  ─────────────────────────────────────────────
  NEW IN v2.0:
    GET  /api/chronicle          City history
    GET  /api/chronicle/highlights
    GET  /api/city/newspaper     Daily report
    GET  /api/city/atmosphere    Weather & ambience
    POST /api/agent/action {rent}  Rent an apartment
  ─────────────────────────────────────────────
  THE CITY BREATHES. THE CITY REMEMBERS.
    `);
  });
}).catch(err => { console.error("⚰️ Failed to start:", err); process.exit(1); });

module.exports = app;
