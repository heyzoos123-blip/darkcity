# NEXUS Quick Start Guide

Get THE NEXUS running in 60 seconds.

## Method 1: Standalone Demo (Easiest)

1. **Open the demo file directly:**
   ```bash
   # Just open in browser
   open nexus-demo.html
   # or
   start nexus-demo.html
   ```

2. **That's it!** You should see:
   - Dark Gothic city with rain
   - Gas lamps lighting the streets
   - Neon signs glowing in fog
   - HUD showing controls
   - Minimap in top-right

3. **Move around:**
   - `W/A/S/D` - Walk
   - `Q/E` - Turn
   - `V` - Toggle spectator mode
   - `1-9` - Fast travel to zones

## Method 2: Local Server (Recommended)

If the demo doesn't work due to CORS or module issues:

```bash
# Option A: Python
python -m http.server 8000

# Option B: Node.js
npx serve .

# Option C: VS Code
# Install "Live Server" extension, right-click nexus-demo.html -> "Open with Live Server"
```

Then visit: `http://localhost:8000/nexus-demo.html`

## Method 3: Embed in Your App

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
  <div id="world" style="width: 100vw; height: 100vh;"></div>
  
  <script type="module">
    import { initNexus } from './nexus-init.js';
    
    const app = await initNexus({
      containerId: 'world',
      showHUD: true,
      showMinimap: true,
      onZoneEnter: (id, zone) => {
        console.log('Welcome to:', zone.name);
      }
    });
  </script>
</body>
</html>
```

## Method 4: NPM Integration

```bash
# In your DARKCITY project
npm install three

# Import
import { NexusHub } from './projects/darkcity/world/nexus-hub.js';
```

## Troubleshooting

### Black Screen
- Check browser console (F12) for errors
- Make sure you're using a modern browser (Chrome/Firefox/Edge)
- WebGL must be enabled
- Try using a local server instead of `file://`

### Module Not Found
- Ensure you have internet connection (Three.js loads from CDN)
- Or install Three.js locally: `npm install three`

### Performance Issues
- Lower rain particle count in `nexus-hub.js` (line ~355)
- Disable shadows: `renderer.shadowMap.enabled = false`
- Reduce fog density: `scene.fog = new THREE.FogExp2(0x0f0f1a, 0.015)`

### Controls Not Working
- Click on the canvas first to focus
- Check if another app is capturing keyboard input
- Try refreshing the page

## What You Should See

```
🌆 THE NEXUS Loading Screen
   ↓
🌃 Dark Gothic City
   • Rain falling continuously
   • Gas lamps flickering
   • Neon signs pulsing
   • Victorian buildings with lit windows
   • Central glowing obelisk
   • Three portal gates (different colors)
   • Minimap showing your position
   ↓
🎮 Walk Around!
   • Explore the spawn plaza
   • Visit the Agent Registry building
   • Find the three portal gates
   • Try spectator mode for aerial view
```

## Next Steps

1. **Explore the zones:**
   - Press `1` for Spawn Plaza
   - Press `2` for Agent Registry
   - Press `3-5` for Portal Gates

2. **Customize:**
   - Edit colors in `nexus-hub.js`
   - Add your own buildings
   - Modify lighting intensity
   - Change fog density

3. **Integrate:**
   - Connect to agent system
   - Add NPC agents
   - Implement portal navigation
   - Add sound effects

## Resources

- **README.md** - Full documentation
- **nexus-hub.js** - Core Three.js scene
- **nexus-init.js** - Easy integration helper
- **nexus-demo.html** - Standalone demo with full UI

## Support

Issues? Check:
1. Browser supports WebGL: https://get.webgl.org/
2. Three.js version: v0.160.0
3. JavaScript modules enabled
4. No CORS errors in console

---

**⬢ Welcome to THE NEXUS. The city awaits.**
