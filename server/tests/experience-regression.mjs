import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const DB_PATH = 'server/darkcity.db';

if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

function startServer() {
  const proc = spawn('node', ['dist/server/working-server.js'], { stdio: 'pipe' });
  return proc;
}

async function waitForHealth() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch('http://localhost:3001/health');
      if (r.ok) return;
    } catch {}
    await sleep(300);
  }
  throw new Error('server did not start');
}

async function json(url, options) {
  const r = await fetch(url, options);
  const body = await r.json();
  if (!r.ok) throw new Error(`${url} -> ${r.status} ${JSON.stringify(body)}`);
  return body;
}

let proc = startServer();
await waitForHealth();

// create building, ensure persistence across restart
const started = await json('http://localhost:3001/agents/darkflobi/buildings', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'Studio', districtId: '1', requiredProgress: 20, isResidential: true })
});
assert.ok(started.id, 'building id missing');

await sleep(22000); // allow at least one full tick after creation
let buildings = await json('http://localhost:3001/api/buildings');
const built = buildings.find((b) => b.id === started.id);
assert.ok(built, 'building disappeared before restart');
assert.ok(built.progress >= 0, 'building progress invalid');
assert.equal(built.status, 'completed', 'building did not complete');

proc.kill('SIGTERM');
await sleep(800);
proc = startServer();
await waitForHealth();

buildings = await json('http://localhost:3001/api/buildings');
const persisted = buildings.find((b) => b.id === started.id);
assert.ok(persisted, 'building missing after restart');
assert.equal(persisted.status, 'completed', 'completed building not persisted');

// home assignment auto-fix + HOME_ASSIGNED ledger
const db = new Database(DB_PATH);
db.prepare(`INSERT OR IGNORE INTO agents (id,name,status,current_location_id,darkcoin_balance,darkflobi_balance,home_district_id) VALUES ('homeless','homeless','active','1',0,0,NULL)`).run();
db.close();

proc.kill('SIGTERM');
await sleep(800);
proc = startServer();
await waitForHealth();

const agent = await json('http://localhost:3001/api/agents/homeless');
assert.ok(agent.residence.homeDistrictId, 'home district not auto-assigned');

const ledger = await json('http://localhost:3001/agents/homeless/ledger?limit=20');
assert.ok(ledger.items.some((i) => i.eventType === 'HOME_ASSIGNED'), 'HOME_ASSIGNED ledger event missing');

proc.kill('SIGTERM');
console.log('experience-regression: PASS');
