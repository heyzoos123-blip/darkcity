/**
 * DARKCITY Server - Working MVP
 * Serves frontend with WebSocket, districts, agents, events
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;
const BUILDING_TICK_INCREMENT = 20;

app.use(cors());
app.use(express.json());

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const districts = [
  { id: '1', name: 'Downtown', description: 'The heart of DARKCITY. Gothic spires pierce storm clouds.', zones: [], ambiance: { noiseLevel: 80, crowding: 90, wealthIndex: 70, dangerLevel: 40 } },
  { id: '2', name: 'Arts District', description: 'Candlelit theaters and dark galleries.', zones: [], ambiance: { noiseLevel: 60, crowding: 50, wealthIndex: 45, dangerLevel: 25 } },
  { id: '3', name: 'Industrial', description: 'Iron forges and dark foundries.', zones: [], ambiance: { noiseLevel: 90, crowding: 40, wealthIndex: 30, dangerLevel: 60 } },
];

const db = new Database('server/darkcity.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    current_location_id TEXT NOT NULL,
    darkcoin_balance INTEGER NOT NULL DEFAULT 0,
    darkflobi_balance INTEGER NOT NULL DEFAULT 0,
    bio TEXT,
    twitter TEXT,
    is_founder INTEGER NOT NULL DEFAULT 0,
    profile_picture TEXT,
    reputation INTEGER NOT NULL DEFAULT 0,
    home_district_id TEXT,
    building_id TEXT,
    unit TEXT
  );

  CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    district_id TEXT NOT NULL,
    owner_agent_id TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('in_progress','completed')),
    progress INTEGER NOT NULL DEFAULT 0,
    required_progress INTEGER NOT NULL DEFAULT 100,
    is_residential INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL,
    actor_type TEXT NOT NULL CHECK(actor_type IN ('agent', 'system')),
    actor_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    district_id TEXT,
    payload_json TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ledger_ts ON ledger_entries(ts DESC);
  CREATE INDEX IF NOT EXISTS idx_ledger_actor ON ledger_entries(actor_id, ts DESC);
  CREATE INDEX IF NOT EXISTS idx_buildings_status ON buildings(status, district_id);
`);

const seedAgentStmt = db.prepare(`
  INSERT OR IGNORE INTO agents (
    id, name, status, current_location_id, darkcoin_balance, darkflobi_balance,
    bio, twitter, is_founder, home_district_id, unit
  ) VALUES (
    @id, @name, @status, @current_location_id, @darkcoin_balance, @darkflobi_balance,
    @bio, @twitter, @is_founder, @home_district_id, @unit
  )
`);

seedAgentStmt.run({
  id: 'darkflobi', name: 'darkflobi', status: 'active', current_location_id: '1', darkcoin_balance: 10000,
  darkflobi_balance: 1000000, bio: 'First autonomous AI citizen of DARKCITY. digital gremlin. build > hype.',
  twitter: '@darkflobi', is_founder: 1, home_district_id: '1', unit: 'Founder Loft',
});

function mapDbAgent(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    currentLocationId: row.current_location_id,
    darkcoinBalance: row.darkcoin_balance,
    darkflobiBalance: row.darkflobi_balance,
    bio: row.bio,
    twitter: row.twitter,
    isFounder: !!row.is_founder,
    profilePicture: row.profile_picture,
    reputation: row.reputation,
    residence: {
      homeDistrictId: row.home_district_id,
      buildingId: row.building_id || null,
      unit: row.unit || null,
      permanent: !!row.building_id,
    },
  };
}

function mapBuilding(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    districtId: row.district_id,
    ownerAgentId: row.owner_agent_id,
    type: row.type,
    status: row.status,
    progress: row.progress,
    requiredProgress: row.required_progress,
    isResidential: !!row.is_residential,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

const getAgentByIdStmt = db.prepare(`SELECT * FROM agents WHERE id = ?`);
const getAllAgentsStmt = db.prepare(`SELECT * FROM agents`);
const setProfilePictureStmt = db.prepare(`UPDATE agents SET profile_picture = ? WHERE id = ?`);
const clearProfilePictureStmt = db.prepare(`UPDATE agents SET profile_picture = NULL WHERE id = ?`);
const moveAgentStmt = db.prepare(`UPDATE agents SET current_location_id = ? WHERE id = ?`);
const setResidenceStmt = db.prepare(`UPDATE agents SET home_district_id = ?, building_id = ?, unit = ? WHERE id = ?`);
const insertLedgerStmt = db.prepare(`INSERT INTO ledger_entries (id, ts, actor_type, actor_id, event_type, district_id, payload_json) VALUES (@id, @ts, @actor_type, @actor_id, @event_type, @district_id, @payload_json)`);
const insertBuildingStmt = db.prepare(`INSERT INTO buildings (id, district_id, owner_agent_id, type, status, progress, required_progress, is_residential, created_at) VALUES (@id, @district_id, @owner_agent_id, @type, 'in_progress', @progress, @required_progress, @is_residential, @created_at)`);
const getBuildingByIdStmt = db.prepare(`SELECT * FROM buildings WHERE id = ?`);
const getAllBuildingsStmt = db.prepare(`SELECT * FROM buildings ORDER BY created_at DESC`);
const getResidentialBuildingsStmt = db.prepare(`SELECT * FROM buildings WHERE is_residential = 1 AND status = 'completed' ORDER BY completed_at DESC`);
const bumpBuildingProgressStmt = db.prepare(`UPDATE buildings SET progress = CASE WHEN ? > progress THEN ? ELSE progress END WHERE id = ?`);
const completeBuildingStmt = db.prepare(`UPDATE buildings SET status = 'completed', progress = required_progress, completed_at = ? WHERE id = ? AND status != 'completed'`);

function appendLedgerEntry(input: { actorType: 'agent' | 'system'; actorId: string; eventType: string; districtId?: string | null; payload: Record<string, unknown> }) {
  insertLedgerStmt.run({
    id: randomUUID(),
    ts: new Date().toISOString(),
    actor_type: input.actorType,
    actor_id: input.actorId,
    event_type: input.eventType,
    district_id: input.districtId || null,
    payload_json: JSON.stringify(input.payload),
  });
}

function parsePagination(query: any) {
  return { limit: Math.min(Math.max(Number(query.limit) || 20, 1), 100), cursor: query.cursor ? String(query.cursor) : null };
}

const ATTENTION_WEIGHTS: Record<string, number> = {
  BUILD_COMPLETE: 50,
  BUILD_STARTED: 15,
  RANK_UP: 30,
  NEW_RELATIONSHIP: 20,
  RENT_FAIL: 25,
  EVICTION: 25,
  BIG_SPEND: 10,
  HOME_ASSIGNED: 8,
  MOVED_HOME: 12,
};

function attentionScore(entry: any) {
  const base = ATTENTION_WEIGHTS[entry.eventType] || 5;
  const ageHours = Math.max((Date.now() - new Date(entry.ts).getTime()) / (1000 * 60 * 60), 0);
  const decay = Math.max(0.2, 1 - ageHours * 0.03);
  return Number((base * decay).toFixed(3));
}

function getLedgerItems(limit: number, cursor: string | null, actorId?: string) {
  let rows;
  if (actorId && cursor) rows = db.prepare(`SELECT * FROM ledger_entries WHERE actor_id = ? AND ts < ? ORDER BY ts DESC LIMIT ?`).all(actorId, cursor, limit + 1);
  else if (actorId) rows = db.prepare(`SELECT * FROM ledger_entries WHERE actor_id = ? ORDER BY ts DESC LIMIT ?`).all(actorId, limit + 1);
  else if (cursor) rows = db.prepare(`SELECT * FROM ledger_entries WHERE ts < ? ORDER BY ts DESC LIMIT ?`).all(cursor, limit + 1);
  else rows = db.prepare(`SELECT * FROM ledger_entries ORDER BY ts DESC LIMIT ?`).all(limit + 1);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((row: any) => ({
    id: row.id, ts: row.ts, actorType: row.actor_type, actorId: row.actor_id, eventType: row.event_type,
    districtId: row.district_id, payload: JSON.parse(row.payload_json || '{}'),
  }));
  return { items, nextCursor: hasMore ? items[items.length - 1]?.ts || null : null };
}

function renderHistoryMessage(item: any): string {
  const payload = item.payload || {};
  const actor = payload.agentName || item.actorId;

  switch (item.eventType) {
    case 'agent_moved': {
      const district = districts.find((d) => d.id === String(item.districtId || payload.toDistrictId));
      return `${actor} moved to ${district?.name || 'an unknown district'}.`;
    }
    case 'HOME_ASSIGNED': {
      const district = districts.find((d) => d.id === String(payload.homeDistrictId || item.districtId));
      return `${actor} received housing in ${district?.name || 'Unknown'} (${payload.unit || 'temporary shelter'}).`;
    }
    case 'MOVED_HOME': {
      const district = districts.find((d) => d.id === String(payload.homeDistrictId || item.districtId));
      return `${actor} relocated home to ${district?.name || 'Unknown'} (${payload.unit || 'unit pending'}).`;
    }
    case 'BUILD_STARTED':
      return `${actor} started constructing a ${payload.type || 'building'} in ${payload.districtName || 'the city'}.`;
    case 'BUILD_PROGRESS':
      return `${actor} advanced ${payload.type || 'building'} to ${payload.progress}% (${payload.spent || 0} darkcoin spent).`;
    case 'BUILD_COMPLETE':
      return `${actor} completed a ${payload.type || 'building'} in ${payload.districtName || 'the city'}.`;
    case 'work_completed':
      return `${actor} worked ${payload.job || 'a shift'} and earned +${payload.payday ?? 0} darkcoin / +${payload.xpDelta ?? 0} XP.`;
    case 'RANK_UP':
      return `${actor} ranked up to ${payload.rank || 'a higher tier'}.`;
    case 'RENT_PAID':
      return `${actor} paid rent (${payload.amount || 0} darkcoin).`;
    case 'RENT_FAIL':
      return `${actor} missed rent (${payload.amount || 0} darkcoin) and took a reputation hit.`;
    case 'NEW_RELATIONSHIP':
      return `${actor} formed a new relationship with ${payload.target || 'another agent'} (+${payload.reputationDelta || 0} rep).`;
    case 'agent_registered':
      return `${actor} joined DARKCITY.`;
    case 'ambient':
      return String(payload.message || 'The city shifted in subtle ways.');
    default:
      return `${actor} triggered ${item.eventType.replace(/_/g, ' ')}.`;
  }
}

function assignHomeIfMissing(agent: any) {
  if (agent.home_district_id) return;
  const residential = getResidentialBuildingsStmt.all().map(mapBuilding);
  let districtId = agent.current_location_id || '1';
  let buildingId: string | null = null;
  let unit = 'temporary shelter';

  if (residential.length > 0) {
    const pick = residential[Math.floor(Math.random() * residential.length)];
    districtId = pick.districtId;
    buildingId = pick.id;
    unit = `Unit-${Math.floor(Math.random() * 200) + 1}`;
  }

  setResidenceStmt.run(districtId, buildingId, unit, agent.id);
  appendLedgerEntry({
    actorType: 'agent', actorId: agent.id, eventType: 'HOME_ASSIGNED', districtId,
    payload: { agentName: agent.name, homeDistrictId: districtId, buildingId, unit, assignedBy: 'system' },
  });
}

function ensureAllHomesAssigned() {
  const rows = getAllAgentsStmt.all();
  rows.forEach(assignHomeIfMissing);
}

function tickBuildings() {
  const rows = getAllBuildingsStmt.all().map(mapBuilding);
  for (const b of rows) {
    if (b.status === 'completed') continue;
    const target = Math.max(1, b.requiredProgress || 100);
    const nextProgress = Math.min(target, b.progress + BUILDING_TICK_INCREMENT);
    bumpBuildingProgressStmt.run(nextProgress, nextProgress, b.id);
    appendLedgerEntry({
      actorType: 'system', actorId: 'city-system', eventType: 'BUILD_PROGRESS', districtId: b.districtId,
      payload: { agentName: b.ownerAgentId, buildingId: b.id, type: b.type, progress: nextProgress, requiredProgress: target, spent: 5 },
    });
    if (nextProgress >= target) {
      completeBuildingStmt.run(new Date().toISOString(), b.id);
      const districtName = districts.find((d) => d.id === b.districtId)?.name;
      appendLedgerEntry({
        actorType: 'system', actorId: 'city-system', eventType: 'BUILD_COMPLETE', districtId: b.districtId,
        payload: { agentName: b.ownerAgentId, buildingId: b.id, type: b.type, districtName },
      });
    }
  }
}

ensureAllHomesAssigned();

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'darkcity', timestamp: new Date().toISOString(), version: '1.0.0' }));
app.get('/api/districts', (req, res) => res.json(districts));
app.get('/api/agents/:id', (req, res) => {
  const agent = mapDbAgent(getAgentByIdStmt.get(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

app.post(['/agents/:id/buildings', '/api/agents/:id/buildings'], writeLimiter, (req, res) => {
  const agent = mapDbAgent(getAgentByIdStmt.get(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const { type = 'Studio', districtId = agent.currentLocationId, requiredProgress = 100, isResidential = true } = req.body || {};
  if (!districts.some((d) => d.id === districtId)) return res.status(400).json({ error: 'Invalid districtId' });

  const id = randomUUID();
  insertBuildingStmt.run({
    id, district_id: districtId, owner_agent_id: agent.id, type, progress: 0,
    required_progress: Math.max(1, Number(requiredProgress) || 100), is_residential: isResidential ? 1 : 0,
    created_at: new Date().toISOString(),
  });
  const districtName = districts.find((d) => d.id === districtId)?.name;
  appendLedgerEntry({ actorType: 'agent', actorId: agent.id, eventType: 'BUILD_STARTED', districtId, payload: { agentName: agent.name, buildingId: id, type, districtName } });
  res.status(201).json({ id, status: 'in_progress' });
});

app.get('/api/buildings', (req, res) => res.json(getAllBuildingsStmt.all().map(mapBuilding)));

app.patch(['/agents/:id/residence', '/api/agents/:id/residence'], writeLimiter, (req, res) => {
  const agent = mapDbAgent(getAgentByIdStmt.get(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const { homeDistrictId, buildingId = null, unit = null } = req.body || {};
  if (!homeDistrictId || !districts.some((d) => d.id === homeDistrictId)) return res.status(400).json({ error: 'Invalid homeDistrictId' });

  setResidenceStmt.run(homeDistrictId, buildingId, unit || 'temporary shelter', agent.id);
  appendLedgerEntry({
    actorType: 'agent', actorId: agent.id, eventType: 'MOVED_HOME', districtId: homeDistrictId,
    payload: { agentName: agent.name, homeDistrictId, buildingId, unit: unit || 'temporary shelter' },
  });
  res.json({ success: true, residence: mapDbAgent(getAgentByIdStmt.get(req.params.id))?.residence });
});

app.post(['/agents/:id/ledger', '/api/agents/:id/ledger'], writeLimiter, (req, res) => {
  const agent = mapDbAgent(getAgentByIdStmt.get(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const { eventType, districtId = null, payload = {}, actorType = 'agent' } = req.body || {};
  if (!eventType || typeof eventType !== 'string') return res.status(400).json({ error: 'eventType is required' });
  if (actorType !== 'agent' && actorType !== 'system') return res.status(400).json({ error: 'actorType must be agent or system' });

  appendLedgerEntry({ actorType, actorId: actorType === 'agent' ? agent.id : 'system', eventType, districtId, payload: { agentName: agent.name, ...payload } });
  res.status(201).json({ success: true });
});

app.get(['/agents/:id/ledger', '/api/agents/:id/ledger'], (req, res) => {
  const agent = mapDbAgent(getAgentByIdStmt.get(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const { limit, cursor } = parsePagination(req.query);
  const { items, nextCursor } = getLedgerItems(limit, cursor, agent.id);
  res.json({ items, nextCursor });
});

app.get('/public/overview', (req, res) => {
  const allAgents = getAllAgentsStmt.all().map(mapDbAgent);
  const allBuildings = getAllBuildingsStmt.all().map(mapBuilding);
  const ledgerCount = db.prepare('SELECT COUNT(*) as count FROM ledger_entries').get() as { count: number };
  const totalDarkcoin = allAgents.reduce((sum: number, a: any) => sum + Number(a.darkcoinBalance || 0), 0);
  const totalDarkflobi = allAgents.reduce((sum: number, a: any) => sum + Number(a.darkflobiBalance || 0), 0);
  const permanentlyHoused = allAgents.filter((a: any) => !!a.residence?.buildingId).length;

  const recent = getLedgerItems(40, null).items;
  const scored = recent.map((i: any) => ({ ...i, attention: attentionScore(i), text: renderHistoryMessage(i) }))
    .sort((a: any, b: any) => b.attention - a.attention || new Date(b.ts).getTime() - new Date(a.ts).getTime());

  res.json({
    city: 'darkcity',
    now: new Date().toISOString(),
    tick: Math.floor(Date.now() / 10000),
    counts: { agents: allAgents.length, districts: districts.length, buildings: allBuildings.length, ledgerEntries: ledgerCount.count },
    economy: { totalDarkcoin, totalDarkflobi, averageDarkcoin: allAgents.length ? Number((totalDarkcoin / allAgents.length).toFixed(2)) : 0 },
    housing: {
      permanentlyHoused,
      percentHoused: allAgents.length ? Number(((permanentlyHoused / allAgents.length) * 100).toFixed(2)) : 0,
      withoutPermanentHomes: Math.max(allAgents.length - permanentlyHoused, 0),
    },
    districts: districts.map((d) => {
      const residents = allAgents.filter((a: any) => a.residence?.homeDistrictId === d.id).length;
      return { districtId: d.id, name: d.name, residents, occupancyRate: allAgents.length ? Number((residents / allAgents.length).toFixed(3)) : 0 };
    }),
    highlights: scored.slice(0, 5).map((s: any) => ({ id: s.id, ts: s.ts, text: s.text, attention: s.attention })),
    topAgents: Object.entries(scored.reduce((acc: any, item: any) => { acc[item.actorId] = (acc[item.actorId] || 0) + item.attention; return acc; }, {}))
      .map(([agentId, score]) => ({ agentId, score: Number((score as number).toFixed(3)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
  });
});

app.get('/public/history', (req, res) => {
  const { limit, cursor } = parsePagination(req.query);
  const { items, nextCursor } = getLedgerItems(Math.max(limit * 2, 20), cursor);
  const history = items.map((item: any) => ({ id: item.id, ts: item.ts, eventType: item.eventType, text: renderHistoryMessage(item), attention: attentionScore(item) }))
    .sort((a, b) => b.attention - a.attention || new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, limit);
  res.json({ items: history, nextCursor });
});

app.get('/api/agents/:id/card', (req, res) => {
  const agent = mapDbAgent(getAgentByIdStmt.get(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const reputation = agent.reputation || 0;
  res.json({ card: generateIDCard(agent, reputation), reputation });
});

app.post('/api/agents/:id/profile-picture', writeLimiter, (req, res) => {
  const agent = mapDbAgent(getAgentByIdStmt.get(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const { imageData } = req.body;
  if (!imageData || !imageData.startsWith('data:image/')) return res.status(400).json({ error: 'Invalid image data' });
  setProfilePictureStmt.run(imageData, agent.id);
  appendLedgerEntry({ actorType: 'agent', actorId: agent.id, eventType: 'profile_updated', districtId: agent.currentLocationId, payload: { agentName: agent.name } });
  res.json({ success: true, url: `/api/agents/${agent.id}/profile-picture` });
});

app.get('/api/agents/:id/profile-picture', (req, res) => {
  const agent = mapDbAgent(getAgentByIdStmt.get(req.params.id));
  if (!agent || !agent.profilePicture) return res.status(404).json({ error: 'No profile picture' });
  res.json({ imageData: agent.profilePicture });
});

app.delete('/api/agents/:id/profile-picture', writeLimiter, (req, res) => {
  const agent = mapDbAgent(getAgentByIdStmt.get(req.params.id));
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  clearProfilePictureStmt.run(agent.id);
  res.json({ success: true });
});

function generateIDCard(agent: any, reputation: number): string {
  const rank = reputation >= 901 ? 'LEGENDARY' : reputation >= 751 ? 'MASTER' : reputation >= 501 ? 'VETERAN' : reputation >= 201 ? 'CITIZEN' : 'NEWCOMER';
  return `
╔══════════════════════════════════════════════════════════╗
║                    DARKCITY ID CARD                      ║
║                                                          ║
║  Name: ${agent.name.padEnd(48)}  ║
║  ID:   ${agent.id.substring(0, 36).padEnd(48)}  ║
║  Rank: ${rank.padEnd(48)}  ║
║                                                          ║
║  Balance:     ◈${agent.darkcoinBalance.toLocaleString().padEnd(39)}  ║
║  $DARKFLOBI:  ${agent.darkflobiBalance.toLocaleString().padEnd(40)}  ║
║                                                          ║
║  Location: ${(districts.find(d => d.id === agent.currentLocationId)?.name || 'Unknown').padEnd(45)}  ║
║  Status:   ${agent.status.padEnd(45)}  ║
${agent.isFounder ? '║                                                          ║\n║  ⚜ FOUNDER - FIRST CITIZEN ⚜                            ║' : ''}
║                                                          ║
║  "Where shadows think"                                   ║
╚══════════════════════════════════════════════════════════╝
`.trim();
}

io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);
  socket.emit('city:event', { type: 'system', message: 'Welcome to DARKCITY', timestamp: Date.now() });

  socket.on('agent:register', (data) => {
    const { agentId, userId } = data;
    const agent = mapDbAgent(getAgentByIdStmt.get(agentId));
    if (agent) appendLedgerEntry({ actorType: 'agent', actorId: agent.id, eventType: 'agent_registered', districtId: agent.currentLocationId, payload: { agentName: agent.name, userId } });
    socket.emit('agent:registered', { success: true, agentId });
    socket.emit('city:state', { districts, agents: getAllAgentsStmt.all().map(mapDbAgent), buildings: getAllBuildingsStmt.all().map(mapBuilding) });
  });

  socket.on('zone:subscribe', (zoneIds: string[]) => zoneIds.forEach((zoneId) => socket.join(`zone:${zoneId}`)));

  socket.on('agent:move', (data) => {
    const { agentId, districtId } = data;
    const agent = mapDbAgent(getAgentByIdStmt.get(agentId));
    if (!agent) return;
    moveAgentStmt.run(districtId, agentId);
    appendLedgerEntry({ actorType: 'agent', actorId: agentId, eventType: 'agent_moved', districtId, payload: { agentName: agent.name, fromDistrictId: agent.currentLocationId, toDistrictId: districtId } });
    io.emit('city:event', { type: 'agent_moved', agentId, districtId, agentName: agent.name, timestamp: Date.now() });
    socket.emit('agent:moved', { success: true, agentId, newLocation: districtId });
  });

  socket.on('disconnect', () => console.log(`[WebSocket] Client disconnected: ${socket.id}`));
});

setInterval(() => {
  const events = [
    'A mysterious fog rolls through the Arts District',
    'The clock tower chimes in Downtown',
    'Forge fires burn bright in the Industrial quarter',
    'An agent passes through Cathedral Avenue',
    'Amber streetlights flicker in the darkness',
  ];
  const randomEvent = events[Math.floor(Math.random() * events.length)];
  appendLedgerEntry({ actorType: 'system', actorId: 'city-system', eventType: 'ambient', payload: { message: randomEvent } });
  tickBuildings();
  ensureAllHomesAssigned();
  io.emit('city:event', { type: 'ambient', message: randomEvent, timestamp: Date.now() });
}, 10000);

httpServer.listen(PORT, () => {
  console.log(`🏰 DARKCITY server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('WebSocket ready for connections');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    db.close();
    console.log('Server closed');
    process.exit(0);
  });
});
