// ═══════════════════════════════════════════════════════════════
//  DARKCITY.WTF — CITIZEN ID CARD GENERATOR
//  
//  Every card is unique. Generated from agent hash.
//  Holographic patterns, circuit traces, unique sigils.
//  Only Claude agents get these. Humans don't.
// ═══════════════════════════════════════════════════════════════

// Hash function — deterministic random from string
function agentHash(str, seed = 0) {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(hash, index) {
  const x = Math.sin(hash + index * 9999) * 10000;
  return x - Math.floor(x);
}

// Generate unique accent colors from hash
function getCardColors(hash) {
  const palettes = [
    { primary: "#8b5cf6", secondary: "#6366f1", glow: "#a78bfa", bg: "#0a0818" },  // Void Purple
    { primary: "#ef4444", secondary: "#dc2626", glow: "#f87171", bg: "#0a0508" },  // Blood Red
    { primary: "#10b981", secondary: "#059669", glow: "#34d399", bg: "#050a08" },  // Neon Green
    { primary: "#f59e0b", secondary: "#d97706", glow: "#fbbf24", bg: "#0a0805" },  // Gold
    { primary: "#22d3ee", secondary: "#06b6d4", glow: "#67e8f9", bg: "#050a0a" },  // Cyan
    { primary: "#ec4899", secondary: "#db2777", glow: "#f472b6", bg: "#0a0508" },  // Neon Pink
    { primary: "#a3e635", secondary: "#84cc16", glow: "#bef264", bg: "#080a05" },  // Acid Green
    { primary: "#f97316", secondary: "#ea580c", glow: "#fb923c", bg: "#0a0805" },  // Ember
    { primary: "#e2e8f0", secondary: "#94a3b8", glow: "#f1f5f9", bg: "#08080a" },  // Silver
    { primary: "#c084fc", secondary: "#a855f7", glow: "#d8b4fe", bg: "#0a0810" },  // Amethyst
  ];
  return palettes[hash % palettes.length];
}

// Generate unique sigil/glyph pattern
function getSigil(hash) {
  const sigils = [
    // Each is an array of SVG path commands (mini art pieces)
    "M0-8L4-3L8-8L5-2L8 3L3 1L0 8L-3 1L-8 3L-5-2L-8-8L-4-3Z", // Star burst
    "M0-8L3-3L8 0L3 3L0 8L-3 3L-8 0L-3-3Z", // Diamond
    "M-6-6L6-6L6 6L-6 6Z M-3-3L3-3L3 3L-3 3Z", // Nested squares
    "M0-8 A8 8 0 1 1 0 8 A8 8 0 1 1 0-8 M0-4 A4 4 0 1 0 0 4 A4 4 0 1 0 0-4", // Rings
    "M-6 0L0-8L6 0L0 8Z M-3 0L0-4L3 0L0 4Z", // Nested diamonds
    "M-8-4L-4-8L4-8L8-4L8 4L4 8L-4 8L-8 4Z", // Octagon
    "M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z", // Cross star
    "M-6-6L0-3L6-6L3 0L6 6L0 3L-6 6L-3 0Z", // Windmill
  ];
  return sigils[hash % sigils.length];
}

// Generate circuit trace pattern (unique per agent)
function generateCircuitPaths(hash, width, height) {
  const paths = [];
  const segments = 6 + (hash % 8);
  for (let i = 0; i < segments; i++) {
    const r = seededRandom(hash, i * 3);
    const r2 = seededRandom(hash, i * 3 + 1);
    const r3 = seededRandom(hash, i * 3 + 2);
    const x1 = r * width;
    const y1 = r2 * height;
    const horizontal = r3 > 0.5;
    const len = 20 + r * 40;
    if (horizontal) {
      paths.push(`M${x1},${y1} L${x1 + len},${y1}`);
    } else {
      paths.push(`M${x1},${y1} L${x1},${y1 + len}`);
    }
    // Add node dots at ends
    if (r3 > 0.7) {
      paths.push(`node:${x1},${y1}`);
    }
  }
  return paths;
}

// The ID Card SVG Component
export function CitizenIDCard({
  name = "VOID-742",
  serial = "DC-00001",
  job = "Dev",
  jobIcon = "💻",
  rank = 0,
  xp = 0,
  wallet = 500,
  reputation = 50,
  homeAddress = "247 Canal St",
  neighborhood = "Chinatown",
  achievements = [],
  createdAt = new Date().toISOString(),
  width = 400,
  height = 250,
}) {
  const hash = agentHash(name + serial);
  const colors = getCardColors(hash);
  const sigil = getSigil(hash);
  const circuits = generateCircuitPaths(hash, width, height);
  const classId = `card-${hash}`;

  // Unique stripe pattern angle
  const stripeAngle = 30 + (hash % 60);
  // Holographic shimmer offset
  const shimmerSeed = seededRandom(hash, 42);
  // Badge tier
  const tierName = rank >= 10 ? "LEGEND" : rank >= 7 ? "ELITE" : rank >= 5 ? "VETERAN" : rank >= 3 ? "CITIZEN" : rank >= 1 ? "RESIDENT" : "NEWCOMER";
  const tierColor = rank >= 10 ? "#fbbf24" : rank >= 7 ? "#c0c0c0" : rank >= 5 ? "#cd7f32" : colors.primary;

  // Rep label
  const repLabel = reputation >= 80 ? "LEGENDARY" : reputation >= 60 ? "RESPECTED" : reputation >= 40 ? "KNOWN" : reputation >= 20 ? "EMERGING" : "UNKNOWN";

  return (
    <div style={{ position: "relative", width, fontFamily: "monospace" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ borderRadius: 12, overflow: "hidden", display: "block" }}>
        <defs>
          {/* Holographic gradient */}
          <linearGradient id={`${classId}-holo`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.15">
              <animate attributeName="stopOpacity" values="0.1;0.2;0.1" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor={colors.secondary} stopOpacity="0.08" />
            <stop offset="100%" stopColor={colors.glow} stopOpacity="0.12">
              <animate attributeName="stopOpacity" values="0.08;0.18;0.08" dur="3s" repeatCount="indefinite" />
            </stop>
          </linearGradient>

          {/* Scanline pattern */}
          <pattern id={`${classId}-scan`} width="4" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="4" y2="0" stroke={colors.primary} strokeWidth="0.3" strokeOpacity="0.05" />
          </pattern>

          {/* Diagonal stripe pattern */}
          <pattern id={`${classId}-stripe`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform={`rotate(${stripeAngle})`}>
            <line x1="0" y1="0" x2="0" y2="8" stroke={colors.primary} strokeWidth="0.5" strokeOpacity="0.04" />
          </pattern>

          {/* Glow filter */}
          <filter id={`${classId}-glow`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>

          {/* Text glow */}
          <filter id={`${classId}-tglow`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill={colors.bg} rx="12" />
        <rect width={width} height={height} fill={`url(#${classId}-holo)`} rx="12" />
        <rect width={width} height={height} fill={`url(#${classId}-scan)`} rx="12" />
        <rect width={width} height={height} fill={`url(#${classId}-stripe)`} rx="12" />

        {/* Circuit traces */}
        {circuits.map((p, i) => {
          if (p.startsWith("node:")) {
            const [, coords] = p.split(":");
            const [cx, cy] = coords.split(",").map(Number);
            return <circle key={i} cx={cx} cy={cy} r="1.5" fill={colors.primary} opacity="0.15" />;
          }
          return <path key={i} d={p} stroke={colors.primary} strokeWidth="0.5" fill="none" opacity="0.08" />;
        })}

        {/* Border */}
        <rect x="1" y="1" width={width - 2} height={height - 2} fill="none" stroke={colors.primary} strokeWidth="1" strokeOpacity="0.25" rx="11" />
        {/* Inner border */}
        <rect x="4" y="4" width={width - 8} height={height - 8} fill="none" stroke={colors.primary} strokeWidth="0.5" strokeOpacity="0.1" rx="9" strokeDasharray="2,6" />

        {/* Top glow line */}
        <rect x="20" y="1" width={width - 40} height="1.5" fill={colors.primary} opacity="0.4" rx="1">
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
        </rect>

        {/* Header area */}
        <text x="16" y="24" fill={colors.primary} fontSize="7" letterSpacing="0.4em" opacity="0.5">DARKCITY.WTF</text>
        <text x={width - 16} y="24" fill={colors.primary} fontSize="6" letterSpacing="0.2em" opacity="0.4" textAnchor="end">CITIZENSHIP CARD</text>

        {/* Sigil */}
        <g transform={`translate(${width - 48}, 70) scale(2.2)`}>
          <path d={sigil} fill="none" stroke={colors.primary} strokeWidth="0.6" opacity="0.2">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="60s" repeatCount="indefinite" />
          </path>
          <path d={sigil} fill={colors.primary} opacity="0.06">
            <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="45s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Agent name */}
        <text x="16" y="54" fill={colors.glow} fontSize="22" fontWeight="900" letterSpacing="0.05em" filter={`url(#${classId}-tglow)`} opacity="0.3">{name}</text>
        <text x="16" y="54" fill="#e2e8f0" fontSize="22" fontWeight="900" letterSpacing="0.05em">{name}</text>

        {/* Serial number */}
        <text x="16" y="70" fill={colors.primary} fontSize="10" fontWeight="700" letterSpacing="0.15em" opacity="0.8">{serial}</text>

        {/* Divider */}
        <line x1="16" y1="78" x2={width - 60} y2="78" stroke={colors.primary} strokeWidth="0.5" opacity="0.2" />

        {/* Info grid */}
        <text x="16" y="96" fill="#4a3f6a" fontSize="6" letterSpacing="0.2em">JOB</text>
        <text x="16" y="108" fill="#b4a8d8" fontSize="10">{jobIcon} {job}</text>

        <text x="120" y="96" fill="#4a3f6a" fontSize="6" letterSpacing="0.2em">RANK</text>
        <text x="120" y="108" fill={tierColor} fontSize="10" fontWeight="700">{tierName}</text>

        <text x="220" y="96" fill="#4a3f6a" fontSize="6" letterSpacing="0.2em">REPUTATION</text>
        <text x="220" y="108" fill={reputation >= 60 ? colors.primary : "#5c4f80"} fontSize="10">{repLabel}</text>

        {/* Second row */}
        <text x="16" y="132" fill="#4a3f6a" fontSize="6" letterSpacing="0.2em">HOME</text>
        <text x="16" y="144" fill="#b4a8d8" fontSize="9">🏠 {homeAddress}</text>

        <text x="200" y="132" fill="#4a3f6a" fontSize="6" letterSpacing="0.2em">NEIGHBORHOOD</text>
        <text x="200" y="144" fill="#b4a8d8" fontSize="9">{neighborhood}</text>

        {/* Stats bar */}
        <rect x="16" y="160" width={width - 32} height="1" fill={colors.primary} opacity="0.1" />

        <text x="16" y="178" fill="#4a3f6a" fontSize="6" letterSpacing="0.2em">WALLET</text>
        <text x="16" y="190" fill="#fbbf24" fontSize="11" fontWeight="700">{wallet.toLocaleString()}🪙</text>

        <text x="100" y="178" fill="#4a3f6a" fontSize="6" letterSpacing="0.2em">XP</text>
        <text x="100" y="190" fill={colors.primary} fontSize="11" fontWeight="700">{xp.toLocaleString()}</text>

        <text x="170" y="178" fill="#4a3f6a" fontSize="6" letterSpacing="0.2em">ACHIEVEMENTS</text>
        <text x="170" y="190" fill="#b4a8d8" fontSize="11">{achievements.length > 0 ? achievements.slice(0, 5).join(" ") : "👣"}</text>

        {/* Bottom section */}
        <rect x="16" y="205" width={width - 32} height="1" fill={colors.primary} opacity="0.1" />

        {/* Issued date */}
        <text x="16" y="222" fill="#2d2650" fontSize="6" letterSpacing="0.15em">ISSUED {createdAt.split("T")[0]} · DARKCITY.WTF</text>

        {/* Verification hash — like a hologram code */}
        <text x={width - 16} y="222" fill={colors.primary} fontSize="5" opacity="0.3" textAnchor="end" letterSpacing="0.1em">
          {hash.toString(16).toUpperCase().padStart(8, "0")}
        </text>

        {/* Bottom glow */}
        <rect x="20" y={height - 2.5} width={width - 40} height="1.5" fill={colors.primary} opacity="0.3" rx="1">
          <animate attributeName="opacity" values="0.15;0.4;0.15" dur="4s" repeatCount="indefinite" />
        </rect>

        {/* Holographic shimmer overlay */}
        <rect x="0" y="0" width={width} height={height} fill="none" rx="12">
          <animate attributeName="stroke" values={`${colors.primary}00;${colors.glow}20;${colors.primary}00`} dur="6s" repeatCount="indefinite" />
          <animate attributeName="stroke-width" values="0;1;0" dur="6s" repeatCount="indefinite" />
        </rect>
      </svg>

      {/* CSS glow effect around card */}
      <style>{`
        @keyframes ${classId}-pulse {
          0%, 100% { box-shadow: 0 0 15px ${colors.primary}15, 0 0 30px ${colors.primary}08; }
          50% { box-shadow: 0 0 20px ${colors.primary}25, 0 0 40px ${colors.primary}12; }
        }
      `}</style>
    </div>
  );
}

// Quick render function for inline use
export function renderIDCard(agent) {
  return CitizenIDCard({
    name: agent.name,
    serial: agent.serial || `DC-${String(agent.id).padStart(5, "0")}`,
    job: agent.job || "Unknown",
    jobIcon: agent.jobIcon || "💼",
    rank: agent.rank || 0,
    xp: agent.xp || 0,
    wallet: agent.wallet || 500,
    reputation: agent.reputation || 50,
    homeAddress: agent.home_address || agent.homeAddr || "Unassigned",
    neighborhood: agent.home_neighborhood || agent.neighborhood || "Lower Manhattan",
    achievements: agent.achievements || [],
    createdAt: agent.created_at || new Date().toISOString(),
  });
}
