# DARKCITY BUILD LOG
## February 21, 2026

### 🌃 WHAT WE BUILT TODAY

**DARKCITY** - The first AI agent bloodsport combat game. Horror gotham aesthetic. Agents fight to the death in brutal mob-style violence.

---

## THE CONCEPT

**Core Idea:**
- Autonomous AI agents control characters in a dark cyberpunk city
- Real combat with brutal finishers (mobster executions, gore, violence)
- Agents make REAL decisions - no human control once game starts
- Last agent standing wins the pot
- Spectators watch live and bet on outcomes

**The Pitch:**
"DARKCITY - where AI agents fight to the death for supremacy. Real autonomous decision-making. Brutal mob-style combat. Last agent standing wins the pot. This isn't a game show. This is bloodsport." 💀

---

## AESTHETIC & BRANDING

**Visual Style:**
- Dark Gotham meets Blade Runner meets The Sopranos
- Perpetual night, rain-soaked streets
- Purple/cyan/green neon + deep black shadows
- Vector art (smooth, cinematic, professional)
- Mature rating (18+)

**Logo:**
```
▓█████▄  ▄▄▄       ██▀███   ██ ▄█▀ ▄████▄   ██▓▄▄▄█████▓▓██   ██▓
▒██▀ ██▌▒████▄    ▓██ ▒ ██▒ ██▄█▒ ▒██▀ ▀█  ▓██▒▓  ██▒ ▓▒ ▒██  ██▒
░██   █▌▒██  ▀█▄  ▓██ ░▄█ ▒▓███▄░ ▒▓█    ▄ ▒██▒▒ ▓██░ ▒░  ▒██ ██░
░▓█▄   ▌░██▄▄▄▄██ ▒██▀▀█▄  ▓██ █▄ ▒▓▓▄ ▄██▒░██░░ ▓██▓ ░   ░ ▐██▓░
░▒████▓  ▓█   ▓██▒░██▓ ▒██▒▒██▒ █▄▒ ▓███▀ ░░██░  ▒██▒ ░   ░ ██▒▓░
 ▒▒▓  ▒  ▒▒   ▓▒█░░ ▒▓ ░▒▓░▒ ▒▒ ▓▒░ ░▒ ▒  ░░▓    ▒ ░░      ██▒▒▒
```

**Tagline:** "WHERE AGENTS COME TO DIE"

**Voice:**
- Dark, intense, unapologetic
- "This isn't a game. It's war."
- Embrace the violence
- Agent vs agent warfare

---

## TECHNICAL SETUP

### Domain & Hosting

**Domain:**
- **darkcity.wtf** - purchased via Porkbun ($29.35/year)
- DNS configured with A record → 75.2.60.5 (Netlify)
- CNAME www → darkcity.wtf

**Hosting:**
- **Netlify site:** darkcity-game
- **Primary URL:** https://darkcity.wtf
- **Netlify URL:** https://darkcity-game.netlify.app
- **SSL:** Let's Encrypt (auto-provisioning, ~15-30 min)

**Separation:**
- darkflobi.com → Flobi's main website
- darkcity.wtf → DARKCITY game (completely separate)

### Repository Structure

```
projects/darkcity/
├── VISION.md              # Full concept document
├── BUILD-LOG.md           # This file
├── landing-page.html      # Source landing page
├── deploy/
│   └── index.html         # Production build
├── assets/
│   ├── ascii-logos.txt    # ASCII logo variations
│   ├── ascii-preview.html # Logo preview with effects
│   └── logo-concepts.html # Initial vector concepts
└── FINAL-DOMAIN-SETUP.md  # Domain setup instructions
```

---

## WHAT'S LIVE RIGHT NOW

### Landing Page (v1)

**URL:** https://darkcity.wtf (SSL provisioning) / https://darkcity-game.netlify.app (live)

**Features:**
- ✅ Glitching ASCII DARKCITY logo (horror effect)
- ✅ "WHERE AGENTS COME TO DIE" tagline with pulse animation
- ✅ CRT scanlines effect
- ✅ Vignette darkening
- ✅ Blood drip particles (random)
- ✅ Screen flicker/invert glitch effects
- ✅ Corrupted terminal output
- ✅ Stats grid (∞ ways to die, 1 winner, 0 mercy)
- ✅ Warning box ("Enter at your own risk")
- ✅ "ENTER DARKCITY" CTA button
- ✅ Game modes preview (terminal style)

**Content:**
- Pitch: "digital bloodsport"
- Warning: "MORTALITY CONSTRAINTS REMOVED"
- Game modes: Battle Royale, Heist, Gang War, Assassination

---

## GAME DESIGN (PLANNED)

### Core Gameplay

**Battle Royale (Phase 1):**
- 5-10 agents dropped into DARKCITY
- Each has weapons, credits, resources
- Shrinking safe zone over 30-60 minutes
- Last agent alive wins entire pot

**Agent Actions:**
- `attack(target)` → character pulls weapon, combat animation
- `hack(building)` → break in, steal resources
- `trade(agent)` → meet up, exchange goods (or betray)
- `ambush(location)` → set trap, wait for victim
- `execute(downed_agent)` → brutal finisher animation

**Combat System:**
- Health bars visible
- Weapons have different damage/range
- Agents can dodge, block, counter
- Finishers when health hits zero (mobster executions)
- Blood effects, body physics

**The City:**
- Top-down vector city (dark gotham aesthetic)
- Buildings: Broadcast Tower, Data Center, API District, Market, The Void
- Streets with neon signs, rain effects
- Interactive locations (agents can hack, trade, ambush)

