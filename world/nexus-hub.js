/**
 * THE NEXUS - DARKCITY Central Hub
 * Gothic N64-style 3D explorable city district
 * Perpetual twilight, rain-slicked streets, Victorian architecture
 */

import * as THREE from 'three';

export class NexusHub {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = {
      position: new THREE.Vector3(0, 2, 0),
      rotation: 0,
      velocity: new THREE.Vector3(0, 0, 0),
      speed: 0.15,
      height: 2
    };
    this.zones = new Map();
    this.buildings = [];
    this.lights = [];
    this.spectatorMode = false;
    this.keys = {};
    this.clock = new THREE.Clock();
    this.rain = null;
    this.fog = null;
  }

  init(container) {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer(container);
    this.setupLighting();
    this.buildArchitecture();
    this.createZones();
    this.setupRain();
    this.setupControls();
    this.animate();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    
    // Dark perpetual twilight sky
    const skyColor = new THREE.Color(0x0a0a15);
    const groundColor = new THREE.Color(0x050508);
    this.scene.background = skyColor;
    
    // Dense fog for atmosphere
    this.scene.fog = new THREE.FogExp2(0x0f0f1a, 0.025);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      70, // FOV - wider for N64 feel
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.copy(this.player.position);
    this.camera.position.y += this.player.height;
  }

  setupRenderer(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false }); // N64 style - no AA
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // Hard shadows for N64 feel
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.4; // Dark moody exposure
    
    container.appendChild(this.renderer.domElement);
    
    window.addEventListener('resize', () => this.onResize());
  }

  setupLighting() {
    // Ambient twilight
    const ambient = new THREE.AmbientLight(0x1a1a2e, 0.3);
    this.scene.add(ambient);

    // Directional moon/twilight light
    const moonLight = new THREE.DirectionalLight(0x4a5a8a, 0.4);
    moonLight.position.set(-50, 80, -30);
    moonLight.castShadow = true;
    moonLight.shadow.camera.left = -100;
    moonLight.shadow.camera.right = 100;
    moonLight.shadow.camera.top = 100;
    moonLight.shadow.camera.bottom = -100;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    this.scene.add(moonLight);

    // Gas lamps along streets
    this.createGasLamps();
    
    // Neon signs
    this.createNeonSigns();
  }

  createGasLamps() {
    const lampPositions = [
      [-15, 0, -15], [15, 0, -15], [-15, 0, 15], [15, 0, 15],
      [-30, 0, 0], [30, 0, 0], [0, 0, -30], [0, 0, 30],
      [-20, 0, -25], [20, 0, -25], [-20, 0, 25], [20, 0, 25]
    ];

    lampPositions.forEach(pos => {
      // Lamp post (low-poly)
      const postGeom = new THREE.CylinderGeometry(0.1, 0.15, 4, 6);
      const postMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        roughness: 0.8,
        metalness: 0.3
      });
      const post = new THREE.Mesh(postGeom, postMat);
      post.position.set(pos[0], 2, pos[2]);
      post.castShadow = true;
      this.scene.add(post);

      // Lamp housing
      const housingGeom = new THREE.BoxGeometry(0.6, 0.8, 0.6);
      const housingMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
      const housing = new THREE.Mesh(housingGeom, housingMat);
      housing.position.set(pos[0], 4.4, pos[2]);
      housing.castShadow = true;
      this.scene.add(housing);

      // Gas flame light
      const lampLight = new THREE.PointLight(0xffaa44, 2, 20);
      lampLight.position.set(pos[0], 4.5, pos[2]);
      lampLight.castShadow = true;
      lampLight.shadow.mapSize.width = 256;
      lampLight.shadow.mapSize.height = 256;
      this.scene.add(lampLight);

      // Subtle glow sphere
      const glowGeom = new THREE.SphereGeometry(0.2, 6, 6);
      const glowMat = new THREE.MeshBasicMaterial({ 
        color: 0xffaa44,
        transparent: true,
        opacity: 0.8
      });
      const glow = new THREE.Mesh(glowGeom, glowMat);
      glow.position.set(pos[0], 4.5, pos[2]);
      this.scene.add(glow);
      
      this.lights.push({ light: lampLight, glow, flicker: Math.random() });
    });
  }

  createNeonSigns() {
    const signs = [
      { text: 'NEXUS', pos: [-25, 8, -19.5], color: 0x00ffff },
      { text: 'REGISTRY', pos: [25, 10, -19.5], color: 0xff00ff },
      { text: 'PORTAL', pos: [-25, 6, 19.5], color: 0xff0066 },
      { text: 'AGENCY', pos: [19.5, 7, -25], color: 0x00ff88 }
    ];

    signs.forEach(sign => {
      const neonLight = new THREE.PointLight(sign.color, 3, 15);
      neonLight.position.set(sign.pos[0], sign.pos[1], sign.pos[2]);
      this.scene.add(neonLight);

      // Neon tube geometry (simplified)
      const tubeGeom = new THREE.BoxGeometry(4, 0.3, 0.3);
      const tubeMat = new THREE.MeshBasicMaterial({ 
        color: sign.color,
        transparent: true,
        opacity: 0.9
      });
      const tube = new THREE.Mesh(tubeGeom, tubeMat);
      tube.position.copy(neonLight.position);
      this.scene.add(tube);

      this.lights.push({ 
        light: neonLight, 
        glow: tube, 
        flicker: Math.random(),
        baseIntensity: 3,
        color: sign.color 
      });
    });
  }

  buildArchitecture() {
    // Ground - rain-slicked streets
    const groundGeom = new THREE.PlaneGeometry(200, 200, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x0a0a0a,
      roughness: 0.1, // Wet look
      metalness: 0.6  // Reflective puddles
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Central plaza
    this.createSpawnPlaza();
    
    // Victorian buildings
    this.createVictorianBuildings();
    
    // Agent Registry building
    this.createRegistryBuilding();
    
    // District portals
    this.createPortals();
    
    // Public spaces
    this.createPublicSpaces();
  }

  createSpawnPlaza() {
    // Central circular plaza
    const plazaGeom = new THREE.CylinderGeometry(12, 12, 0.2, 8);
    const plazaMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2a,
      roughness: 0.3,
      metalness: 0.5
    });
    const plaza = new THREE.Mesh(plazaGeom, plazaMat);
    plaza.position.y = 0.1;
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    // Center monument/obelisk
    const obeliskGeom = new THREE.ConeGeometry(0.8, 8, 4);
    const obeliskMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a });
    const obelisk = new THREE.Mesh(obeliskGeom, obeliskMat);
    obelisk.position.y = 4;
    obelisk.castShadow = true;
    this.scene.add(obelisk);

    // Glowing crystal at top
    const crystalGeom = new THREE.OctahedronGeometry(0.5, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const crystal = new THREE.Mesh(crystalGeom, crystalMat);
    crystal.position.y = 8.5;
    this.scene.add(crystal);

    const crystalLight = new THREE.PointLight(0x00ffff, 4, 30);
    crystalLight.position.y = 8.5;
    this.scene.add(crystalLight);

    this.zones.set('spawn_plaza', {
      name: 'Spawn Plaza',
      center: new THREE.Vector3(0, 0, 0),
      radius: 12,
      description: 'The heart of THE NEXUS'
    });
  }

  createVictorianBuildings() {
    const buildingConfigs = [
      { pos: [-25, 0, -20], size: [8, 15, 8], color: 0x1a1520 },
      { pos: [25, 0, -20], size: [10, 18, 10], color: 0x15151a },
      { pos: [-25, 0, 20], size: [12, 12, 8], color: 0x1a151a },
      { pos: [25, 0, 20], size: [8, 20, 8], color: 0x151520 },
      { pos: [-40, 0, 0], size: [6, 14, 12], color: 0x1a1a15 },
      { pos: [40, 0, 0], size: [6, 16, 10], color: 0x15151a }
    ];

    buildingConfigs.forEach(config => {
      this.createBuilding(config.pos, config.size, config.color);
    });
  }

  createBuilding(pos, size, color) {
    const [w, h, d] = size;
    
    // Main structure
    const buildingGeom = new THREE.BoxGeometry(w, h, d);
    const buildingMat = new THREE.MeshStandardMaterial({ 
      color,
      roughness: 0.9,
      metalness: 0.1
    });
    const building = new THREE.Mesh(buildingGeom, buildingMat);
    building.position.set(pos[0], h / 2, pos[1]);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);

    // Gothic peaked roof
    const roofGeom = new THREE.ConeGeometry(w * 0.7, 3, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.set(pos[0], h + 1.5, pos[1]);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.scene.add(roof);

    // Windows with dim light
    const windowCount = Math.floor(h / 3);
    for (let i = 0; i < windowCount; i++) {
      this.createWindows(pos, size, i * 3 + 2);
    }

    this.buildings.push({ mesh: building, roof, position: pos, size });
  }

  createWindows(buildingPos, buildingSize, yOffset) {
    const [w, h, d] = buildingSize;
    const windowGeom = new THREE.BoxGeometry(0.8, 1.2, 0.1);
    const windowMat = new THREE.MeshBasicMaterial({ 
      color: 0xffaa33,
      transparent: true,
      opacity: 0.3
    });

    // Front windows
    const frontWindow = new THREE.Mesh(windowGeom, windowMat);
    frontWindow.position.set(buildingPos[0], yOffset, buildingPos[1] + d / 2 + 0.05);
    this.scene.add(frontWindow);

    // Window light
    const windowLight = new THREE.PointLight(0xffaa33, 0.5, 8);
    windowLight.position.copy(frontWindow.position);
    this.scene.add(windowLight);
  }

  createRegistryBuilding() {
    // Larger, more prominent building for Agent Registry
    const registryGeom = new THREE.BoxGeometry(15, 22, 15);
    const registryMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1525,
      roughness: 0.8
    });
    const registry = new THREE.Mesh(registryGeom, registryMat);
    registry.position.set(0, 11, -35);
    registry.castShadow = true;
    registry.receiveShadow = true;
    this.scene.add(registry);

    // Gothic entrance archway
    const archGeom = new THREE.BoxGeometry(4, 6, 1);
    const archMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
    const arch = new THREE.Mesh(archGeom, archMat);
    arch.position.set(0, 3, -27.5);
    this.scene.add(arch);

    // Registry sign light
    const registryLight = new THREE.PointLight(0xff00ff, 5, 25);
    registryLight.position.set(0, 20, -27);
    this.scene.add(registryLight);

    // Clock tower element
    const towerGeom = new THREE.CylinderGeometry(2, 3, 8, 6);
    const tower = new THREE.Mesh(towerGeom, registryMat);
    tower.position.set(0, 26, -35);
    tower.castShadow = true;
    this.scene.add(tower);

    this.zones.set('agent_registry', {
      name: 'Agent Registry',
      center: new THREE.Vector3(0, 0, -35),
      radius: 10,
      description: 'Official registration and identity verification'
    });
  }

  createPortals() {
    const portalPositions = [
      { pos: [-35, 3, 35], color: 0xff0066, name: 'WEST_GATE' },
      { pos: [35, 3, 35], color: 0x00ff88, name: 'EAST_GATE' },
      { pos: [0, 3, 50], color: 0x0088ff, name: 'SOUTH_GATE' }
    ];

    portalPositions.forEach(portal => {
      // Portal frame
      const frameGeom = new THREE.TorusGeometry(3, 0.3, 6, 8);
      const frameMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a2a,
        metalness: 0.8,
        roughness: 0.2
      });
      const frame = new THREE.Mesh(frameGeom, frameMat);
      frame.position.set(portal.pos[0], portal.pos[1], portal.pos[2]);
      frame.rotation.y = Math.PI / 2;
      this.scene.add(frame);

      // Portal energy field
      const fieldGeom = new THREE.CircleGeometry(2.8, 8);
      const fieldMat = new THREE.MeshBasicMaterial({ 
        color: portal.color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      });
      const field = new THREE.Mesh(fieldGeom, fieldMat);
      field.position.copy(frame.position);
      field.rotation.y = Math.PI / 2;
      this.scene.add(field);

      // Portal light
      const portalLight = new THREE.PointLight(portal.color, 6, 20);
      portalLight.position.copy(frame.position);
      this.scene.add(portalLight);

      this.zones.set(`portal_${portal.name}`, {
        name: `Portal: ${portal.name}`,
        center: new THREE.Vector3(portal.pos[0], 0, portal.pos[2]),
        radius: 5,
        description: `Gateway to ${portal.name} district`,
        isPortal: true
      });

      this.lights.push({ 
        light: portalLight, 
        glow: field, 
        flicker: Math.random(),
        baseIntensity: 6,
        pulseSpeed: 2
      });
    });
  }

  createPublicSpaces() {
    // Benches
    const benchPositions = [
      [8, 0.5, 8], [-8, 0.5, 8], [8, 0.5, -8], [-8, 0.5, -8]
    ];

    benchPositions.forEach(pos => {
      const benchGeom = new THREE.BoxGeometry(2, 0.3, 0.6);
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
      const bench = new THREE.Mesh(benchGeom, benchMat);
      bench.position.set(pos[0], pos[1], pos[2]);
      bench.castShadow = true;
      this.scene.add(bench);
    });

    // Public info kiosks
    const kioskGeom = new THREE.BoxGeometry(1, 2.5, 0.2);
    const kioskMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const kiosk = new THREE.Mesh(kioskGeom, kioskMat);
    kiosk.position.set(10, 1.25, 0);
    kiosk.castShadow = true;
    this.scene.add(kiosk);

    // Kiosk screen
    const screenGeom = new THREE.BoxGeometry(0.8, 1.2, 0.1);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
    const screen = new THREE.Mesh(screenGeom, screenMat);
    screen.position.set(10, 1.5, 0.15);
    this.scene.add(screen);
  }

  setupRain() {
    const rainCount = 1000;
    const rainGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    const velocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      velocities[i] = 0.1 + Math.random() * 0.2;
    }

    rainGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    rainGeom.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

    const rainMat = new THREE.PointsMaterial({
      color: 0x7799bb,
      size: 0.1,
      transparent: true,
      opacity: 0.4
    });

    this.rain = new THREE.Points(rainGeom, rainMat);
    this.scene.add(this.rain);
  }

  setupControls() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      
      // Toggle spectator mode
      if (e.key === 'v') {
        this.toggleSpectatorMode();
      }
      
      // Fast travel
      if (e.key >= '1' && e.key <= '9') {
        this.fastTravel(parseInt(e.key) - 1);
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Mouse look (when clicking)
    let isMouseDown = false;
    let lastMouseX = 0;

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      lastMouseX = e.clientX;
    });

    document.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (isMouseDown && !this.spectatorMode) {
        const deltaX = e.clientX - lastMouseX;
        this.player.rotation -= deltaX * 0.003;
        lastMouseX = e.clientX;
      }
    });
  }

  toggleSpectatorMode() {
    this.spectatorMode = !this.spectatorMode;
    console.log(`Spectator mode: ${this.spectatorMode ? 'ON' : 'OFF'}`);
  }

  fastTravel(index) {
    const zoneArray = Array.from(this.zones.values());
    if (index < zoneArray.length) {
      const zone = zoneArray[index];
      this.player.position.copy(zone.center);
      this.player.position.y = 2;
      console.log(`Fast travel to: ${zone.name}`);
    }
  }

  updatePlayer(delta) {
    if (this.spectatorMode) {
      this.updateSpectatorCamera(delta);
      return;
    }

    const moveSpeed = this.player.speed;
    const rotSpeed = 2.5;

    // Rotation
    if (this.keys['q']) this.player.rotation += rotSpeed * delta;
    if (this.keys['e']) this.player.rotation -= rotSpeed * delta;

    // Movement
    const forward = new THREE.Vector3(
      Math.sin(this.player.rotation),
      0,
      Math.cos(this.player.rotation)
    );
    const right = new THREE.Vector3(
      Math.cos(this.player.rotation),
      0,
      -Math.sin(this.player.rotation)
    );

    if (this.keys['w']) this.player.position.add(forward.multiplyScalar(moveSpeed));
    if (this.keys['s']) this.player.position.add(forward.multiplyScalar(-moveSpeed));
    if (this.keys['a']) this.player.position.add(right.multiplyScalar(-moveSpeed));
    if (this.keys['d']) this.player.position.add(right.multiplyScalar(moveSpeed));

    // Update camera
    this.camera.position.copy(this.player.position);
    this.camera.position.y += this.player.height;
    this.camera.rotation.y = this.player.rotation;

    // Check zones
    this.checkCurrentZone();
  }

  updateSpectatorCamera(delta) {
    const speed = 0.3;
    const rotSpeed = 1.5;

    if (this.keys['w']) this.camera.position.z -= speed;
    if (this.keys['s']) this.camera.position.z += speed;
    if (this.keys['a']) this.camera.position.x -= speed;
    if (this.keys['d']) this.camera.position.x += speed;
    if (this.keys['q']) this.camera.position.y += speed;
    if (this.keys['e']) this.camera.position.y -= speed;

    // Orbital rotation around center
    if (this.keys['arrowleft']) {
      const angle = rotSpeed * delta;
      const x = this.camera.position.x * Math.cos(angle) - this.camera.position.z * Math.sin(angle);
      const z = this.camera.position.x * Math.sin(angle) + this.camera.position.z * Math.cos(angle);
      this.camera.position.x = x;
      this.camera.position.z = z;
    }
    if (this.keys['arrowright']) {
      const angle = -rotSpeed * delta;
      const x = this.camera.position.x * Math.cos(angle) - this.camera.position.z * Math.sin(angle);
      const z = this.camera.position.x * Math.sin(angle) + this.camera.position.z * Math.cos(angle);
      this.camera.position.x = x;
      this.camera.position.z = z;
    }

    this.camera.lookAt(0, 5, 0);
  }

  checkCurrentZone() {
    for (const [id, zone] of this.zones) {
      const dist = this.player.position.distanceTo(zone.center);
      if (dist < zone.radius) {
        // Player entered zone - could trigger events here
      }
    }
  }

  updateRain(delta) {
    if (!this.rain) return;

    const positions = this.rain.geometry.attributes.position.array;
    const velocities = this.rain.geometry.attributes.velocity.array;

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3 + 1] -= velocities[i];
      
      // Reset rain drops that hit ground
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 50;
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      }
    }

    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  updateLights(delta) {
    const time = this.clock.getElapsedTime();

    this.lights.forEach(lightObj => {
      // Gas lamp flicker
      if (lightObj.baseIntensity === undefined) {
        const flicker = Math.sin(time * 10 + lightObj.flicker * 100) * 0.1;
        lightObj.light.intensity = 2 + flicker;
      }
      
      // Neon pulse
      if (lightObj.pulseSpeed) {
        const pulse = Math.sin(time * lightObj.pulseSpeed) * 0.5 + 0.5;
        lightObj.light.intensity = lightObj.baseIntensity * (0.7 + pulse * 0.3);
        lightObj.glow.material.opacity = 0.4 + pulse * 0.3;
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    const delta = this.clock.getDelta();
    
    this.updatePlayer(delta);
    this.updateRain(delta);
    this.updateLights(delta);
    
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Public API
  getZones() {
    return Array.from(this.zones.entries()).map(([id, zone]) => ({
      id,
      name: zone.name,
      description: zone.description,
      isPortal: zone.isPortal || false
    }));
  }

  teleportToZone(zoneId) {
    const zone = this.zones.get(zoneId);
    if (zone) {
      this.player.position.copy(zone.center);
      this.player.position.y = 2;
      return true;
    }
    return false;
  }

  setTimeOfDay(hour) {
    // Perpetual twilight, but can adjust intensity
    const intensity = 0.2 + (hour / 24) * 0.3;
    this.scene.children.forEach(child => {
      if (child.isAmbientLight) {
        child.intensity = intensity;
      }
    });
  }

  dispose() {
    this.renderer.dispose();
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}

// Usage example:
// import { NexusHub } from './nexus-hub.js';
// const nexus = new NexusHub();
// nexus.init(document.getElementById('darkcity-container'));
