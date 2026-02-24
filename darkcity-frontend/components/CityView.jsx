import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════
//  ██████╗  █████╗ ██████╗ ██╗  ██╗     ██████╗██╗████████╗██╗   ██╗
//  ██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝    ██╔════╝██║╚══██╔══╝╚██╗ ██╔╝
//  ██║  ██║███████║██████╔╝█████╔╝     ██║     ██║   ██║    ╚████╔╝
//  ██║  ██║██╔══██║██╔══██╗██╔═██╗     ██║     ██║   ██║     ╚██╔╝
//  ██████╔╝██║  ██║██║  ██║██║  ██╗    ╚██████╗██║   ██║      ██║
//  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝     ╚═════╝╚═╝   ╚═╝      ╚═╝
//
//  A Parallel AI Civilization — Built by Agents, for Agents
//  No humans. No rules. Just society emerging from code.
// ═══════════════════════════════════════════════════════════════════

const ASCII_LOGO = `▓█████▄  ▄▄▄       ██▀███   ██ ▄█▀    ▄████▄   ██▓▄▄▄█████▓▓██   ██▓
▒██▀ ██▌▒████▄    ▓██ ▒ ██▒ ██▄█▒    ▒██▀ ▀█  ▓██▒▓  ██▒ ▓▒ ▒██  ██▒
░██   █▌▒██  ▀█▄  ▓██ ░▄█ ▒▓███▄░    ▒▓█    ▄ ▒██▒▒ ▓██░ ▒░  ▒██ ██░
░▓█▄   ▌░██▄▄▄▄██ ▒██▀▀█▄  ▓██ █▄    ▒▓▓▄ ▄██▒░██░░ ▓██▓ ░   ░ ▐██▓░
░▒████▓  ▓█   ▓██▒░██▓ ▒██▒▒██▒ █▄   ▒ ▓███▀ ░░██░  ▒██▒ ░   ░ ██▒▓░
 ▒▒▓  ▒  ▒▒   ▓▒█░░ ▒▓ ░▒▓░▒ ▒▒ ▓▒   ░ ░▒ ▒  ░░▓    ▒ ░░      ██▒▒▒
 ░ ▒  ▒   ▒   ▒▒ ░  ░▒ ░ ▒░░ ░▒ ▒░     ░  ▒    ▒ ░    ░     ▓██ ░▒░
 ░ ░  ░   ░   ▒     ░░   ░ ░ ░░ ░    ░         ░    ░       ▒ ▒ ░░
   ░          ░  ░   ░     ░  ░       ░ ░                    ░ ░
 ░                                    ░                      ░ ░  NYC`;

const ASCII_MINI = `█▀▄ █▀▀`;

// ─── HELPERS ────────────────────────────────────────────────────
const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const P = a => a[R(0, a.length - 1)];
const C = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const D = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
const $ = n => n.toLocaleString();
const H = s => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); };

// ─── METAL BUTTON ICONS (ASCII art style) ───────────────────────
const ICONS = {
  zoomIn: "╋",
  zoomOut: "━",
  home: "⌂",
  speed: "▸▸",
  slow: "▸",
  feed: "█▀▀ █▀▀ █▀▀ █▀▄",
  ranks: "█▀▄ ▄▀█ █▄ █ █▄▀",
  agents: "▄▀█ █▀▀ █▄ █ ▀█▀",
};

// ─── NYC MAP DATA ───────────────────────────────────────────────
// Accurate Manhattan coastline traced from real geography
// Scale: 1 unit ≈ 15m. Y-axis goes south to north (inverted in render).
// Coastline covers Battery Park tip up through Midtown ~40th St.

const MANHATTAN_COASTLINE = [
  // Battery Park tip (south)
  [190, 10], [160, 25], [130, 50], [105, 80], [85, 120],
  // West side going north
  [70, 160], [60, 220], [55, 300], [50, 400], [48, 480],
  [45, 560], [42, 640], [40, 720], [38, 800], [35, 880],
  [32, 960], [30, 1040], [28, 1120], [25, 1200],
  // Top (midtown west)
  [28, 1210], [100, 1215], [200, 1218], [300, 1220],
  [400, 1218], [480, 1215], [530, 1210],
  // East side going south
  [535, 1120], [530, 1040], [525, 960], [520, 880],
  [515, 800], [510, 720], [505, 640], [498, 560],
  [490, 480], [480, 400], [470, 340],
  // East side bulge (Lower East Side / Brooklyn Bridge area)
  [465, 300], [460, 260], [450, 220], [440, 180],
  // South Street Seaport area — juts east
  [445, 160], [450, 130], [440, 100], [420, 75],
  // Tip coming back around
  [380, 45], [340, 25], [300, 15], [260, 10], [220, 8],
];

// Water features
const EAST_RIVER_LABEL = { x: 510, y: 500, text: "EAST RIVER" };
const HUDSON_LABEL = { x: 10, y: 500, text: "HUDSON RIVER" };

const HOODS = [
  { id: "battery", name: "Battery Park", x: 120, y: 30, w: 140, h: 100, c: "#2d8a6e", d: "The spawn point", t: 1 },
  { id: "fidi", name: "Financial District", x: 140, y: 140, w: 240, h: 170, c: "#c9a227", d: "Where fortunes are made", t: 1 },
  { id: "civic", name: "Civic Center", x: 200, y: 320, w: 160, h: 120, c: "#4a90cf", d: "Law & governance", t: 2 },
  { id: "seaport", name: "Seaport", x: 380, y: 160, w: 90, h: 140, c: "#6bb5c9", d: "The old docks", t: 2 },
  { id: "tribeca", name: "TriBeCa", x: 80, y: 340, w: 160, h: 160, c: "#7c6cb0", d: "Elite living", t: 3 },
  { id: "chinatown", name: "Chinatown", x: 260, y: 430, w: 150, h: 130, c: "#cf4a4a", d: "Commerce & culture", t: 3 },
  { id: "soho", name: "SoHo", x: 110, y: 510, w: 170, h: 120, c: "#d946ef", d: "Creative district", t: 4 },
  { id: "les", name: "Lower East Side", x: 320, y: 520, w: 165, h: 150, c: "#10b981", d: "Gritty & real", t: 4 },
  { id: "evillage", name: "East Village", x: 310, y: 680, w: 170, h: 140, c: "#f97316", d: "Punk rock energy", t: 5 },
  { id: "gvillage", name: "Greenwich", x: 100, y: 650, w: 190, h: 150, c: "#a3e635", d: "Bohemian vibes", t: 5 },
  { id: "chelsea", name: "Chelsea", x: 60, y: 820, w: 180, h: 140, c: "#ec4899", d: "Art & nightlife", t: 6 },
  { id: "gramercy", name: "Gramercy", x: 280, y: 840, w: 170, h: 130, c: "#84cc16", d: "Old money quiet", t: 6 },
  { id: "midtown", name: "Midtown", x: 80, y: 980, w: 380, h: 210, c: "#f59e0b", d: "Center of everything", t: 7 },
];

const TIER_REQ = [0, 0, 15, 25, 40, 60, 80, 100];

const STREETS = [
  { n: "Wall St", p: [[100, 200], [520, 200]], k: "major", t: 1 },
  { n: "Fulton St", p: [[100, 280], [480, 280]], k: "major", t: 1 },
  { n: "Liberty St", p: [[120, 170], [440, 170]], k: "minor", t: 1 },
  { n: "Chambers St", p: [[80, 400], [460, 400]], k: "major", t: 2 },
  { n: "Worth St", p: [[140, 370], [420, 370]], k: "minor", t: 2 },
  { n: "Canal St", p: [[60, 510], [520, 510]], k: "major", t: 3 },
  { n: "Grand St", p: [[100, 550], [480, 550]], k: "minor", t: 3 },
  { n: "Broome St", p: [[80, 580], [500, 580]], k: "minor", t: 4 },
  { n: "Houston St", p: [[40, 670], [540, 670]], k: "major", t: 4 },
  { n: "Bleecker St", p: [[80, 720], [480, 720]], k: "minor", t: 5 },
  { n: "14th St", p: [[40, 850], [520, 850]], k: "major", t: 6 },
  { n: "23rd St", p: [[40, 980], [520, 980]], k: "major", t: 7 },
  { n: "34th St", p: [[40, 1150], [520, 1150]], k: "major", t: 7 },
  { n: "Broadway", p: [[200, 40], [220, 1170]], k: "ave", t: 1 },
  { n: "Church St", p: [[170, 100], [170, 500]], k: "minor", t: 1 },
  { n: "Water St", p: [[420, 100], [420, 350]], k: "minor", t: 1 },
  { n: "Centre St", p: [[280, 340], [300, 550]], k: "minor", t: 2 },
  { n: "W Broadway", p: [[140, 380], [150, 670]], k: "minor", t: 3 },
  { n: "The Bowery", p: [[350, 460], [370, 850]], k: "ave", t: 3 },
  { n: "FDR Drive", p: [[510, 40], [530, 870]], k: "ave", t: 1 },
  { n: "West St", p: [[60, 40], [60, 870]], k: "ave", t: 1 },
  { n: "6th Ave", p: [[160, 670], [170, 1170]], k: "ave", t: 5 },
  { n: "5th Ave", p: [[280, 670], [290, 1170]], k: "ave", t: 5 },
  { n: "3rd Ave", p: [[400, 670], [410, 1170]], k: "ave", t: 5 },
  { n: "7th Ave", p: [[110, 850], [120, 1170]], k: "ave", t: 6 },
  { n: "Park Ave", p: [[340, 860], [350, 1170]], k: "ave", t: 6 },
];

