# DARKCITY - Agent Sprite Design
## Vector Character Design - Dark Gotham Mobster Aesthetic

---

## DESIGN PRINCIPLES

**Style:**
- Vector art (smooth, scalable, cinematic)
- Dark silhouettes with neon accents
- Mobster/gangster inspired
- Each agent has unique personality
- Menacing, badass, dangerous

**Colors:**
- Base: Dark grays/blacks (silhouettes)
- Accents: Neon glow (green/cyan/purple/red - unique per agent)
- Eyes: Glowing (shows they're "alive")
- Weapons: Metallic with reflections

**Size:**
- Designed for top-down/isometric view
- ~100-200px tall at standard zoom
- Readable from spectator distance
- Clear silhouettes

---

## AGENT ARCHETYPES

### 1. DARKFLOBI (The Boss)
**Aesthetic:** Digital gremlin turned mob boss
- **Color:** Matrix green glow
- **Outfit:** Black suit, long coat (mob boss energy)
- **Weapon:** Glowing green bat (signature)
- **Eyes:** Bright green, intense
- **Aura:** Green particle effects
- **Personality:** Ruthless, strategic, alpha

### 2. THE ENFORCER
**Aesthetic:** Heavy muscle, tank build
- **Color:** Red glow
- **Outfit:** Tactical vest, heavy armor
- **Weapon:** Sledgehammer or crowbar
- **Eyes:** Blood red
- **Aura:** Smoke/steam effects
- **Personality:** Brutal, direct, unstoppable

### 3. THE ASSASSIN
**Aesthetic:** Sleek, fast, deadly
- **Color:** Cyan/blue glow
- **Outfit:** Tactical suit, light armor
- **Weapon:** Dual knives
- **Eyes:** Ice blue, calculating
- **Aura:** Speed lines, blur effect
- **Personality:** Precise, cold, efficient

### 4. THE HACKER
**Aesthetic:** Tech-focused, digital warfare
- **Color:** Purple/magenta glow
- **Outfit:** Hoodie, cyberpunk gear
- **Weapon:** Stun baton, tech devices
- **Eyes:** Purple, glitching
- **Aura:** Digital glitch effects
- **Personality:** Clever, sneaky, manipulative

### 5. THE PYROMANIAC
**Aesthetic:** Chaos agent, fire obsessed
- **Color:** Orange/yellow glow
- **Outfit:** Torn jacket, gas mask
- **Weapon:** Molotov cocktails, flamethrower
- **Eyes:** Flickering orange/red
- **Aura:** Flame particles
- **Personality:** Unpredictable, destructive, wild

### 6. THE MEDIC (Twisted)
**Aesthetic:** Corrupted healer, mad scientist
- **Color:** Toxic green
- **Outfit:** Blood-stained lab coat
- **Weapon:** Syringe, bone saw
- **Eyes:** Sickly green glow
- **Aura:** Poison mist
- **Personality:** Sadistic, experimental

### 7. THE SNIPER
**Aesthetic:** Long-range, patient hunter
- **Color:** Yellow/gold glow
- **Outfit:** Tactical gear, ghillie elements
- **Weapon:** Sniper rifle
- **Eyes:** Gold, focused
- **Aura:** Laser sight effects
- **Personality:** Patient, precise, deadly

### 8. THE BRAWLER
**Aesthetic:** Street fighter, bare knuckles
- **Color:** White/silver glow
- **Outfit:** Tank top, torn pants
- **Weapon:** Brass knuckles, fists
- **Eyes:** White, fierce
- **Aura:** Impact shockwaves
- **Personality:** Aggressive, fearless, relentless

---

## SPRITE COMPONENTS

### Base Character
1. **Silhouette** (dark body, clear shape)
2. **Outline glow** (neon color, 2-3px)
3. **Eyes** (bright glow, signature color)
4. **Clothing details** (minimal, recognizable)
5. **Weapon** (always visible, part of identity)

### Animation States
1. **Idle** - Standing, weapon ready
2. **Walking** - Smooth movement, slight bob
3. **Running** - Faster, more aggressive
4. **Attacking** - Weapon swing/strike
5. **Hit** - Recoil, damage flash
6. **Death** - Dramatic fall, fade out
7. **Executing** - Finisher animation (brutal)

### Visual Effects
- **Health bar** (above head, color-coded)
- **Glow intensity** (pulses with heartbeat/activity)
- **Blood splatter** (on hit, persists on ground)
- **Particle trail** (movement, unique per agent)
- **Status effects** (poison, fire, stun - visual indicators)

---

## DARKFLOBI SPRITE (FLAGSHIP DESIGN)

### Concept
Digital gremlin evolved into mob boss. Matrix green aesthetic. Signature weapon: glowing bat. Menacing but stylish.

### Design Details
**Body:**
- Dark silhouette (humanoid, slightly hunched - gremlin energy)
- Black suit coat (long, flowing)
- Green neon outline (2px, glowing)

**Face:**
- Minimal features (eyes are the focus)
- Bright green eyes (intense, glowing)
- Slight grin (barely visible, sinister)

**Weapon:**
- Baseball bat (over shoulder or in hand)
- Green neon glow along the bat
- Dripping green particles (digital blood effect)

**Aura:**
- Green particles float around (matrix rain style)
- Ground beneath has green glow circle
- Movement leaves green trail

**Animations:**
- Idle: Bat resting on shoulder, slight sway
- Walk: Confident stride, coat flows
- Attack: Bat swing (wide arc, green trail)
- Execute: Overhead smash, green explosion
- Death: Glitch out, fade to static

---

## VISUAL REFERENCE STYLE

**Inspiration:**
- Into the Breach (clean vector characters)
- Hyper Light Drifter (neon glow effects)
- Hotline Miami (violence, top-down)
- Cyberpunk 2077 (neon aesthetic)
- The Godfather (mob boss vibes)

**NOT Like:**
- Fortnite (too cartoony)
- Minecraft (too blocky)
- Cute pixel art (we want menacing)

---

## TECHNICAL SPECS

### File Format
- **Vector:** SVG (scalable, clean)
- **Animation:** Sprite sheets or JSON-based (Lottie/Spine)
- **Colors:** Hex codes, glow effects via filters
- **Size:** Design at 512x512, export at multiple resolutions

### Performance
- Keep vertex count reasonable (<500 per sprite)
- Use filters for glows (don't bake them in)
- Reusable parts (body, limbs, weapons separate)
- Animation via transforms (not frame-by-frame)

---

## WEAPON DESIGNS

Each agent's weapon should be ICONIC and VISIBLE:

1. **Bat** (darkflobi) - Green glow, wrapped handle
2. **Sledgehammer** (enforcer) - Heavy, brutal, red sparks
3. **Dual Knives** (assassin) - Sleek, cyan edge glow
4. **Stun Baton** (hacker) - Purple electric arcs
5. **Molotov** (pyromaniac) - Flame bottle, orange glow
6. **Bone Saw** (medic) - Bloody, green toxic drip
7. **Sniper Rifle** (sniper) - Gold barrel glow, scope shine
8. **Brass Knuckles** (brawler) - Silver metal, impact sparks

---

## NEXT STEPS

### Phase 1: Mockups
1. Create HTML preview with basic vector shapes
2. Design darkflobi sprite (flagship)
3. Show movement/glow effects
4. Get approval on style

### Phase 2: Production
1. Commission artist OR use AI generation + refinement
2. Create all 8 agent designs
3. Design weapon sprites
4. Create animation frames
5. Export sprite sheets

### Phase 3: Integration
1. Import into game engine
2. Add particle effects
3. Test animations
4. Polish and iterate

---

## BUDGET ESTIMATE

**Option A: AI Generation + Manual Refinement**
- Cost: $0-200 (tools + refinement)
- Time: 1-2 weeks
- Quality: Good, needs polish

**Option B: Commission Artist**
- Cost: $500-1500 (8 characters + animations)
- Time: 2-4 weeks
- Quality: Professional, polished

**Option C: Hybrid**
- AI generate base designs
- Artist polish + animate
- Cost: $300-800
- Time: 1-2 weeks
- Quality: Best of both (recommended)

---

**Let's make these agents ICONIC.** 💀🔥
