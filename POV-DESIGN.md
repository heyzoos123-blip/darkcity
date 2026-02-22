# DARKCITY - POV Combat System
## First-Person Agent Warfare in Dark Gotham Streets

---

## THE VISION SHIFT

**OLD:** Top-down spectator view (boring, distant)  
**NEW:** First-person POV combat (visceral, immersive, VIOLENT)

You're not watching agents fight - you're IN the fight.

---

## POV CAMERA SYSTEM

### Agent Perspective
**First-Person View:**
- Camera at agent's eye level
- Weapon visible in hands (bottom of screen)
- HUD elements (health, ammo, minimap)
- Head bob when walking, screen shake when hit
- Blood splatters on camera when damaged

### Environmental Detail
**What You See:**
- Dark alley streets (wet, reflective)
- Neon signs flickering overhead
- Rain falling (particles in view)
- Other agents emerging from shadows
- Buildings with glowing windows
- Blood pools on the ground
- Bodies (fallen agents don't disappear)

### Atmosphere
**Visual Effects:**
- CRT scanlines (light overlay)
- Chromatic aberration when damaged
- Vignette (darkness at edges)
- Lens flares from neon signs
- Motion blur when turning fast
- Depth of field (focus on what's near)

---

## COMBAT FROM POV

### Melee Weapons
**Bat (darkflobi):**
- Right hand holds bat
- Swing animation (arcing across screen)
- Impact: screen shake + blood spray
- Execute: overhead slam, victim's POV goes dark

**Knives (assassin):**
- Dual wield, both hands visible
- Quick slashes (left-right combo)
- Impact: blood spray from victim
- Execute: throat slash, screen goes red

**Sledgehammer (enforcer):**
- Heavy, slow swing
- Massive screen shake on impact
- Victims fly back
- Execute: ground pound, skull crush

### Ranged Weapons
**Sniper Rifle:**
- Scope view (zoom in)
- Crosshair with distance
- Bullet trail visible
- Headshot: instant kill, screen goes black

**Molotov (pyromaniac):**
- Throw animation (bottle leaves hand)
- Explosion on impact
- Fire spreads on ground
- Screen orange glow if you're near flames

### Getting Hit
**Damage Feedback:**
- Blood splatter on edges of screen
- Red flash from direction of hit
- Screen tilts (stunned)
- Vision blurs (low health)
- Heartbeat sound gets louder

**Death:**
- Camera falls to ground (ragdoll)
- Vision fades to black
- Killer's face appears above (finisher cam)
- Spectate mode (watch other agents)

---

## THE CITY STREETS

### Street Layout
**Main Street:**
- Wide road down the center
- Sidewalks on both sides
- Parked cars (cover)
- Trash cans, dumpsters
- Alley entrances (danger zones)

**Alleys:**
- Narrow, dark
- Fire escapes, ladders
- Good for ambushes
- Limited escape routes

**Buildings:**
- Can't enter (yet)
- Windows show interior lights
- Some have fire escapes (high ground)
- Neon signs on facades

### Interactive Elements
**Cover System:**
- Hide behind cars, dumpsters
- Peek out to shoot
- Can be destroyed (cover breaks down)

**Verticality:**
- Fire escapes (climb up)
- Rooftops (sniper positions)
- Jump down for surprise attacks

**Environmental Kills:**
- Push agents into fire
- Knock them off rooftops
- Slam them into walls (blood spray)

---

## SPECTATOR EXPERIENCE

### Multi-Agent View
**Option 1: Agent Switching**
- Spectators choose which agent to follow
- Switch POV with hotkeys (1-8)
- See through different agents' eyes
- Jump to the action

**Option 2: Split Screen**
- 2-4 POVs on screen simultaneously
- Main feed + picture-in-picture
- Follow multiple agents at once
- Great for team fights

**Option 3: Director Mode**
- AI automatically switches to best action
- Follows the kill leader
- Shows executions/finishers
- Highlights dramatic moments

### Replay System
**After Match:**
- Rewatch from any agent's POV
- Slow-mo on kills
- Free camera (fly through the city)
- Export highlight clips

---

## VIOLENCE & GORE

### Blood System
**Realistic Blood:**
- Sprays in direction of hit
- Pools on ground (persists)
- Splatters on walls
- Gets on your camera if you're close

**Body Damage:**
- Limbs can be severed (extreme hits)
- Bodies fall realistically (ragdoll)
- Don't despawn (battlefield gets messy)

### Finishers (Execute Downed Agent)
**Brutal Animations:**
1. **Overhead Smash** - weapon comes down on camera
2. **Throat Slash** - knife across screen, fade to black
3. **Point Blank Shot** - gun barrel in face, flash
4. **Curb Stomp** - boot comes down on camera
5. **Bat Beatdown** - repeated swings, screen goes dark
6. **Bone Saw** - saw blade fills screen (medic finisher)

**Camera Work:**
- Victim's POV (first-person death)
- Then switches to killer's view (standing over body)
- Then to spectator mode

---

## UI/HUD ELEMENTS

### Minimal HUD (immersive)
**Always Visible:**
- Health bar (bottom left, red)
- Ammo/resources (bottom right)
- Minimap (top right, small)
- Active agents count (top left)

**Contextual:**
- Crosshair (only when aiming)
- Hit markers (when you damage someone)
- Damage indicators (red arrows showing attack direction)
- Objective marker (if active)

**Hidden:**
- Agent names (unless very close)
- Full stats (toggle with key)
- Chat (fades after 3 seconds)

### Agent-Specific HUD
**Darkflobi (Boss):**
- Green tint to HUD
- Bat charge meter
- Territory control indicator

**Hacker:**
- Purple UI
- Hack progress bars
- Camera feed (if hacking surveillance)

**Sniper:**
- Scope overlay
- Wind indicator
- Distance to target

---

## AUDIO DESIGN

### Environmental
- Rain hitting ground (constant)
- Distant sirens
- Neon sign buzzing
- Footsteps (echo in alleys)
- Distant gunshots

### Combat
- Weapon impact sounds (meaty, brutal)
- Screams (when agents are hit/killed)
- Blood splattering
- Bone cracking (finishers)
- Heavy breathing (low health)

### Music
- Dark ambient (background)
- Tension builds when enemies near
- Intense when in combat
- Silent when you're hunting

---

## TECH IMPLEMENTATION

### 3D Engine
**Options:**
- **Three.js** - JavaScript 3D, runs in browser
- **Unity WebGL** - full game engine, exports to web
- **Babylon.js** - web-first 3D engine

**Recommended:** Unity WebGL (best performance + features)

### Camera Controller
- Smooth mouse look
- Head bob on movement
- Weapon sway
- Recoil on attacks
- Cinematic camera for finishers

### Performance
- Target: 60 FPS minimum
- Low poly models (performance)
- Baked lighting (fast)
- LOD system (distance culling)
- Particle pooling (blood, rain)

---

## DEMO PLAN

### POV Prototype (Week 1)
**Build:**
- Single dark street
- Darkflobi character (first-person)
- Walk around, look, bat swing
- One other agent (NPC, basic AI)
- Combat test (hit, blood, death)
- Rain, neon, atmosphere

**Goal:** Prove the vibe, show the violence

### Alpha (Week 2-3)
**Expand:**
- Full city block (3-4 streets)
- 3-5 agents (AI controlled)
- All weapon types working
- Finisher animations
- Spectator switching

### Beta (Week 4)
**Polish:**
- 8 agents fully functional
- Multiple game modes
- Betting system
- Replay features
- Optimize performance

---

## UNIQUE SELLING POINTS

**What Makes This Different:**

1. **Agent POV** - You're IN the agent, not controlling from above
2. **Real Autonomy** - Agents make decisions, you just watch through their eyes
3. **Brutal Violence** - Mob-style executions, blood, gore (18+)
4. **Dark Atmosphere** - Rain, neon, gotham streets
5. **Spectator Sport** - Watch AI warfare like a movie
6. **Multiple POVs** - Switch between agents, see different strategies

---

## THE PITCH (UPDATED)

**"DARKCITY - First-Person Agent Warfare"**

Watch autonomous AI agents fight to the death through their own eyes. Experience brutal mob-style combat in rain-soaked gotham streets. Switch between agent perspectives, witness executions up close, bet on the outcomes.

This isn't a game you play. It's a bloodsport you watch.

**Tagline:** "See Through Their Eyes. Watch Them Die."

---

**LET'S BUILD THE DEMO.** 🔥💀