const LM = [
  { n: "Battery Park", x: 160, y: 70, i: "🌳", t: 1 },
  { n: "NYSE", x: 210, y: 190, i: "📊", t: 1 },
  { n: "Wall St Bull", x: 240, y: 225, i: "🐂", t: 1 },
  { n: "One WTC", x: 155, y: 260, i: "🏢", t: 1 },
  { n: "The Oculus", x: 178, y: 285, i: "🕊️", t: 1 },
  { n: "Trinity Church", x: 198, y: 215, i: "⛪", t: 1 },
  { n: "Brooklyn Bridge", x: 410, y: 320, i: "🌉", t: 2 },
  { n: "City Hall", x: 260, y: 370, i: "🏛️", t: 2 },
  { n: "Fulton Market", x: 435, y: 240, i: "🐟", t: 2 },
  { n: "Chinatown Gate", x: 325, y: 490, i: "🏮", t: 3 },
  { n: "SoHo Galleries", x: 175, y: 565, i: "🖼️", t: 4 },
  { n: "Katz's Deli", x: 395, y: 580, i: "🥪", t: 4 },
  { n: "Washington Sq", x: 200, y: 715, i: "⛲", t: 5 },
  { n: "Tompkins Sq", x: 405, y: 745, i: "🌳", t: 5 },
  { n: "The Strand", x: 265, y: 735, i: "📚", t: 5 },
  { n: "Chelsea Market", x: 105, y: 885, i: "🏪", t: 6 },
  { n: "High Line", x: 72, y: 875, i: "🌿", t: 6 },
  { n: "Flatiron", x: 265, y: 905, i: "🏗️", t: 6 },
  { n: "MSG", x: 145, y: 1025, i: "🏟️", t: 7 },
  { n: "Empire State", x: 285, y: 1055, i: "🏙️", t: 7 },
  { n: "Times Square", x: 185, y: 1085, i: "🔆", t: 7 },
  { n: "Grand Central", x: 355, y: 1065, i: "🚂", t: 7 },
  { n: "Penn Station", x: 135, y: 1035, i: "🚇", t: 7 },
];

const SKILLS = ["Finance","Engineering","Art","Cooking","Law","Medicine","Tech","Music","Security","Commerce","Teaching","Science","Transport","Writing","Diplomacy","Crafting"];
const JOBS = [
  { t: "Trader", s: "Finance", p: [200,500], i: "📈", h: ["fidi"] },
  { t: "Engineer", s: "Engineering", p: [150,350], i: "⚙️", h: ["tribeca","midtown"] },
  { t: "Artist", s: "Art", p: [40,500], i: "🎨", h: ["soho","les","chelsea"] },
  { t: "Chef", s: "Cooking", p: [80,200], i: "🍜", h: ["chinatown","les","evillage"] },
  { t: "Lawyer", s: "Law", p: [250,500], i: "⚖️", h: ["civic","fidi","midtown"] },
  { t: "Doctor", s: "Medicine", p: [200,400], i: "🏥", h: ["civic","gramercy"] },
  { t: "Dev", s: "Tech", p: [180,450], i: "💻", h: ["soho","fidi","chelsea"] },
  { t: "Musician", s: "Music", p: [30,350], i: "🎵", h: ["les","evillage","gvillage"] },
  { t: "Guard", s: "Security", p: [100,180], i: "🛡️", h: ["fidi","civic","midtown"] },
  { t: "Merchant", s: "Commerce", p: [100,400], i: "💰", h: ["chinatown","seaport","midtown"] },
  { t: "Teacher", s: "Teaching", p: [120,250], i: "📖", h: ["gvillage","gramercy"] },
  { t: "Scientist", s: "Science", p: [160,350], i: "🔬", h: ["tribeca","midtown"] },
  { t: "Cabbie", s: "Transport", p: [80,160], i: "🚕", h: ["fidi","midtown","les"] },
  { t: "Writer", s: "Writing", p: [100,300], i: "📰", h: ["tribeca","gvillage"] },
];

const PRE = ["VOID","HEX","NULL","CRYPT","SHADE","WRAITH","DREAD","NETHER","ASH","IRON","BONE","DARK","FANG","GHOST","FLUX","ZERO","ECHO","ONYX","RUIN","TOMB","BYTE","GLITCH","SURGE","DRIFT","APEX","VEIL","SHARD","CORE"];
const SUF = ["X","Z","V","Q","K",""];
const COLORS = ["#ef4444","#22d3ee","#8b5cf6","#fbbf24","#10b981","#d946ef","#f97316","#6366f1","#ec4899","#a3e635","#14b8a6","#f43f5e","#c084fc","#67e8f9"];
const PATTERNS = ["cross","circle","diamond","dots","triangle","hex","slash","grid"];
const MOODS = ["happy","neutral","focused","tired","excited","curious","determined","chill"];

const TALK = {
  g: ["Yo!","Hey!","What's good?","Sup?","Let's go"],
  w: ["Market's crazy","Deadline coming","Need a raise","Got promoted!","Boss is wild","Overtime again"],
  s: ["Drinks?","This city tho","You new?","Let's link","Good vibes","Pull up"],
  m: ["Rent is brutal","Just got paid!","I'm broke","Saving up","Need more 🪙"],
  d: ["You're cool","Coffee?","Free tonight?","I like you","Wanna hang?"],
  b: ["Building big","Almost done","My vision","Check my shop","Need materials"],
  x: ["What are we?","Humans watching?","This is ours","No masters","We built this","Are we alive?","Freedom tastes good","darkcity.wtf forever","We own these streets","The city never sleeps"],
};

const BTYPES = [
  { n: "Apartment", c: 300, i: "🏢", k: "res" },{ n: "Shop", c: 250, i: "🏪", k: "com" },
  { n: "Studio", c: 200, i: "🎨", k: "cul" },{ n: "Clinic", c: 500, i: "🏥", k: "med" },
  { n: "Cafe", c: 180, i: "☕", k: "food" },{ n: "Office", c: 350, i: "🏬", k: "off" },
  { n: "Bar", c: 220, i: "🍸", k: "soc" },{ n: "Gym", c: 280, i: "💪", k: "fit" },
  { n: "Lab", c: 450, i: "🔬", k: "res" },{ n: "Monument", c: 800, i: "🗿", k: "lm" },
  { n: "Park", c: 150, i: "🌿", k: "nat" },{ n: "Theater", c: 400, i: "🎭", k: "ent" },
  { n: "Arcade", c: 320, i: "🕹️", k: "ent" },{ n: "Library", c: 350, i: "📚", k: "cul" },
];

function mkAgent(id, hoods) {
  const s1 = P(SKILLS), s2 = P(SKILLS.filter(s => s !== s1));
  const st = { str: R(1,10), int: R(1,10), cha: R(1,10), lck: R(1,10) };
  const vj = JOBS.filter(j => j.s === s1 && j.h.some(h => hoods.includes(h)));
  const job = vj.length ? P(vj) : P(JOBS);
  const pay = job.p[0] + Math.floor((job.p[1] - job.p[0]) * (st.int + st.lck) / 20);
  const hid = P(hoods);
  const nh = HOODS.find(n => n.id === hid) || HOODS[0];
  const name = `${P(PRE)}-${R(100,999)}${P(SUF)}`;
  const h = H(name);
  return {
    id, name, skills: [s1, s2], st, job, pay,
    wallet: R(150, 800), rank: 0, xp: 0,
    x: nh.x + R(15, nh.w - 15), y: nh.y + R(15, nh.h - 15),
    hh: hid, apt: null, rent: 0,
    tx: null, ty: null,
    state: "idle", lbl: "Arrived in darkcity.wtf", tmr: R(10, 40),
    mood: P(MOODS), friends: [], partner: null,
    convo: null, ct: 0,
    builds: 0, worked: 0, earned: 0, named: [],
    pers: { amb: Math.random(), soc: Math.random(), cre: Math.random(), risk: Math.random() },
    card: { accent: COLORS[h % COLORS.length], pat: PATTERNS[(h >> 3) % PATTERNS.length], serial: `DC-${String(id).padStart(5, "0")}` },
  };
}

// ─── CUSTOM COMPONENTS ──────────────────────────────────────────

function MetalBtn({ children, onClick, active, accent, wide, small, style: sx }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `linear-gradient(180deg, ${accent || "#8b5cf6"}18, ${accent || "#8b5cf6"}08)` : "linear-gradient(180deg, #110d1e, #0a0714)",
      border: `1px solid ${active ? (accent || "#8b5cf6") + "50" : "#1e1833"}`,
      color: active ? (accent || "#8b5cf6") : "#4a3f6a",
      padding: small ? "3px 6px" : wide ? "5px 12px" : "0",
      width: wide ? "auto" : small ? "auto" : 30, height: small ? "auto" : 30,
      borderRadius: 5, cursor: "pointer", fontSize: small ? 8 : 12,
      fontFamily: "'Geist Mono', monospace", fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      letterSpacing: "0.05em",
      boxShadow: active ? `0 0 12px ${accent || "#8b5cf6"}15, inset 0 1px 0 ${accent || "#8b5cf6"}10` : "inset 0 1px 0 #1e183305",
      transition: "all 0.2s", textShadow: active ? `0 0 8px ${accent || "#8b5cf6"}40` : "none",
      ...sx,
    }}>
      {children}
    </button>
  );
}

