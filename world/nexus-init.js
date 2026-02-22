/**
 * NEXUS Initialization Helper
 * Easy integration for DARKCITY applications
 */

import { NexusHub } from './nexus-hub.js';

export class NexusInitializer {
  constructor(config = {}) {
    this.config = {
      containerId: config.containerId || 'darkcity-world',
      showHUD: config.showHUD !== false,
      showMinimap: config.showMinimap !== false,
      enableZoneCallbacks: config.enableZoneCallbacks || false,
      spectatorStart: config.spectatorStart || false,
      startZone: config.startZone || 'spawn_plaza',
      ...config
    };
    
    this.nexus = null;
    this.callbacks = {
      onZoneEnter: config.onZoneEnter || null,
      onZoneExit: config.onZoneExit || null,
      onPortalActivate: config.onPortalActivate || null
    };
    
    this.currentZone = null;
  }

  async init() {
    const container = document.getElementById(this.config.containerId);
    if (!container) {
      throw new Error(`Container #${this.config.containerId} not found`);
    }

    // Initialize the hub
    this.nexus = new NexusHub();
    this.nexus.init(container);

    // Set initial state
    if (this.config.spectatorStart) {
      this.nexus.toggleSpectatorMode();
    }

    if (this.config.startZone && this.config.startZone !== 'spawn_plaza') {
      this.nexus.teleportToZone(this.config.startZone);
    }

    // Setup optional UI
    if (this.config.showHUD) {
      this.createHUD();
    }

    if (this.config.showMinimap) {
      this.createMinimap();
    }

    // Setup zone monitoring
    if (this.config.enableZoneCallbacks) {
      this.startZoneMonitoring();
    }

    console.log('⬢ NEXUS initialized:', this.nexus.getZones());
    return this.nexus;
  }

  createHUD() {
    const hud = document.createElement('div');
    hud.id = 'nexus-hud';
    hud.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.7);
      padding: 15px;
      border: 2px solid #00ffff;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 1000;
      min-width: 200px;
    `;
    
    hud.innerHTML = `
      <div style="color: #ff00ff; margin-bottom: 10px; font-weight: bold;">⬢ THE NEXUS</div>
      <div>Zone: <span id="hud-zone">SPAWN</span></div>
      <div>Coords: <span id="hud-coords">0,0,0</span></div>
      <div>Mode: <span id="hud-mode">STANDARD</span></div>
    `;
    
    document.body.appendChild(hud);

    // Update loop
    setInterval(() => {
      if (!this.nexus) return;
      
      const pos = this.nexus.player.position;
      document.getElementById('hud-coords').textContent = 
        `${pos.x.toFixed(0)},${pos.y.toFixed(0)},${pos.z.toFixed(0)}`;
      
      document.getElementById('hud-mode').textContent = 
        this.nexus.spectatorMode ? 'SPECTATOR' : 'STANDARD';
      
      // Update zone
      let zoneName = 'UNKNOWN';
      this.nexus.zones.forEach(zone => {
        if (pos.distanceTo(zone.center) < zone.radius) {
          zoneName = zone.name.toUpperCase();
        }
      });
      document.getElementById('hud-zone').textContent = zoneName;
    }, 100);
  }

  createMinimap() {
    const container = document.createElement('div');
    container.id = 'nexus-minimap';
    container.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 150px;
      height: 150px;
      border: 2px solid #00ffff;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
    `;
    
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    container.appendChild(canvas);
    document.body.appendChild(container);

    const ctx = canvas.getContext('2d');
    
    const updateMinimap = () => {
      if (!this.nexus) return;
      
      ctx.clearRect(0, 0, 150, 150);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 150, 150);
      
      // Grid
      ctx.strokeStyle = '#00ffff22';
      for (let i = 0; i <= 150; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 150);
        ctx.moveTo(0, i);
        ctx.lineTo(150, i);
        ctx.stroke();
      }
      
      // Zones
      this.nexus.zones.forEach(zone => {
        const x = 75 + zone.center.x * 1.2;
        const y = 75 + zone.center.z * 1.2;
        ctx.beginPath();
        ctx.arc(x, y, zone.radius * 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = zone.isPortal ? '#ff0066' : '#00ffff88';
        ctx.stroke();
      });
      
      // Player
      const px = 75 + this.nexus.player.position.x * 1.2;
      const py = 75 + this.nexus.player.position.z * 1.2;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ff00ff';
      ctx.fill();
      
      requestAnimationFrame(updateMinimap);
    };
    updateMinimap();
  }

  startZoneMonitoring() {
    setInterval(() => {
      if (!this.nexus) return;
      
      const pos = this.nexus.player.position;
      let foundZone = null;
      
      this.nexus.zones.forEach((zone, id) => {
        if (pos.distanceTo(zone.center) < zone.radius) {
          foundZone = { id, ...zone };
        }
      });
      
      // Zone transitions
      if (foundZone && foundZone.id !== this.currentZone) {
        // Exit old zone
        if (this.currentZone && this.callbacks.onZoneExit) {
          this.callbacks.onZoneExit(this.currentZone);
        }
        
        // Enter new zone
        if (this.callbacks.onZoneEnter) {
          this.callbacks.onZoneEnter(foundZone.id, foundZone);
        }
        
        // Portal activation
        if (foundZone.isPortal && this.callbacks.onPortalActivate) {
          this.callbacks.onPortalActivate(foundZone.id, foundZone);
        }
        
        this.currentZone = foundZone.id;
      } else if (!foundZone && this.currentZone) {
        // Left all zones
        if (this.callbacks.onZoneExit) {
          this.callbacks.onZoneExit(this.currentZone);
        }
        this.currentZone = null;
      }
    }, 500);
  }

  // Public API
  getNexus() {
    return this.nexus;
  }

  teleportTo(zoneId) {
    return this.nexus ? this.nexus.teleportToZone(zoneId) : false;
  }

  getZones() {
    return this.nexus ? this.nexus.getZones() : [];
  }

  toggleSpectator() {
    if (this.nexus) {
      this.nexus.toggleSpectatorMode();
    }
  }

  destroy() {
    if (this.nexus) {
      this.nexus.dispose();
    }
    
    // Clean up UI
    const hud = document.getElementById('nexus-hud');
    const minimap = document.getElementById('nexus-minimap');
    if (hud) hud.remove();
    if (minimap) minimap.remove();
  }
}

// Convenience function for quick setup
export async function initNexus(config = {}) {
  const initializer = new NexusInitializer(config);
  await initializer.init();
  return initializer;
}

// Example usage:
/*
import { initNexus } from './nexus-init.js';

const nexusApp = await initNexus({
  containerId: 'my-container',
  showHUD: true,
  showMinimap: true,
  enableZoneCallbacks: true,
  onZoneEnter: (zoneId, zone) => {
    console.log('Entered:', zone.name);
  },
  onPortalActivate: (portalId, portal) => {
    console.log('Portal activated:', portal.name);
    // Navigate to different district
  }
});

// Access the underlying NexusHub
const hub = nexusApp.getNexus();
*/
