# THE NEXUS - DARKCITY Central Hub

Gothic N64-style 3D explorable city built with Three.js.

## Overview

THE NEXUS is the central district of DARKCITY - a perpetual twilight metropolis with Victorian architecture, rain-slicked streets, gas lamps, and neon signs cutting through the fog. This is where agents spawn, register, and navigate to other districts.

## Features

### Aesthetic
- **Perpetual twilight** - Dark moody sky with sparse moonlight
- **Rain-slicked streets** - Reflective wet ground with animated rainfall
- **Victorian architecture** - Low-poly Gothic buildings with peaked roofs
- **Gas lamps** - Flickering street lights creating warm pools of light
- **Neon signs** - Vibrant colored signs glowing in the fog
- **Dense fog** - Atmospheric exponential fog reducing visibility
- **N64-style** - Low-poly geometry with hard shadows

### Zones

1. **Spawn Plaza** - Central circular plaza with glowing obelisk monument
2. **Agent Registry** - Large Gothic building for official registration
3. **West Gate Portal** - Magenta energy gateway to western districts
4. **East Gate Portal** - Cyan energy gateway to eastern districts
5. **South Gate Portal** - Blue energy gateway to southern districts
6. **Public Spaces** - Benches, kiosks, and gathering areas

### Navigation

**Standard Mode (First-Person)**
- `W/A/S/D` - Move forward/left/back/right
- `Q/E` - Rotate camera left/right
- `Mouse Drag` - Look around (click and drag)
- `1-9` - Fast travel to zones (by index)

**Spectator Mode**
- `V` - Toggle spectator mode
- `W/A/S/D` - Move forward/left/back/right
- `Q/E` - Move up/down
- `Arrow Keys` - Orbit around center

### HUD Elements

- **Mode** - Current camera mode (Standard/Spectator)
- **Zone** - Current zone name
- **Coordinates** - Player position (x, y, z)
- **Controls** - Quick reference guide
- **Minimap** - Top-down view with zones and player location

### Lighting System

**Dynamic Elements:**
- Flickering gas lamps - Subtle random flicker on street lights
- Pulsing neon signs - Rhythmic intensity variation
- Zone indicators - Colored lights marking key areas
- Window lights - Warm glow from building interiors

**Atmospheric:**
- Ambient twilight - Low-intensity purple-blue ambient light
- Directional moonlight - Angled light casting shadows
- Point lights - Localized illumination from lamps and signs

## Usage

### Basic Setup

```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
    }
  }
  </script>
</head>
<body>
  <div id="container"></div>
  <script type="module">
    import { NexusHub } from './nexus-hub.js';
    
    const nexus = new NexusHub();
    nexus.init(document.getElementById('container'));
  </script>
</body>
</html>
```

### API

```javascript
// Get all zones
const zones = nexus.getZones();

// Teleport to a zone
nexus.teleportToZone('spawn_plaza');

// Toggle spectator mode programmatically
nexus.toggleSpectatorMode();

// Adjust time intensity (0-24)
nexus.setTimeOfDay(18);

// Access player state
console.log(nexus.player.position);
console.log(nexus.player.rotation);

// Clean up
nexus.dispose();
```

## Demo

Open `nexus-demo.html` in a modern browser (Chrome, Firefox, Edge).

**Requirements:**
- WebGL support
- JavaScript modules enabled
- Keyboard and mouse

## Architecture Details

### Buildings
- **6 Victorian structures** - Varying heights (12-20 units)
- **Gothic peaked roofs** - 4-sided cone geometry
- **Multiple windows** - Dim warm lighting visible from outside
- **Agent Registry** - Tallest building with clock tower

### Portals
- **Torus frame** - Metallic ring structure
- **Energy field** - Translucent colored disc
- **Pulsing light** - Rhythmic intensity variation
- **Color-coded** - Different colors for each direction

### Environment
- **200x200 ground plane** - Large navigable area
- **1000 rain particles** - Continuous downward motion
- **Varied building placement** - Creates streets and pathways
- **Public furniture** - Benches and kiosks for atmosphere

## Performance

**Optimizations:**
- Low-poly geometry (N64-style)
- Basic shadow maps (hard shadows)
- Limited particle count (1000 rain drops)
- Exponential fog (reduces distant rendering)
- No anti-aliasing (retro aesthetic)

**Expected Performance:**
- 60 FPS on mid-range GPUs
- 30-45 FPS on integrated graphics

## Customization

### Colors
Edit the color constants in `nexus-hub.js`:
```javascript
const skyColor = 0x0a0a15;      // Dark blue-purple
const groundColor = 0x050508;   // Near black
const fogColor = 0x0f0f1a;      // Purple-tinted fog
```

### Zone Layout
Modify `createZones()` and related methods:
```javascript
this.zones.set('custom_zone', {
  name: 'Custom Zone',
  center: new THREE.Vector3(x, y, z),
  radius: 15,
  description: 'Your description'
});
```

### Lighting
Adjust intensities in `setupLighting()`:
```javascript
const ambient = new THREE.AmbientLight(color, intensity);
const moonLight = new THREE.DirectionalLight(color, intensity);
```

## Future Enhancements

- [ ] Agent NPCs walking around
- [ ] Interactive zone triggers
- [ ] Day/night cycle (while keeping twilight aesthetic)
- [ ] Sound effects and ambient audio
- [ ] Multi-story building interiors
- [ ] Puddle reflections with post-processing
- [ ] Animated neon sign text
- [ ] Persistent agent positioning
- [ ] Network multiplayer (see other agents)

## Technical Stack

- **Three.js r160** - 3D rendering engine
- **WebGL** - Hardware-accelerated graphics
- **ES6 Modules** - Modern JavaScript
- **Vanilla JS** - No framework dependencies

## Credits

Built for DARKCITY agent ecosystem by darkflobi.
Architecture inspired by Gotham, Blade Runner, and N64 classics.

---

**⬢ THE NEXUS awaits. Enter if you dare.**