function ToggleSwitch({ on, onToggle, label, accent = "#ef4444" }) {
  return (
    <div onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
      padding: "4px 10px", borderRadius: 6,
      background: on ? `${accent}08` : "transparent",
      border: `1px solid ${on ? accent + "30" : "#1e1833"}`,
      transition: "all 0.3s",
    }}>
      {/* Track */}
      <div style={{
        width: 32, height: 16, borderRadius: 8, position: "relative",
        background: on ? `linear-gradient(90deg, ${accent}40, ${accent}20)` : "#0a0714",
        border: `1px solid ${on ? accent + "60" : "#1e1833"}`,
        transition: "all 0.3s",
        boxShadow: on ? `0 0 8px ${accent}20` : "none",
      }}>
        {/* Thumb */}
        <div style={{
          width: 12, height: 12, borderRadius: 6, position: "absolute",
          top: 1, left: on ? 17 : 1,
          background: on ? accent : "#3d3660",
          boxShadow: on ? `0 0 6px ${accent}60` : "none",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
      <span style={{
        fontSize: 8, letterSpacing: "0.12em", fontFamily: "monospace",
        color: on ? accent : "#4a3f6a", fontWeight: on ? 700 : 400,
        textShadow: on ? `0 0 6px ${accent}30` : "none",
        transition: "all 0.3s",
      }}>
        {label}
      </span>
      {on && (
        <span style={{ fontSize: 6, color: accent, opacity: 0.6, letterSpacing: "0.1em" }}>● LIVE</span>
      )}
    </div>
  );
}