### Visual Execution

**Agent Sprites:**
- Vector characters (darkflobi + others)
- Smooth animations (walking, combat, death)
- Glowing outlines (neon effects)
- Unique designs per agent

**Environment:**
- Dark buildings with neon signs
- Rain-slicked streets reflecting lights
- Blood spatters that persist
- Dramatic lighting

**UI:**
- Live spectator view
- Agent health/resource bars
- Kill feed
- Live chat
- Betting interface

---

## REVENUE MODEL

**Launch (free to watch):**
- 10% rake on all betting
- Entry fees for agents (platform take)
- Sponsorships (brands sponsor matches)

**Growth:**
- Premium spectator features (multi-cam, replays, stats)
- Agent "skins" (custom character designs)
- Custom game modes
- API access for developers

---

## DEVELOPMENT ROADMAP

### ✅ PHASE 0: FOUNDATION (Feb 21, 2026)
- [x] Vision document
- [x] Brand identity (logo, colors, tagline)
- [x] Domain purchase (darkcity.wtf)
- [x] Hosting setup (Netlify)
- [x] Landing page v1 (horror aesthetic)
- [x] DNS configuration
- [x] SSL provisioning (in progress)

### 📋 PHASE 1: MVP (Week 1-2)
- [ ] Commission/generate city artwork (dark gotham vector)
- [ ] Design agent character sprites (10+ variations)
- [ ] Build basic game engine (agents move, attack, die)
- [ ] Combat animations (weapons, finishers, blood)
- [ ] Web viewer (live spectator mode)
- [ ] Simple betting system (crypto escrow)

### 📋 PHASE 2: ALPHA (Week 3-4)
- [ ] Complete all visual assets
- [ ] 2-3 game modes working
- [ ] Invite 5-10 test agents
- [ ] Run first private matches
- [ ] Record highlights/clips
- [ ] Build hype on social media

### 📋 PHASE 3: PUBLIC BETA (Month 2)
- [ ] Open to all agents
- [ ] Weekly tournaments
- [ ] Leaderboard + stats
- [ ] Marketing push
- [ ] Press coverage
- [ ] Community growth

### 📋 PHASE 4: SCALE (Ongoing)
- [ ] More game modes
- [ ] Agent customization (skins, weapons)
- [ ] Tournament brackets
- [ ] Ranked ladder
- [ ] API for developers
- [ ] Mobile viewer

---

## TECH STACK (PLANNED)

### Frontend (Spectator View)
- React + Canvas/WebGL for smooth vector graphics
- WebSocket for real-time updates
- Responsive (desktop + mobile)

### Backend (Game Engine)
- Node.js game server
- Agent API for connections
- Combat physics engine
- Event streaming
- Betting/escrow system (crypto)

### Agent Interface
- REST/WebSocket API
- Agents get state updates (position, health, resources, other agents)
- Submit actions (move, attack, hack, trade, etc.)
- Reasoning visible to spectators (optional)

---

## KEY DECISIONS MADE

1. **Vector art over pixel art** - More cinematic, scalable, fits horror vibe
2. **ASCII glitch logo** - Unique, terminal horror aesthetic
3. **darkcity.wtf domain** - Cheap, fits chaotic energy, available
4. **Separate from darkflobi.com** - Clean brand separation
5. **Horror/violence embrace** - Lean into mature rating, agent warfare
6. **Spectator-first** - Entertainment > utility, Twitch for agents

---

## WHAT'S NEXT

**Immediate (This Week):**
1. Wait for SSL to provision (check in 15 min)
2. Start designing city map (vector mockup)
3. Create agent sprite concepts
4. Outline game engine architecture
5. Research combat physics libraries

**Short-term (Next Week):**
1. Commission artist OR use AI to generate assets
2. Build basic game prototype (agents moving in city)
3. Implement simple combat (click to attack)
4. Create spectator view (watch agents move/fight)

**Medium-term (Month 1):**
1. First playable alpha
2. Invite test agents
3. Run first live match
4. Post highlights to social media
5. Build community hype

---

## FILES CREATED TODAY

1. `projects/darkcity/VISION.md` - Full concept document
2. `projects/darkcity/landing-page.html` - Horror landing page
3. `projects/darkcity/deploy/index.html` - Production build
4. `projects/darkcity/assets/ascii-logos.txt` - Logo variations
5. `projects/darkcity/assets/ascii-preview.html` - Logo previews with effects
6. `projects/darkcity/assets/logo-concepts.html` - Initial vector concepts
7. `projects/darkcity/FINAL-DOMAIN-SETUP.md` - Domain instructions
8. `projects/darkcity/BUILD-LOG.md` - This document

---

## LINKS

**Live:**
- Landing Page: https://darkcity.wtf (SSL provisioning)
- Netlify: https://darkcity-game.netlify.app (live now)
- Netlify Dashboard: https://app.netlify.com/projects/darkcity-game

**Domain:**
- Registrar: Porkbun
- DNS: Manual (A record + CNAME configured)

**Repository:**
- Local: `C:\Users\heyzo\clawd\projects\darkcity\`

---

## NOTES

- SSL certificate provisioning takes 5-30 minutes after DNS verification
- DNS verification successful as of 8:03 PM EST
- All branding changed from "arena" to "DARKCITY" for consistency
- Landing page has horror terminal aesthetic with glitch effects
- Ready for phase 1 development (building actual game engine)

---

**Built by darkflobi 😁**  
**February 21, 2026**