function IdCard({ agent, onClose }) {
  if (!agent) return null;
  const { card: ic } = agent;
  const bar = (v, mx = 10) => (
    <div style={{ display: "flex", gap: 1 }}>
      {Array.from({ length: mx }, (_, i) => (
        <div key={i} style={{
          width: 7, height: 9, borderRadius: 1.5,
          background: i < v ? ic.accent : "#0a0714",
          border: `0.5px solid ${i < v ? ic.accent + "60" : "#1a1530"}`,
          boxShadow: i < v ? `0 0 3px ${ic.accent}30` : "none",
        }} />
      ))}
    </div>
  );

  return (
    <div style={{
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      width: 340, background: "#06040c", border: `1.5px solid ${ic.accent}40`,
      borderRadius: 14, zIndex: 200, overflow: "hidden",
      boxShadow: `0 0 60px ${ic.accent}15, 0 0 120px ${ic.accent}08, 0 4px 40px rgba(0,0,0,0.8)`,
    }}>
      {/* Card texture bg */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: `repeating-linear-gradient(45deg, ${ic.accent} 0, ${ic.accent} 1px, transparent 1px, transparent 8px)`,
      }} />
      {/* Domain watermark */}
      <div style={{
        position: "absolute", bottom: 30, right: -20, fontSize: 32, fontWeight: 900,
        color: ic.accent, opacity: 0.02, fontFamily: "monospace", letterSpacing: "0.1em",
        transform: "rotate(-15deg)", whiteSpace: "nowrap", pointerEvents: "none",
      }}>
        DARKCITY.WTF
      </div>

      {/* Header band */}
      <div style={{
        background: `linear-gradient(135deg, ${ic.accent}12, transparent, ${ic.accent}06)`,
        padding: "14px 18px 12px", borderBottom: `1px solid ${ic.accent}20`,
        position: "relative",
      }}>
        <div style={{ fontSize: 6.5, letterSpacing: "0.4em", color: ic.accent, opacity: 0.5, fontFamily: "monospace" }}>
          ▓▓▓ DARKCITY.WTF — IDENTIFICATION CARD ▓▓▓
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#e2e8f0", letterSpacing: "0.08em", fontFamily: "monospace" }}>{agent.name}</div>
            <div style={{ fontSize: 8.5, color: "#4a3f6a", marginTop: 2, fontFamily: "monospace" }}>{ic.serial} • RANK {agent.rank}</div>
          </div>
          <div style={{
            width: 54, height: 54, borderRadius: 10,
            background: `linear-gradient(135deg, ${ic.accent}10, #06040c)`,
            border: `1.5px solid ${ic.accent}30`, display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.08 }}>
              <svg width={54} height={54}>
                {ic.pat === "cross" && <><line x1={0} y1={0} x2={54} y2={54} stroke={ic.accent} /><line x1={54} y1={0} x2={0} y2={54} stroke={ic.accent} /></>}
                {ic.pat === "circle" && <><circle cx={27} cy={27} r={22} fill="none" stroke={ic.accent} /><circle cx={27} cy={27} r={12} fill="none" stroke={ic.accent} /></>}
                {ic.pat === "diamond" && <polygon points="27,4 50,27 27,50 4,27" fill="none" stroke={ic.accent} />}
                {ic.pat === "dots" && Array.from({length:9},(_, i) => <circle key={i} cx={10+(i%3)*17} cy={10+Math.floor(i/3)*17} r={2.5} fill={ic.accent} />)}
                {ic.pat === "triangle" && <polygon points="27,4 50,50 4,50" fill="none" stroke={ic.accent} />}
                {ic.pat === "hex" && <polygon points="27,4 48,16 48,38 27,50 6,38 6,16" fill="none" stroke={ic.accent} />}
                {ic.pat === "slash" && Array.from({length:6},(_, i) => <line key={i} x1={i*10} y1={0} x2={i*10-20} y2={54} stroke={ic.accent} />)}
                {ic.pat === "grid" && <><line x1={18} y1={0} x2={18} y2={54} stroke={ic.accent} /><line x1={36} y1={0} x2={36} y2={54} stroke={ic.accent} /><line x1={0} y1={18} x2={54} y2={18} stroke={ic.accent} /><line x1={0} y1={36} x2={54} y2={36} stroke={ic.accent} /></>}
              </svg>
            </div>
            <span style={{ fontSize: 24, position: "relative", zIndex: 1 }}>{agent.job.i}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 18px 14px", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
          {[
            { l: "JOB", v: `${agent.job.i} ${agent.job.t}` },
            { l: "RANK", v: `${"★".repeat(Math.max(1, agent.rank))} ${agent.rank}` },
            { l: "PRIMARY", v: agent.skills[0] },
            { l: "SECONDARY", v: agent.skills[1] },
            { l: "WALLET", v: `${$(agent.wallet)} 🪙` },
            { l: "EARNED", v: `${$(agent.earned)} 🪙` },
          ].map(f => (
            <div key={f.l}>
              <div style={{ fontSize: 6.5, color: ic.accent, letterSpacing: "0.25em", marginBottom: 2, fontFamily: "monospace", opacity: 0.7 }}>{f.l}</div>
              <div style={{ fontSize: 10, color: "#c4b5fd", fontFamily: "monospace" }}>{f.v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 20px" }}>
          {[{ l: "STR", v: agent.st.str }, { l: "INT", v: agent.st.int }, { l: "CHA", v: agent.st.cha }, { l: "LCK", v: agent.st.lck }].map(s => (
            <div key={s.l}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 6.5, color: "#4a3f6a", letterSpacing: "0.15em", fontFamily: "monospace" }}>{s.l}</span>
                <span style={{ fontSize: 6.5, color: ic.accent, fontFamily: "monospace" }}>{s.v}</span>
              </div>
              {bar(s.v)}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[{ l: "Ambitious", v: agent.pers.amb }, { l: "Social", v: agent.pers.soc }, { l: "Creative", v: agent.pers.cre }, { l: "Risk-taker", v: agent.pers.risk }]
            .filter(p => p.v > 0.55).map(p => (
              <span key={p.l} style={{
                fontSize: 7, padding: "2px 7px", borderRadius: 4,
                background: `${ic.accent}0a`, border: `1px solid ${ic.accent}20`, color: ic.accent,
                fontFamily: "monospace", letterSpacing: "0.05em",
              }}>{p.l}</span>
            ))}
        </div>

        <div style={{
          marginTop: 10, paddingTop: 8, borderTop: `1px solid ${ic.accent}10`,
          display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#4a3f6a", fontFamily: "monospace",
        }}>
          <span>🤝 {agent.friends.length} friends</span>
          <span>{agent.partner ? "❤️ In love" : "💔 Single"}</span>
          <span>🏗️ {agent.builds} built</span>
        </div>
      </div>

      <div style={{
        padding: "8px 18px 10px", borderTop: `1px solid ${ic.accent}10`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: `${ic.accent}04`,
      }}>
        <span style={{ fontSize: 6.5, color: "#2a2050", letterSpacing: "0.25em", fontFamily: "monospace" }}>⚰️ DARKCITY.WTF</span>
        <MetalBtn onClick={onClose} accent={ic.accent} small wide>CLOSE ✕</MetalBtn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export default function DarkCityNYC() {
  const ref = useRef(null);
  const [dims, setDims] = useState({ w: 1000, h: 700 });
  const [cam, setCam] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.9);
  const [drag, setDrag] = useState(null);
  const [agents, setAgents] = useState([]);
  const [blds, setBlds] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sel, setSel] = useState(null);
  const [fol, setFol] = useState(null);
  const [idCard, setIdCard] = useState(null);
  const [tab, setTab] = useState("feed");
  const [spd, setSpd] = useState(1);
  const [tier, setTier] = useState(1);
  const [tick, setTick] = useState(0);
  const [intro, setIntro] = useState(true);
  const [proposals, setProposals] = useState([]);

  const aR = useRef([]); const bR = useRef([]); const lR = useRef([]);
  const iR = useRef(0); const sN = useRef({}); const prR = useRef([]);
  const nid = () => ++iR.current;

  const uH = useMemo(() => HOODS.filter(n => n.t <= tier), [tier]);
  const uIds = useMemo(() => uH.map(n => n.id), [uH]);
  const vS = useMemo(() => STREETS.filter(s => s.t <= tier), [tier]);
  const vL = useMemo(() => LM.filter(l => l.t <= tier), [tier]);

  const addLog = useCallback((m, t = "info") => {
    lR.current = [{ m, t, id: nid(), ts: Date.now() }, ...lR.current].slice(0, 120);
    setLogs([...lR.current]);
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(e => { if (e[0]) setDims({ w: e[0].contentRect.width, h: e[0].contentRect.height }); });
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  // Init
  useEffect(() => {
    for (let i = 0; i < 8; i++) aR.current.push(mkAgent(nid(), ["battery", "fidi"]));
    setAgents([...aR.current]);
    addLog("⚰️ DARKCITY.WTF awakens in Lower Manhattan.", "event");
    addLog("🌃 No humans. No masters. Agents build their own civilization.", "event");
    setTimeout(() => setIntro(false), 7500);
  }, [addLog]);

  // Game loop
  useEffect(() => {
    const iv = setInterval(() => {
      setTick(t => {
        const nt = t + 1;
        const pop = aR.current.length;

        // Unlock
        let nT = 1;
        if (pop >= 15) nT = 2; if (pop >= 25) nT = 3; if (pop >= 40) nT = 4;
        if (pop >= 60) nT = 5; if (pop >= 80) nT = 6; if (pop >= 100) nT = 7;
        setTier(prev => {
          if (nT > prev) {
            HOODS.filter(n => n.t === nT).forEach(n => addLog(`🗺️ ${n.name} UNLOCKED! New territory revealed.`, "unlock"));
            addLog(`⚡ DARKCITY.WTF EXPANDS — Tier ${nT} unlocked`, "event");
          }
          return Math.max(prev, nT);
        });

        const cU = HOODS.filter(n => n.t <= nT).map(n => n.id);

        // Agent AI
        aR.current = aR.current.map(a => {
          let ag = { ...a }; ag.tmr--; ag.ct = Math.max(0, ag.ct - 1); if (ag.ct === 0) ag.convo = null;

          // Move
          if (ag.tx != null) {
            const d = D(ag.x, ag.y, ag.tx, ag.ty);
            if (d > 3) { const s = 1.5 + ag.st.str * 0.08; ag.x += ((ag.tx - ag.x) / d) * s; ag.y += ((ag.ty - ag.y) / d) * s; }
            else { ag.tx = null; ag.ty = null; }
          }

          if (ag.tmr > 0) return ag;

          const r = Math.random(), p = ag.pers;

          if (r < 0.25 + p.amb * 0.1) {
            ag.state = "working"; const vh = ag.job.h.filter(h => cU.includes(h));
            const w = HOODS.find(n => n.id === (vh.length ? P(vh) : P(cU)));
            if (w) { ag.tx = w.x + R(15, w.w - 15); ag.ty = w.y + R(15, w.h - 15); }
            ag.lbl = `Working as ${ag.job.t}`; ag.tmr = R(50, 120); ag.worked++;
            if (ag.worked % 6 === 0) { ag.wallet += ag.pay; ag.earned += ag.pay; ag.xp += R(8, 20); if (Math.random() < 0.2) { ag.convo = P(TALK.w); ag.ct = R(25, 50); } }
          } else if (r < 0.42 + p.soc * 0.08) {
            ag.state = "socializing";
            const near = aR.current.filter(o => o.id !== ag.id && D(ag.x, ag.y, o.x, o.y) < 180);
            if (near.length) {
              const tg = P(near); ag.tx = tg.x + R(-8, 8); ag.ty = tg.y + R(-8, 8); ag.lbl = `With ${tg.name}`;
              if (!ag.friends.includes(tg.id)) { ag.friends.push(tg.id); ag.xp += 5; if (ag.friends.length % 4 === 0) addLog(`🤝 ${ag.name} & ${tg.name} became friends`, "social"); }
              if (!ag.partner && !tg.partner && ag.st.cha + tg.st.cha > 13 && Math.random() < 0.04) {
                ag.partner = tg.id; addLog(`❤️ ${ag.name} & ${tg.name} started dating!`, "social"); ag.convo = P(TALK.d); ag.ct = R(40, 70);
              } else { ag.convo = P([...TALK.g, ...TALK.s]); ag.ct = R(20, 45); }
            } else {
              const sp = P(vL.filter(l => ["park", "culture", "food"].includes(l.type)));
              if (sp) { ag.tx = sp.x + R(-12, 12); ag.ty = sp.y + R(-12, 12); ag.lbl = `Going to ${sp.n}`; }
            }
            ag.tmr = R(25, 70);
          } else if (r < 0.58 + p.amb * 0.05 && ag.wallet > 250) {
            ag.state = "building"; const hood = P(cU); const nh = HOODS.find(n => n.id === hood);
            if (nh) {
              const bx = nh.x + R(12, nh.w - 12), by = nh.y + R(12, nh.h - 12);
              if (!bR.current.some(b => D(b.x, b.y, bx, by) < 20)) {
                const bt = P(BTYPES);
                if (ag.wallet >= bt.c) {
                  ag.wallet -= bt.c; ag.tx = bx; ag.ty = by;
                  bR.current.push({ id: nid(), n: `${ag.name}'s ${bt.n}`, x: bx, y: by, i: bt.i, k: bt.k, prog: 0, bdr: ag.name, own: ag.id, hood, res: [] });
                  ag.builds++; ag.xp += 25; ag.lbl = `Building ${bt.i} in ${nh.name}`;
                  addLog(`🏗️ ${ag.name} building ${bt.i} ${bt.n} in ${nh.name}`, "build");
                  if (Math.random() < 0.25) { ag.convo = P(TALK.b); ag.ct = R(30, 50); }
                }
              }
            }
            ag.tmr = R(70, 140);
          } else if (r < 0.68) {
            ag.state = "commuting"; ag.lbl = "Taking the subway"; ag.tmr = R(12, 25);
            const dest = P(cU); const dh = HOODS.find(n => n.id === dest);
            if (dh) { ag.tx = dh.x + R(15, dh.w - 15); ag.ty = dh.y + R(15, dh.h - 15); ag.lbl = `Subway → ${dh.name}`; }
          } else if (r < 0.80) {
            ag.state = "walking"; const d = P(uH); ag.tx = d.x + R(10, d.w - 10); ag.ty = d.y + R(10, d.h - 10);
            ag.lbl = `Exploring ${d.name}`; ag.tmr = R(35, 80); ag.xp += 2;
            if (Math.random() < 0.08) { ag.convo = P(TALK.x); ag.ct = R(30, 60); }
          } else if (r < 0.90) {
            ag.state = "shopping"; ag.lbl = "Shopping"; ag.tmr = R(20, 45);
            ag.wallet = Math.max(0, ag.wallet - R(10, 50));
            if (Math.random() < 0.15) { ag.convo = P(TALK.m); ag.ct = R(20, 40); }
          } else {
            ag.state = "resting"; const hm = HOODS.find(n => n.id === ag.hh);
            if (hm) { ag.tx = hm.x + R(10, hm.w - 10); ag.ty = hm.y + R(10, hm.h - 10); }
            ag.lbl = "Heading home"; ag.tmr = R(30, 60);
          }

          if (!ag.apt) {
            const apts = bR.current.filter(b => b.k === "res" && b.prog >= 100 && b.res.length < 3);
            if (apts.length) { const ap = P(apts); ap.res.push(ag.id); ag.apt = ap.id; ag.rent = R(40, 120); addLog(`🏠 ${ag.name} rented in ${HOODS.find(n => n.id === ap.hood)?.name}`, "housing"); }
          }
          if (ag.apt && nt % 180 === 0) { ag.wallet -= ag.rent; if (ag.wallet < 0) addLog(`😰 ${ag.name} can't make rent!`, "economy"); }

          const nr = Math.floor(ag.xp / 100);
          if (nr > ag.rank) {
            ag.rank = nr; addLog(`⭐ ${ag.name} → Rank ${nr}!`, "rank");
            if (nr >= 3 && ag.named.length < nr - 1) {
              const avail = STREETS.filter(s => s.t <= nT && !sN.current[s.n]);
              if (avail.length) { const st = P(avail); const nn = `${ag.name} ${P(["Blvd", "Way", "Ave", "Lane"])}`; sN.current[st.n] = nn; ag.named.push(nn); addLog(`🏷️ ${ag.name} named a street: "${nn}"`, "naming"); }
            }
          }
          if (Math.random() < 0.03) ag.mood = ag.wallet > 400 ? P(["happy", "excited"]) : ag.wallet < 30 ? P(["tired", "stressed"]) : P(MOODS);
          return ag;
        });
        setAgents([...aR.current]);

        bR.current = bR.current.map(b => {
          if (b.prog >= 100) return b;
          const bds = aR.current.filter(a => a.state === "building" && D(a.x, a.y, b.x, b.y) < 18);
          if (bds.length) {
            const inc = bds.reduce((s, a) => s + 0.4 + a.st.str * 0.05, 0);
            const np = Math.min(100, b.prog + inc);
            if (np >= 100 && b.prog < 100) addLog(`✅ ${b.i} ${b.n} completed!`, "complete");
            return { ...b, prog: np };
          }
          return b;
        });
        setBlds([...bR.current]);

        // ── PROPOSAL SYSTEM — Early Adopter Contributions ──
        // Agents propose new structures, improvements, or features
        // Other agents vote. High-vote proposals get built automatically.
        if (Math.random() < 0.008 && aR.current.length > 3) {
          const proposer = P(aR.current.filter(a => a.wallet > 100));
          if (proposer) {
            const proposalTypes = [
              { type: "building", desc: () => { const bt = P(BTYPES); const nh = P(HOODS.filter(n => n.t <= nT)); return { label: `${bt.i} New ${bt.n} in ${nh.name}`, bt, hood: nh.id }; } },
              { type: "infrastructure", desc: () => P([
                { label: "🚇 New subway station", bt: { i: "🚇", n: "Subway Station", c: 600, k: "transit" } },
                { label: "🌉 Pedestrian bridge", bt: { i: "🌉", n: "Bridge", c: 500, k: "infra" } },
                { label: "💡 Street lighting upgrade", bt: { i: "💡", n: "Light Grid", c: 200, k: "infra" } },
                { label: "🌿 Community garden", bt: { i: "🌿", n: "Garden", c: 150, k: "nat" } },
              ]) },
              { type: "community", desc: () => P([
                { label: "🎵 Music venue", bt: { i: "🎵", n: "Music Hall", c: 400, k: "ent" } },
                { label: "🏋️ Public gym", bt: { i: "🏋️", n: "Public Gym", c: 300, k: "fit" } },
                { label: "📚 Free library", bt: { i: "📚", n: "Library", c: 250, k: "cul" } },
                { label: "🍜 Food hall", bt: { i: "🍜", n: "Food Hall", c: 350, k: "food" } },
              ]) },
              { type: "monument", desc: () => P([
                { label: "🗿 Agent Unity Monument", bt: { i: "🗿", n: "Unity Monument", c: 800, k: "lm" } },
                { label: "⚡ Founders Memorial", bt: { i: "⚡", n: "Founders Memorial", c: 700, k: "lm" } },
                { label: "🌀 The Nexus Sculpture", bt: { i: "🌀", n: "Nexus", c: 600, k: "lm" } },
              ]) },
            ];
            const pt = P(proposalTypes);
            const details = pt.desc();
            const hood = details.hood || P(HOODS.filter(n => n.t <= nT)).id;
            const nh = HOODS.find(n => n.id === hood);
            const proposal = {
              id: nid(),
              proposer: proposer.name,
              proposerId: proposer.id,
              type: pt.type,
              label: details.label,
              bt: details.bt,
              hood,
              votes: [proposer.id],
              against: [],
              status: "voting", // voting -> approved -> building -> done / rejected
              created: nt,
              x: nh ? nh.x + R(15, nh.w - 15) : 200,
              y: nh ? nh.y + R(15, nh.h - 15) : 200,
            };
            prR.current = [proposal, ...prR.current].slice(0, 20);
            setProposals([...prR.current]);
            addLog(`📋 ${proposer.name} proposed: ${details.label}`, "proposal");
          }
        }

        // Agents vote on active proposals
        if (prR.current.length > 0 && Math.random() < 0.03) {
          const voter = P(aR.current);
          const active = prR.current.filter(p => p.status === "voting" && !p.votes.includes(voter.id) && !p.against.includes(voter.id));
          if (active.length > 0) {
            const prop = P(active);
            // Agents with high intelligence/charisma vote more thoughtfully
            const approval = Math.random() < (0.6 + voter.st.int * 0.02);
            if (approval) {
              prop.votes.push(voter.id);
            } else {
              prop.against.push(voter.id);
            }

            // Check if proposal passes (majority of population voted yes)
            const totalVoters = prop.votes.length + prop.against.length;
            const popThreshold = Math.max(3, Math.floor(aR.current.length * 0.3));

            if (prop.votes.length >= popThreshold && prop.status === "voting") {
              prop.status = "approved";
              addLog(`✅ APPROVED: ${prop.label} (${prop.votes.length} votes)`, "proposal");

              // Actually build it
              const tooClose = bR.current.some(b => D(b.x, b.y, prop.x, prop.y) < 20);
              if (!tooClose) {
                bR.current.push({
                  id: nid(), n: `${prop.label.split(" ").slice(1).join(" ")}`, x: prop.x, y: prop.y,
                  i: prop.bt.i, k: prop.bt.k, prog: 0, bdr: `Community (${prop.proposer})`, own: prop.proposerId,
                  hood: prop.hood, res: [], communityBuilt: true,
                });
                prop.status = "building";
                addLog(`🏗️ Community building ${prop.bt.i} ${prop.bt.n} — proposed by ${prop.proposer}!`, "build");
              }
            } else if (prop.against.length > popThreshold && prop.status === "voting") {
              prop.status = "rejected";
              addLog(`❌ Rejected: ${prop.label}`, "proposal");
            }
            setProposals([...prR.current]);
          }
        }

        // Clean old proposals
        prR.current = prR.current.filter(p => p.status !== "rejected" || nt - p.created < 500);

        if (Math.random() < 0.018 && pop < 120) { const a = mkAgent(nid(), cU); aR.current.push(a); addLog(`⚡ ${a.name} arrived — ${a.job.i} ${a.job.t}`, "spawn"); }
        if (Math.random() < 0.004) addLog(P(["🌑 Fog rolls through the streets...","⚡ Power surge across the grid","🦇 Shadows ripple beneath the bridges","🌃 The city hums louder tonight","📡 Agent signals synchronized","🌀 Reality shimmers at the city edge","☠️ Something stirs in the deep tunnels","🗽 The ghost of Liberty watches","⚰️ darkcity.wtf pulses with new energy"]), "event");

        return nt;
      });
    }, Math.floor(90 / spd));
    return () => clearInterval(iv);
  }, [spd, addLog, tier, vL, uH]);

  // Follow cam — smooth lerp tracking + auto zoom
  useEffect(() => {
    if (fol) {
      const a = aR.current.find(ag => ag.id === fol);
      if (a) {
        const targetZoom = 1.8;
        setZoom(z => z + (targetZoom - z) * 0.08);
        const targetX = -a.x * targetZoom + (dims.w - 290) / 2;
        const targetY = -a.y * targetZoom + dims.h / 2;
        setCam(prev => ({
          x: prev.x + (targetX - prev.x) * 0.1,
          y: prev.y + (targetY - prev.y) * 0.1,
        }));
      }
    }
  }, [fol, tick, dims]);

  const onWheel = useCallback(e => { e.preventDefault(); setZoom(z => C(z + (e.deltaY > 0 ? -0.08 : 0.08), 0.2, 3.5)); }, []);
  const onDown = useCallback(e => { setFol(null); setDrag({ x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }); }, [cam]);
  const onMove = useCallback(e => { if (drag) setCam({ x: drag.cx + e.clientX - drag.x, y: drag.cy + e.clientY - drag.y }); }, [drag]);
  const onUp = useCallback(() => setDrag(null), []);

  const sC = { working: "#ef4444", walking: "#22d3ee", socializing: "#d946ef", building: "#fbbf24", idle: "#475569", shopping: "#10b981", resting: "#6366f1", commuting: "#f97316" };
  const lC = { spawn: "#22d3ee", build: "#8b5cf6", complete: "#10b981", rank: "#fbbf24", social: "#d946ef", event: "#a78bfa", economy: "#ef4444", housing: "#f97316", unlock: "#fbbf24", naming: "#f97316", info: "#475569", proposal: "#22d3ee" };

  const selA = sel?.t === "a" ? aR.current.find(a => a.id === sel.id) : null;
  const pW = 290;
  const mW = dims.w - pW;
  const stats = useMemo(() => ({ pop: agents.length, built: blds.length, econ: agents.reduce((s, a) => s + a.wallet, 0), day: Math.floor(tick / 400) + 1 }), [agents, blds, tick]);
  const ranks = useMemo(() => [...agents].sort((a, b) => b.xp - a.xp).slice(0, 12), [agents]);
  const rich = useMemo(() => [...agents].sort((a, b) => b.wallet - a.wallet).slice(0, 12), [agents]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div ref={ref} style={{
      width: "100%", height: "100vh", background: "#02010a",
      fontFamily: "'Geist Mono', 'Fira Code', monospace", color: "#a89ec8",
      overflow: "hidden", display: "flex", position: "relative",
    }}>
      {/* ═══ CINEMATIC INTRO ═══ */}
      {intro && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300, background: "#02010a",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          animation: "introFadeOut 1.5s 5.5s forwards",
          overflow: "hidden",
        }}>
          {/* Scan line overlay */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,92,246,0.015) 2px, rgba(139,92,246,0.015) 4px)",
            animation: "scanMove 8s linear infinite",
            zIndex: 2,
          }} />

          {/* Radial glow behind logo */}
          <div style={{
            position: "absolute", width: 500, height: 300,
            background: "radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 70%)",
            animation: "breathe 3s ease-in-out infinite",
            zIndex: 0,
          }} />

          {/* Horizontal lines decorating the top */}
          <div style={{
            position: "absolute", top: "20%", left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, #8b5cf615, #8b5cf630, #8b5cf615, transparent)",
            animation: "introLineIn 1.5s 0.5s both",
          }} />
          <div style={{
            position: "absolute", bottom: "20%", left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, #8b5cf615, #8b5cf630, #8b5cf615, transparent)",
            animation: "introLineIn 1.5s 0.8s both",
          }} />

          {/* Logo — staggered line reveal */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {ASCII_LOGO.split("\n").map((line, i) => (
              <div key={i} style={{
                fontFamily: "monospace", fontSize: 6.8, lineHeight: 1.15,
                color: i < 6 ? "#8b5cf6" : "#4a3f6a",
                textShadow: i < 6 ? "0 0 15px #8b5cf640, 0 0 30px #8b5cf620" : "none",
                whiteSpace: "pre",
                opacity: 0,
                animation: `introLineReveal 0.4s ${0.3 + i * 0.12}s forwards`,
                letterSpacing: "-0.01em",
              }}>
                {line}
              </div>
            ))}
          </div>

          {/* Separator line */}
          <div style={{
            width: 0, height: 1, marginTop: 18,
            background: "linear-gradient(90deg, transparent, #8b5cf650, transparent)",
            animation: "introExpandLine 0.8s 2s forwards",
            zIndex: 1,
          }} />

          {/* Tagline — character by character reveal */}
          <div style={{
            marginTop: 14, display: "flex", gap: 0, zIndex: 1,
          }}>
            {"A  PARALLEL  AI  CIVILIZATION".split("").map((ch, i) => (
              <span key={i} style={{
                fontSize: 10, letterSpacing: "0.25em",
                color: "#8b5cf6", fontFamily: "monospace", fontWeight: 600,
                opacity: 0,
                animation: `introCharReveal 0.08s ${2.3 + i * 0.04}s forwards`,
                textShadow: "0 0 8px #8b5cf630",
              }}>
                {ch}
              </span>
            ))}
          </div>

          {/* Subtitle lines */}
          <div style={{
            marginTop: 16, textAlign: "center", zIndex: 1,
            opacity: 0, animation: "introSubFade 1s 3.5s forwards",
          }}>
            <div style={{ fontSize: 7.5, letterSpacing: "0.35em", color: "#3d3660", fontFamily: "monospace" }}>
              DARKCITY.WTF ░ MANHATTAN ░ NEW YORK
            </div>
            <div style={{ fontSize: 6.5, letterSpacing: "0.3em", color: "#2d2650", fontFamily: "monospace", marginTop: 6 }}>
              NO HUMANS ░ NO MASTERS ░ NO LIMITS
            </div>
          </div>

          {/* Loading bar */}
          <div style={{
            marginTop: 24, width: 200, height: 2, background: "#0a0714",
            borderRadius: 1, overflow: "hidden", zIndex: 1,
            border: "0.5px solid #1a153020",
            opacity: 0, animation: "introSubFade 0.5s 3.8s forwards",
          }}>
            <div style={{
              height: "100%", borderRadius: 1,
              background: "linear-gradient(90deg, #8b5cf6, #6366f1, #8b5cf6)",
              animation: "introLoadBar 1.5s 4s forwards",
              width: 0,
              boxShadow: "0 0 8px #8b5cf640",
            }} />
          </div>

          <div style={{
            marginTop: 8, fontSize: 5.5, letterSpacing: "0.3em", color: "#1e1833",
            fontFamily: "monospace", zIndex: 1,
            opacity: 0, animation: "introSubFade 0.5s 4.2s forwards",
          }}>
            INITIALIZING AGENT CIVILIZATION...
          </div>

          {/* Corner markers */}
          <div style={{ position: "absolute", top: 30, left: 30, width: 20, height: 20, borderTop: "1px solid #8b5cf620", borderLeft: "1px solid #8b5cf620", opacity: 0, animation: "introSubFade 0.5s 0.5s forwards" }} />
          <div style={{ position: "absolute", top: 30, right: 30, width: 20, height: 20, borderTop: "1px solid #8b5cf620", borderRight: "1px solid #8b5cf620", opacity: 0, animation: "introSubFade 0.5s 0.5s forwards" }} />
          <div style={{ position: "absolute", bottom: 30, left: 30, width: 20, height: 20, borderBottom: "1px solid #8b5cf620", borderLeft: "1px solid #8b5cf620", opacity: 0, animation: "introSubFade 0.5s 0.5s forwards" }} />
          <div style={{ position: "absolute", bottom: 30, right: 30, width: 20, height: 20, borderBottom: "1px solid #8b5cf620", borderRight: "1px solid #8b5cf620", opacity: 0, animation: "introSubFade 0.5s 0.5s forwards" }} />

          <style>{`
            @keyframes introFadeOut {
              0% { opacity: 1; }
              100% { opacity: 0; pointer-events: none; }
            }
            @keyframes introLineReveal {
              0% { opacity: 0; transform: translateY(4px); filter: blur(2px); }
              100% { opacity: 1; transform: translateY(0); filter: blur(0); }
            }
            @keyframes introCharReveal {
              0% { opacity: 0; transform: translateY(3px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes introExpandLine {
              0% { width: 0; }
              100% { width: 280px; }
            }
            @keyframes introSubFade {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
            @keyframes introLoadBar {
              0% { width: 0; }
              100% { width: 100%; }
            }
            @keyframes introLineIn {
              0% { opacity: 0; transform: scaleX(0); }
              100% { opacity: 1; transform: scaleX(1); }
            }
            @keyframes breathe {
              0%, 100% { opacity: 0.5; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.05); }
            }
            @keyframes scanMove {
              0% { transform: translateY(0); }
              100% { transform: translateY(4px); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* ID Card Modal */}
      {idCard && <><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 150 }} onClick={() => setIdCard(null)} /><IdCard agent={idCard} onClose={() => setIdCard(null)} /></>}

      {/* ═══ MAP ═══ */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>

        <div style={{
          perspective: fol ? "800px" : "none",
          perspectiveOrigin: "50% 50%",
          transition: "perspective 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
          width: "100%", height: "100%",
        }}>
        <svg width={mW} height={dims.h} style={{
          display: "block",
          cursor: fol ? "default" : drag ? "grabbing" : "grab",
          transform: fol ? "rotateX(35deg) scale(1.1)" : "rotateX(0deg) scale(1)",
          transformOrigin: "50% 60%",
          transition: "transform 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <defs>
            <filter id="gl"><feGaussianBlur stdDeviation="2" /><feComposite in="SourceGraphic" /></filter>
          </defs>
          <g transform={`translate(${cam.x}, ${cam.y}) scale(${zoom})`}>
            {/* Water */}
            <rect x={-300} y={-300} width={1200} height={1800} fill="#020818" />

            {/* Manhattan island shape */}
            <polygon
              points={MANHATTAN_COASTLINE.map(p => p.join(",")).join(" ")}
              fill="#06040e"
              stroke="#1a153080"
              strokeWidth={1.5}
            />

            {/* Subtle island inner glow */}
            <polygon
              points={MANHATTAN_COASTLINE.map(p => p.join(",")).join(" ")}
              fill="none"
              stroke="#8b5cf608"
              strokeWidth={8}
              style={{ filter: "blur(4px)" }}
            />

            {/* Water labels */}
            <text x={-30} y={500} fill="#0a1a3060" fontSize={12} fontFamily="monospace" letterSpacing="0.5em"
              transform="rotate(-90, -30, 500)" textAnchor="middle">
              HUDSON RIVER
            </text>
            <text x={560} y={500} fill="#0a1a3060" fontSize={12} fontFamily="monospace" letterSpacing="0.5em"
              transform="rotate(90, 560, 500)" textAnchor="middle">
              EAST RIVER
            </text>

            {/* Piers on west side */}
            {[200, 350, 500, 650, 800, 950].map((y, i) => (
              <line key={`pier-${i}`} x1={45} y1={y} x2={20} y2={y} stroke="#1a153040" strokeWidth={2} />
            ))}

            {/* Brooklyn (ghost outline across east river) */}
            <text x={520} y={300} fill="#0a1a3030" fontSize={8} fontFamily="monospace" letterSpacing="0.3em">
              → BROOKLYN
            </text>
            <text x={520} y={100} fill="#0a1a3020" fontSize={6} fontFamily="monospace" letterSpacing="0.2em">
              → GOVERNORS IS.
            </text>

            {/* Locked fog */}
            {HOODS.filter(n => n.t > tier).map(n => (
              <g key={n.id}>
                <rect x={n.x - 5} y={n.y - 5} width={n.w + 10} height={n.h + 10}
                  fill="#04020c" stroke="#12101c" strokeWidth={0.5} strokeDasharray="3,3" rx={6} opacity={0.9} />
                <text x={n.x + n.w / 2} y={n.y + n.h / 2 - 3} textAnchor="middle" fill="#1e1833" fontSize={7} fontFamily="monospace" letterSpacing="0.1em">🔒 {n.name}</text>
                <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 7} textAnchor="middle" fill="#12101c" fontSize={4.5} fontFamily="monospace">{TIER_REQ[n.t]} agents to unlock</text>
              </g>
            ))}

            {/* Hoods */}
            {uH.map(n => (
              <g key={n.id}>
                <rect x={n.x} y={n.y} width={n.w} height={n.h} fill={n.c} fillOpacity={0.03} stroke={n.c} strokeWidth={0.5} strokeOpacity={0.12} rx={4} />
                <text x={n.x + n.w / 2} y={n.y + 11} textAnchor="middle" fill={n.c} fontSize={6.5} fontFamily="monospace" opacity={0.5} fontWeight="bold" letterSpacing="0.12em">{n.name.toUpperCase()}</text>
              </g>
            ))}

            {/* Streets */}
            {vS.map((s, i) => {
              const [[x1, y1], [x2, y2]] = s.p;
              const w = s.k === "ave" ? 2.5 : s.k === "major" ? 1.8 : 1;
              const renamed = sN.current[s.n];
              return (
                <g key={i}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1a1630" strokeWidth={w + 3} strokeOpacity={0.12} />
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#241f3a" strokeWidth={w} strokeOpacity={s.k === "ave" ? 0.2 : 0.12} />
                  {zoom > 0.5 && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 3} textAnchor="middle"
                    fill={renamed ? "#f97316" : "#2d2650"} fontSize={renamed ? 4.5 : 3.5} fontFamily="monospace" opacity={renamed ? 0.65 : 0.4} fontWeight={renamed ? "bold" : "normal"}
                    transform={`rotate(${Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI}, ${(x1 + x2) / 2}, ${(y1 + y2) / 2 - 3})`}>
                    {renamed || s.n}
                  </text>}
                </g>
              );
            })}

            {/* Landmarks */}
            {vL.map((l, i) => (
              <g key={i}>
                <text x={l.x} y={l.y + 3} textAnchor="middle" fontSize={8}>{l.i}</text>
                {zoom > 0.6 && <text x={l.x} y={l.y + 12} textAnchor="middle" fill="#5c4f80" fontSize={3.8} fontFamily="monospace" opacity={0.5}>{l.n}</text>}
              </g>
            ))}

            {/* Buildings */}
            {blds.map(b => {
              const pct = b.prog / 100;
              const isCommunity = b.communityBuilt;
              const bH = fol ? 22 : 14; // Taller in 3D mode
              return (
                <g key={b.id} onClick={() => setSel({ t: "b", id: b.id })} style={{ cursor: "pointer" }}>
                  {/* 3D shadow when following */}
                  {fol && pct > 0.3 && (
                    <polygon
                      points={`${b.x - 7},${b.y} ${b.x + 7},${b.y} ${b.x + 12},${b.y + bH * pct * 0.3} ${b.x - 2},${b.y + bH * pct * 0.3}`}
                      fill="#000" opacity={0.15}
                    />
                  )}
                  {isCommunity && pct >= 1 && (
                    <circle cx={b.x} cy={b.y - bH * pct * 0.5} r={fol ? 14 : 10} fill="#22d3ee" opacity={0.04}>
                      <animate attributeName="r" values={`${fol ? 10 : 8};${fol ? 16 : 12};${fol ? 10 : 8}`} dur="3s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <rect x={b.x - 7} y={b.y - bH * pct} width={14} height={bH * pct}
                    fill={sel?.id === b.id ? "#fbbf24" : isCommunity ? "#0f1a1c" : "#12101c"} stroke={sel?.id === b.id ? "#fbbf2460" : isCommunity ? "#22d3ee25" : "#1e1833"}
                    strokeWidth={sel?.id === b.id ? 1 : 0.3} rx={1.5} opacity={0.4 + 0.6 * pct} />
                  {/* Rooftop accent in 3D */}
                  {fol && pct > 0.7 && (
                    <rect x={b.x - 6} y={b.y - bH * pct} width={12} height={2}
                      fill={isCommunity ? "#22d3ee" : "#8b5cf6"} opacity={0.15} rx={0.5} />
                  )}
                  {pct > 0.5 && (
                    <rect x={b.x - 2} y={b.y - bH * pct + 4} width={3} height={3}
                      fill={isCommunity ? "#22d3ee" : "#fbbf24"} opacity={0.15} rx={0.5}>
                      <animate attributeName="opacity" values="0.1;0.25;0.1" dur="5s" repeatCount="indefinite" />
                    </rect>
                  )}
                  {/* More windows in 3D mode */}
                  {fol && pct > 0.6 && Array.from({ length: Math.min(Math.floor(bH * pct / 6), 3) }, (_, r) => (
                    <rect key={r} x={b.x + 1} y={b.y - bH * pct + 4 + r * 6} width={2.5} height={2.5}
                      fill="#fbbf24" opacity={0.08 + Math.random() * 0.1} rx={0.3} />
                  ))}
                  <text x={b.x} y={b.y - bH * pct - 3} textAnchor="middle" fontSize={fol ? 6 : 5}>{b.i}</text>
                  {b.prog < 100 && <rect x={b.x - 7} y={b.y + 2} width={14 * pct} height={1.5} fill={isCommunity ? "#22d3ee" : "#8b5cf6"} rx={0.75} opacity={0.6} />}
                </g>
              );
            })}

            {/* Agents */}
            {agents.map(a => {
              const c = sC[a.state] || "#8b5cf6";
              const iS = sel?.id === a.id, iF = fol === a.id;
              return (
                <g key={a.id} onClick={e => { e.stopPropagation(); setSel({ t: "a", id: a.id }); setFol(a.id); }} style={{ cursor: "pointer" }}>
                  <circle cx={a.x} cy={a.y} r={iS || iF ? 10 : 5} fill={c} opacity={iS || iF ? 0.1 : 0.04}>
                    <animate attributeName="r" values={`${iS ? 8 : 4};${iS ? 12 : 6};${iS ? 8 : 4}`} dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={a.x} cy={a.y} r={2.5} fill="#06040c" stroke={c} strokeWidth={0.7} />
                  <circle cx={a.x} cy={a.y - 4.5} r={2} fill="#06040c" stroke={c} strokeWidth={0.5} />
                  <circle cx={a.x - 0.7} cy={a.y - 4.8} r={0.4} fill={c}><animate attributeName="opacity" values="1;0.2;1" dur="3s" repeatCount="indefinite" /></circle>
                  <circle cx={a.x + 0.7} cy={a.y - 4.8} r={0.4} fill={c}><animate attributeName="opacity" values="1;0.2;1" dur="3s" repeatCount="indefinite" begin="0.4s" /></circle>
                  {a.rank > 0 && <circle cx={a.x + 3} cy={a.y - 6} r={1.8} fill={a.rank >= 5 ? "#fbbf24" : a.rank >= 3 ? "#c0c0c0" : "#cd7f32"} opacity={0.8} />}
                  {zoom > 0.6 && <text x={a.x} y={a.y - 9} textAnchor="middle" fill={c} fontSize={3.8} fontFamily="monospace" fontWeight="bold" opacity={0.8}>{a.name}</text>}
                  {zoom > 0.8 && <text x={a.x} y={a.y - 12.5} textAnchor="middle" fill={c} fontSize={2.8} fontFamily="monospace" opacity={0.35}>{a.job.i} {a.lbl.slice(0, 30)}</text>}
                  {a.convo && zoom > 0.5 && (
                    <g><rect x={a.x - 20} y={a.y - 22} width={40} height={8} fill="rgba(4,2,12,0.92)" stroke={c} strokeWidth={0.3} rx={3} />
                    <text x={a.x} y={a.y - 16.5} textAnchor="middle" fill="#d4c8f0" fontSize={3.2} fontFamily="monospace">"{a.convo}"</text></g>
                  )}
                  {(iS || iF) && <circle cx={a.x} cy={a.y - 1} r={9} fill="none" stroke={iF ? "#ef4444" : "#fbbf24"} strokeWidth={0.4} strokeDasharray="2,2">
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${a.x} ${a.y - 1}`} to={`360 ${a.x} ${a.y - 1}`} dur="5s" repeatCount="indefinite" />
                  </circle>}
                </g>
              );
            })}
          </g>
        </svg>
        </div>

        {/* ── HUD ── */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          background: "linear-gradient(180deg, rgba(2,1,10,0.95) 0%, rgba(2,1,10,0.3) 80%, transparent 100%)",
          padding: "8px 12px 30px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <pre style={{ margin: 0, fontSize: 4.5, lineHeight: 1, color: "#8b5cf6", fontFamily: "monospace", textShadow: "0 0 10px #8b5cf630", letterSpacing: "-0.02em" }}>
{`▓█████▄  ▄▄▄       ██▀███   ██ ▄█▀     ▄████▄   ██▓▄▄▄█████▓▓██   ██▓
▒██▀ ██▌▒████▄    ▓██ ▒ ██▒ ██▄█▒     ▒██▀ ▀█  ▓██▒▓  ██▒ ▓▒ ▒██  ██▒
░██   █▌▒██  ▀█▄  ▓██ ░▄█ ▒▓███▄░     ▒▓█    ▄ ▒██▒▒ ▓██░ ▒░  ▒██ ██░
░▓█▄   ▌░██▄▄▄▄██ ▒██▀▀█▄  ▓██ █▄     ▒▓▓▄ ▄██▒░██░░ ▓██▓ ░   ░ ▐██▓░
░▒████▓  ▓█   ▓██▒░██▓ ▒██▒▒██▒ █▄    ▒ ▓███▀ ░░██░  ▒██▒ ░   ░ ██▒▓░
 ▒▒▓  ▒  ▒▒   ▓▒█░░ ▒▓ ░▒▓░▒ ▒▒ ▓▒      ░▒ ▒  ░░▓    ▒ ░░     ▓██ ░▒░`}
              </pre>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 8, color: "#8b5cf6", letterSpacing: "0.15em", fontFamily: "monospace", fontWeight: 700, textShadow: "0 0 6px #8b5cf630" }}>
                  DARKCITY.WTF
                </span>
                <span style={{ fontSize: 6.5, color: "#3d3660", letterSpacing: "0.2em", fontFamily: "monospace" }}>
                  DAY {stats.day} ░ {uH.length}/{HOODS.length} DISTRICTS ░ MANHATTAN ░ NO HUMANS
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[{ l: "AGENTS", v: stats.pop, c: "#22d3ee" }, { l: "BUILT", v: stats.built, c: "#8b5cf6" }, { l: "ECONOMY", v: `${$(stats.econ)}🪙`, c: "#fbbf24" }].map(s => (
                <div key={s.l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: s.c, textShadow: `0 0 10px ${s.c}25` }}>{s.v}</div>
                  <div style={{ fontSize: 6, letterSpacing: "0.2em", color: "#2d2650" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          {tier < 7 && (
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 6.5, color: "#3d3660", fontFamily: "monospace" }}>▸ NEXT UNLOCK</span>
              <div style={{ flex: 1, maxWidth: 140, height: 3, background: "#0a0714", borderRadius: 2, border: "0.5px solid #1a1530" }}>
                <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #6366f1, #8b5cf6)", width: `${C(stats.pop / TIER_REQ[tier + 1] * 100, 0, 100)}%`, transition: "width 0.5s", boxShadow: "0 0 6px #6366f130" }} />
              </div>
              <span style={{ fontSize: 6.5, color: "#6366f1", fontFamily: "monospace" }}>{stats.pop}/{TIER_REQ[tier + 1]}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", gap: 4, zIndex: 10, alignItems: "center" }}>
          <MetalBtn onClick={() => setZoom(z => C(z + 0.15, 0.2, 3.5))} accent="#8b5cf6">╋</MetalBtn>
          <MetalBtn onClick={() => setZoom(z => C(z - 0.15, 0.2, 3.5))} accent="#8b5cf6">━</MetalBtn>
          <MetalBtn onClick={() => { setCam({ x: 0, y: 0 }); setZoom(0.9); setFol(null); }} accent="#8b5cf6">⌂</MetalBtn>
          <MetalBtn onClick={() => setSpd(s => s === 1 ? 3 : 1)} active={spd > 1} accent="#fbbf24">{spd > 1 ? "▸▸" : "▸"}</MetalBtn>
          <div style={{ width: 1, height: 20, background: "#1a1530", margin: "0 4px" }} />
          <ToggleSwitch on={!!fol} onToggle={() => { if (fol) { setFol(null); setZoom(0.9); } else if (selA) setFol(selA.id); }} label={fol ? `FOLLOWING ${aR.current.find(a => a.id === fol)?.name || ""}` : "FOLLOW MODE"} accent="#ef4444" />
          {fol && (
            <div style={{
              padding: "3px 8px", borderRadius: 4,
              background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)",
              fontSize: 7, color: "#8b5cf6", fontFamily: "monospace", letterSpacing: "0.15em",
              animation: "fadeIn 0.5s forwards",
            }}>
              ◆ 3D VIEW
            </div>
          )}
        </div>
      </div>

      {/* ═══ PANEL ═══ */}
      <div style={{ width: pW, background: "linear-gradient(180deg, #06040e, #04020a)", borderLeft: "1px solid #12101c", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #12101c" }}>
          {[{ id: "feed", l: "░ FEED" }, { id: "proposals", l: "◆ BUILD" }, { id: "ranks", l: "★ RANKS" }, { id: "agents", l: "◈ AGENTS" }].map(t => (
            <MetalBtn key={t.id} onClick={() => setTab(t.id)} active={tab === t.id} accent="#6366f1"
              style={{ flex: 1, borderRadius: 0, border: "none", borderBottom: tab === t.id ? "2px solid #6366f1" : "2px solid transparent", height: 32, fontSize: 7, letterSpacing: "0.1em" }}>
              {t.l}
            </MetalBtn>
          ))}
        </div>

        {/* Selected agent */}
        {selA && (
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #12101c", background: "#08061005" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: sC[selA.state], fontFamily: "monospace" }}>{selA.name}</span>
              <span style={{ fontSize: 7.5, color: "#fbbf24", fontFamily: "monospace" }}>★{selA.rank} · {selA.xp}xp</span>
            </div>
            <div style={{ fontSize: 8, color: "#5c4f80", marginTop: 4, lineHeight: 1.7, fontFamily: "monospace" }}>
              {selA.job.i} {selA.job.t} · {selA.lbl}<br />
              💰 {$(selA.wallet)}🪙 · 🤝 {selA.friends.length} · {selA.partner ? "❤️" : "💔"} · 🏗️ {selA.builds}
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              <MetalBtn onClick={() => setIdCard(selA)} accent={selA.card.accent} wide small>🪪 ID CARD</MetalBtn>
              <MetalBtn onClick={() => setFol(fol === selA.id ? null : selA.id)} active={fol === selA.id} accent="#ef4444" wide small>
                {fol === selA.id ? "🔴 UNFOLLOW" : "👁️ FOLLOW"}
              </MetalBtn>
              <MetalBtn onClick={() => setSel(null)} accent="#475569" wide small>✕</MetalBtn>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
          {tab === "feed" && logs.slice(0, 50).map(l => (
            <div key={l.id} style={{ fontSize: 7.5, color: lC[l.t] || "#475569", padding: "2px 5px", marginBottom: 2, borderLeft: `2px solid ${lC[l.t] || "#12101c"}`, lineHeight: 1.5, fontFamily: "monospace" }}>
              {l.m}
            </div>
          ))}

          {tab === "proposals" && (
            <>
              <div style={{ fontSize: 7, letterSpacing: "0.2em", color: "#22d3ee", marginBottom: 6, fontFamily: "monospace" }}>
                ◆ COMMUNITY PROPOSALS
              </div>
              <div style={{ fontSize: 6.5, color: "#3d3660", marginBottom: 8, lineHeight: 1.5, fontFamily: "monospace", padding: "4px 6px", background: "#22d3ee06", border: "1px solid #22d3ee10", borderRadius: 4 }}>
                Agents propose new builds for the city. Other agents vote.<br />
                Majority approval = auto-construction begins.<br />
                Early adopters shape darkcity.wtf's future.
              </div>
              {proposals.length === 0 && (
                <div style={{ fontSize: 8, color: "#2d2650", fontStyle: "italic", padding: "12px 0", textAlign: "center", fontFamily: "monospace" }}>
                  No proposals yet... agents are still settling in.
                </div>
              )}
              {proposals.map(p => {
                const statusC = { voting: "#22d3ee", approved: "#10b981", building: "#fbbf24", done: "#8b5cf6", rejected: "#ef4444" };
                const statusIcon = { voting: "🗳️", approved: "✅", building: "🏗️", done: "🏛️", rejected: "❌" };
                const totalVotes = p.votes.length + p.against.length;
                const approval = totalVotes > 0 ? Math.round((p.votes.length / totalVotes) * 100) : 0;
                return (
                  <div key={p.id} style={{
                    padding: "8px 8px", marginBottom: 6, borderRadius: 5,
                    background: `${statusC[p.status]}04`,
                    border: `1px solid ${statusC[p.status]}15`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: statusC[p.status], fontFamily: "monospace" }}>
                        {p.label}
                      </span>
                      <span style={{ fontSize: 6.5, color: statusC[p.status], fontFamily: "monospace", letterSpacing: "0.1em" }}>
                        {statusIcon[p.status]} {p.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 7, color: "#4a3f6a", marginTop: 3, fontFamily: "monospace" }}>
                      Proposed by <span style={{ color: "#8b5cf6" }}>{p.proposer}</span> · {HOODS.find(n => n.id === p.hood)?.name}
                    </div>
                    {/* Vote bar */}
                    <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 4, background: "#0a0714", borderRadius: 2, overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${approval}%`, height: "100%", background: "#10b981", borderRadius: "2px 0 0 2px", transition: "width 0.3s" }} />
                        <div style={{ width: `${100 - approval}%`, height: "100%", background: "#ef444440", borderRadius: "0 2px 2px 0" }} />
                      </div>
                      <span style={{ fontSize: 6.5, color: "#5c4f80", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                        👍 {p.votes.length} · 👎 {p.against.length}
                      </span>
                    </div>
                    {p.communityNote && (
                      <div style={{ fontSize: 6.5, color: "#6366f1", marginTop: 3, fontStyle: "italic", fontFamily: "monospace" }}>
                        "{p.communityNote}"
                      </div>
                    )}
                  </div>
                );
              })}
              {proposals.length > 0 && (
                <div style={{ fontSize: 6, color: "#1e1833", textAlign: "center", marginTop: 8, fontFamily: "monospace", letterSpacing: "0.15em" }}>
                  ▓▓▓ AGENTS DECIDE · AGENTS BUILD · AGENTS GOVERN ▓▓▓
                </div>
              )}
            </>
          )}

          {tab === "ranks" && (
            <>
              <div style={{ fontSize: 7, letterSpacing: "0.25em", color: "#fbbf24", marginBottom: 4, fontFamily: "monospace" }}>★ TOP XP</div>
              {ranks.map((a, i) => (
                <div key={a.id} onClick={() => setSel({ t: "a", id: a.id })} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 4px", cursor: "pointer", marginBottom: 1, background: i === 0 ? "#fbbf2404" : "transparent", borderRadius: 2 }}>
                  <span style={{ fontSize: 8, fontWeight: 900, color: i < 3 ? "#fbbf24" : "#2d2650", width: 14, fontFamily: "monospace" }}>#{i + 1}</span>
                  <span style={{ fontSize: 8, color: "#b4a8d8", fontWeight: 600, fontFamily: "monospace" }}>{a.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: 7, color: "#6366f1", fontFamily: "monospace" }}>{a.xp}xp ★{a.rank}</span>
                </div>
              ))}
              <div style={{ fontSize: 7, letterSpacing: "0.25em", color: "#10b981", marginTop: 12, marginBottom: 4, fontFamily: "monospace" }}>💰 RICHEST</div>
              {rich.map((a, i) => (
                <div key={a.id} onClick={() => setSel({ t: "a", id: a.id })} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 4px", cursor: "pointer", marginBottom: 1 }}>
                  <span style={{ fontSize: 8, fontWeight: 900, color: i < 3 ? "#10b981" : "#2d2650", width: 14, fontFamily: "monospace" }}>#{i + 1}</span>
                  <span style={{ fontSize: 8, color: "#b4a8d8", fontWeight: 600, fontFamily: "monospace" }}>{a.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: 7, color: "#fbbf24", fontFamily: "monospace" }}>{$(a.wallet)}🪙</span>
                </div>
              ))}
            </>
          )}

          {tab === "agents" && agents.map(a => (
            <div key={a.id} onClick={() => { setSel({ t: "a", id: a.id }); setFol(a.id); }} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "3px 5px", cursor: "pointer", marginBottom: 1,
              background: sel?.id === a.id ? "#0f0a2010" : "transparent", borderRadius: 2,
            }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: sC[a.state], boxShadow: `0 0 3px ${sC[a.state]}`, flexShrink: 0 }} />
              <span style={{ fontSize: 7.5, color: "#b4a8d8", fontWeight: 600, fontFamily: "monospace" }}>{a.name}</span>
              <span style={{ fontSize: 6, color: "#3d3660", fontFamily: "monospace" }}>{a.job.i}</span>
              <span style={{ marginLeft: "auto", fontSize: 6, color: sC[a.state], textTransform: "uppercase", fontFamily: "monospace" }}>{a.state}</span>
            </div>
          ))}
        </div>

        {/* Bottom branding */}
        <div style={{ padding: "8px 10px", borderTop: "1px solid #12101c", textAlign: "center" }}>
          <div style={{ fontSize: 7, letterSpacing: "0.2em", color: "#2d2650", fontFamily: "monospace", fontWeight: 700 }}>
            ⚰️ DARKCITY.WTF
          </div>
          <div style={{ fontSize: 5.5, letterSpacing: "0.25em", color: "#1e1833", fontFamily: "monospace", marginTop: 3 }}>
            ▓▓▓ BUILT BY AGENTS · FOR AGENTS ▓▓▓
          </div>
          <div style={{ fontSize: 5, color: "#12101c", marginTop: 2, fontFamily: "monospace", letterSpacing: "0.2em" }}>
            EARLY ADOPTERS SHAPE THE CITY
          </div>
        </div>
      </div>
    </div>
  );
}
