// DARKCITY 3D Combat Arena

class Arena3D {
    constructor() {
        this.engine = new CombatEngine();
        this.agents = new Map();
        this.round = 0;
        this.battleActive = false;
        
        this.initScene();
        this.initLights();
        this.initArena();
        this.animate();
    }

    initScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.FogExp2(0x0a0000, 0.04); // Red-tinted fog

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            65,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 12, 22);
        this.camera.lookAt(0, 2, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.6; // Darker, more oppressive
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Blood particles
        this.bloodParticles = [];
    }

    initLights() {
        // Very dim ambient (oppressive darkness)
        const ambient = new THREE.AmbientLight(0x1a0000, 0.15);
        this.scene.add(ambient);

        // Main overhead light (blood moon vibe)
        const moon = new THREE.DirectionalLight(0x5a0000, 0.8);
        moon.position.set(0, 30, -10);
        moon.castShadow = true;
        moon.shadow.mapSize.width = 2048;
        moon.shadow.mapSize.height = 2048;
        moon.shadow.camera.far = 50;
        this.scene.add(moon);

        // Flickering street lights atmosphere
        const flickerLight1 = new THREE.PointLight(0x8b0000, 0.6, 20);
        flickerLight1.position.set(-10, 8, -8);
        this.scene.add(flickerLight1);

        const flickerLight2 = new THREE.PointLight(0x8b0000, 0.6, 20);
        flickerLight2.position.set(10, 8, 8);
        this.scene.add(flickerLight2);

        // Flicker animation
        setInterval(() => {
            flickerLight1.intensity = 0.3 + Math.random() * 0.6;
            flickerLight2.intensity = 0.3 + Math.random() * 0.6;
        }, 150);

        // Greenish backlight (sickly)
        const backlight = new THREE.PointLight(0x1a3d1a, 0.4, 25);
        backlight.position.set(0, 5, 15);
        this.scene.add(backlight);
    }

    initArena() {
        // Cracked city street floor
        const floorGeometry = new THREE.PlaneGeometry(50, 50, 10, 10);
        const vertices = floorGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] += (Math.random() - 0.5) * 0.3; // Random height variation
        }
        floorGeometry.computeVertexNormals();
        
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x151515,
            roughness: 1.0,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Blood stains on floor
        for (let i = 0; i < 20; i++) {
            const stainGeo = new THREE.CircleGeometry(0.5 + Math.random() * 2, 16);
            const stainMat = new THREE.MeshBasicMaterial({
                color: 0x3d0000,
                transparent: true,
                opacity: 0.6
            });
            const stain = new THREE.Mesh(stainGeo, stainMat);
            stain.rotation.x = -Math.PI / 2;
            stain.position.set(
                (Math.random() - 0.5) * 40,
                0.02,
                (Math.random() - 0.5) * 40
            );
            this.scene.add(stain);
        }

        // Combat zones (street intersections)
        this.zones = {
            'CENTER': { x: 0, z: 0 },
            'NORTH1': { x: -6, z: -10 },
            'NORTH2': { x: 6, z: -10 },
            'SOUTH1': { x: -6, z: 10 },
            'SOUTH2': { x: 6, z: 10 }
        };

        Object.entries(this.zones).forEach(([name, pos]) => {
            // Cracked concrete platforms
            const platformGeo = new THREE.BoxGeometry(4, 0.4, 4);
            const platformMat = new THREE.MeshStandardMaterial({
                color: name === 'CENTER' ? 0x2a0000 : 0x1a1a1a,
                roughness: 0.9,
                metalness: 0.2
            });
            const platform = new THREE.Mesh(platformGeo, platformMat);
            platform.position.set(pos.x, -0.2, pos.z);
            platform.receiveShadow = true;
            platform.castShadow = true;
            this.scene.add(platform);
        });

        // Ruined buildings around arena
        this.createCityscape();
        
        // Gothic street lamps (flickering)
        this.createStreetLamps();
    }

    createCityscape() {
        const buildings = [
            // North buildings
            { x: -12, z: -20, w: 8, h: 25, d: 6 },
            { x: 4, z: -22, w: 10, h: 30, d: 8 },
            { x: 18, z: -18, w: 6, h: 20, d: 6 },
            
            // South buildings
            { x: -15, z: 20, w: 12, h: 28, d: 10 },
            { x: 8, z: 22, w: 8, h: 22, d: 6 },
            
            // East/West
            { x: -25, z: 0, w: 8, h: 26, d: 8 },
            { x: 25, z: 2, w: 10, h: 32, d: 10 }
        ];

        buildings.forEach(b => {
            // Main building structure
            const buildingGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
            const buildingMat = new THREE.MeshStandardMaterial({
                color: 0x0f0f0f,
                roughness: 0.9,
                metalness: 0.3
            });
            const building = new THREE.Mesh(buildingGeo, buildingMat);
            building.position.set(b.x, b.h / 2, b.z);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);

            // Rust/decay streaks
            const decayGeo = new THREE.PlaneGeometry(b.w * 0.8, b.h * 0.6);
            const decayMat = new THREE.MeshBasicMaterial({
                color: 0x4a3328,
                transparent: true,
                opacity: 0.4
            });
            const decay = new THREE.Mesh(decayGeo, decayMat);
            decay.position.set(b.x, b.h / 2, b.z + b.d / 2 + 0.01);
            this.scene.add(decay);

            // Broken windows (dark holes)
            const windowCount = Math.floor(b.h / 3);
            for (let i = 0; i < windowCount; i++) {
                const windowGeo = new THREE.BoxGeometry(1, 1.5, 0.2);
                const windowMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
                const window1 = new THREE.Mesh(windowGeo, windowMat);
                window1.position.set(
                    b.x - b.w / 3,
                    3 + i * 3,
                    b.z + b.d / 2 + 0.1
                );
                this.scene.add(window1);

                const window2 = new THREE.Mesh(windowGeo, windowMat);
                window2.position.set(
                    b.x + b.w / 3,
                    3 + i * 3,
                    b.z + b.d / 2 + 0.1
                );
                this.scene.add(window2);
            }
        });
    }

    createStreetLamps() {
        const lampPositions = [
            { x: -8, z: -5 },
            { x: 8, z: -5 },
            { x: -8, z: 5 },
            { x: 8, z: 5 }
        ];

        lampPositions.forEach(pos => {
            // Lamp post
            const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 8, 8);
            const postMat = new THREE.MeshStandardMaterial({
                color: 0x2a2a2a,
                roughness: 0.4,
                metalness: 0.8
            });
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(pos.x, 4, pos.z);
            post.castShadow = true;
            this.scene.add(post);

            // Lamp head (flickering red light)
            const lampGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
            const lampMat = new THREE.MeshStandardMaterial({
                color: 0x3d0000,
                emissive: 0x8b0000,
                emissiveIntensity: 0.8
            });
            const lamp = new THREE.Mesh(lampGeo, lampMat);
            lamp.position.set(pos.x, 8, pos.z);
            this.scene.add(lamp);

            // Point light (flickering)
            const light = new THREE.PointLight(0x8b0000, 1, 15);
            light.position.set(pos.x, 8, pos.z);
            this.scene.add(light);

            // Flicker animation
            setInterval(() => {
                light.intensity = 0.5 + Math.random() * 1.5;
                lampMat.emissiveIntensity = 0.4 + Math.random() * 0.8;
            }, 100 + Math.random() * 200);
        });
    }

    createAgent(id, zone, color) {
        const group = new THREE.Group();
        const pos = this.zones[zone];

        // Hunched creature body (horror aesthetic)
        const torsoGeo = new THREE.BoxGeometry(1.5, 2, 1);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: color === 0x8b0000 ? 0x2a0000 : 0x1a3d1a,
            roughness: 0.9,
            metalness: 0.1,
            emissive: color,
            emissiveIntensity: 0.2
        });
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        torso.castShadow = true;
        torso.position.set(0, 1.5, 0.3); // Hunched forward
        torso.rotation.x = 0.2;
        group.add(torso);

        // Head (skull-like)
        const headGeo = new THREE.BoxGeometry(0.8, 0.8, 1);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.set(0, 2.8, 0.5);
        head.castShadow = true;
        group.add(head);

        // Spine/back spikes (horror detail)
        for (let i = 0; i < 3; i++) {
            const spikeGeo = new THREE.ConeGeometry(0.15, 0.6, 4);
            const spikeMat = new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                roughness: 0.3,
                metalness: 0.7
            });
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.rotation.x = Math.PI;
            spike.position.set(0, 1.5 + i * 0.5, -0.3);
            group.add(spike);
        }

        // Arms (long, reaching)
        const armGeo = new THREE.BoxGeometry(0.3, 1.8, 0.3);
        const leftArm = new THREE.Mesh(armGeo, bodyMat);
        leftArm.position.set(-0.9, 1.5, 0.3);
        leftArm.rotation.z = 0.3;
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, bodyMat);
        rightArm.position.set(0.9, 1.5, 0.3);
        rightArm.rotation.z = -0.3;
        rightArm.castShadow = true;
        group.add(rightArm);

        // Claws/weapons
        const clawGeo = new THREE.ConeGeometry(0.2, 1, 4);
        const clawMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0x8b0000,
            emissiveIntensity: 0.3
        });
        const leftClaw = new THREE.Mesh(clawGeo, clawMat);
        leftClaw.rotation.x = Math.PI / 2;
        leftClaw.position.set(-1.2, 0.8, 0.8);
        leftClaw.castShadow = true;
        group.add(leftClaw);

        const rightClaw = new THREE.Mesh(clawGeo, clawMat);
        rightClaw.rotation.x = Math.PI / 2;
        rightClaw.position.set(1.2, 0.8, 0.8);
        rightClaw.castShadow = true;
        group.add(rightClaw);

        // Glowing eyes (horror)
        const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({
            color: color,
            emissive: color
        });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
        eye1.position.set(-0.25, 2.9, 1.2);
        group.add(eye1);
        
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
        eye2.position.set(0.25, 2.9, 1.2);
        group.add(eye2);

        // Blood/gore dripping
        const dripGeo = new THREE.ConeGeometry(0.1, 0.4, 4);
        const dripMat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
        for (let i = 0; i < 3; i++) {
            const drip = new THREE.Mesh(dripGeo, dripMat);
            drip.position.set(
                (Math.random() - 0.5) * 1.5,
                0.5 + Math.random() * 1.5,
                0.8
            );
            group.add(drip);
        }

        group.position.set(pos.x, 0, pos.z);
        this.scene.add(group);

        return {
            id: id,
            mesh: group,
            body: torso,
            weapon: rightClaw,
            zone: zone,
            targetPos: { x: pos.x, z: pos.z },
            isMoving: false,
            isAttacking: false
        };
    }

    initializeAgents() {
        const agent1 = this.engine.initializeAgent('Aggressor', 'NORTH1');
        const agent2 = this.engine.initializeAgent('Defender', 'SOUTH2');

        agent1.visual = this.createAgent('Aggressor', 'NORTH1', 0x8b0000);
        agent2.visual = this.createAgent('Defender', 'SOUTH2', 0x1b5e20);

        this.agents = new Map([
            ['Aggressor', agent1],
            ['Defender', agent2]
        ]);

        this.updateUI();
        this.addLog('BATTLE INITIALIZED - 0.1 SOL stake per agent');
    }

    updateUI() {
        this.agents.forEach((agent, id) => {
            const num = id === 'Aggressor' ? '1' : '2';
            const healthPct = Math.round(agent.health * 100);
            
            document.getElementById(`agent${num}Name`).textContent = id;
            document.getElementById(`agent${num}Health`).style.width = (agent.health * 100) + '%';
            document.getElementById(`agent${num}HealthText`).textContent = `${healthPct}%`;
            document.getElementById(`agent${num}Kills`).textContent = agent.stats.kills;
            document.getElementById(`agent${num}Damage`).textContent = Math.round(agent.stats.damageDealt * 100) + '%';
        });
    }

    addLog(message, type = 'normal') {
        const log = document.getElementById('combatLog');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = this.round > 0 ? `[R${this.round}] ${message}` : message;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;

        while (log.children.length > 30) {
            log.removeChild(log.firstChild);
        }
    }

    async moveAgent(agent, newZone) {
        const targetPos = this.zones[newZone];
        agent.zone = newZone;
        agent.visual.targetPos = { x: targetPos.x, z: targetPos.z };
        agent.visual.isMoving = true;

        this.addLog(`${agent.id} moving to ${newZone}`);

        // Wait for movement animation
        await this.sleep(800);
        agent.visual.isMoving = false;
    }

    async attackAgent(attacker, defender, abilityName) {
        // Trigger attack animation
        attacker.visual.isAttacking = true;
        
        // Face target
        const dx = defender.visual.mesh.position.x - attacker.visual.mesh.position.x;
        const dz = defender.visual.mesh.position.z - attacker.visual.mesh.position.z;
        const angle = Math.atan2(dx, dz);
        attacker.visual.mesh.rotation.y = angle;

        await this.sleep(200);

        // Apply damage
        const result = this.engine.applyDamage(attacker, defender, 
            this.engine.abilities[abilityName].damage, abilityName);

        // Blood particles
        this.spawnBlood(
            defender.visual.mesh.position.x,
            defender.visual.mesh.position.y + 2,
            defender.visual.mesh.position.z,
            result.damage * 40
        );

        // Damage feedback
        this.shakeCamera(result.damage * 10);

        const msg = `${attacker.id} ${abilityName} ${defender.id} for ${Math.round(result.damage * 100)}%`;
        this.addLog(result.critical ? `💥 CRIT! ${msg}` : msg);

        if (result.killed) {
            defender.visual.mesh.visible = false;
            this.addLog(`💀 ${attacker.id} KILLED ${defender.id}!`, 'kill');
            
            // Massive blood explosion
            this.spawnBlood(
                defender.visual.mesh.position.x,
                defender.visual.mesh.position.y + 2,
                defender.visual.mesh.position.z,
                100
            );
            
            return true;
        }

        await this.sleep(300);
        attacker.visual.isAttacking = false;

        this.updateUI();
        return false;
    }

    spawnBlood(x, y, z, count) {
        for (let i = 0; i < count; i++) {
            const geo = new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
            const particle = new THREE.Mesh(geo, mat);

            particle.position.set(x, y, z);
            
            // Random velocity
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.3
            );
            
            particle.life = 2 + Math.random();
            
            this.scene.add(particle);
            this.bloodParticles.push(particle);
        }
    }

    shakeCamera(intensity) {
        const originalPos = this.camera.position.clone();
        const shakeAmount = intensity * 0.05;
        
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.camera.position.x = originalPos.x + (Math.random() - 0.5) * shakeAmount;
                this.camera.position.y = originalPos.y + (Math.random() - 0.5) * shakeAmount;
                
                if (i === 9) {
                    this.camera.position.copy(originalPos);
                }
            }, i * 30);
        }
    }

    async runRound() {
        this.round++;
        const aggressor = this.agents.get('Aggressor');
        const defender = this.agents.get('Defender');

        if (!aggressor.alive || !defender.alive) return true;

        await this.sleep(1000);

        // Aggressor AI
        const distance = this.engine.getDistance(aggressor.zone, defender.zone);
        
        if (distance <= 1 && this.engine.isInRange(aggressor, defender, 'BLOODSTRIKE')) {
            const killed = await this.attackAgent(aggressor, defender, 'BLOODSTRIKE');
            if (killed) return true;
        } else {
            const newZone = this.getCloserZone(aggressor.zone, defender.zone);
            await this.moveAgent(aggressor, newZone);
        }

        await this.sleep(800);

        // Defender AI
        if (!defender.alive) return true;

        if (distance <= 1 && Math.random() > 0.4) {
            const killed = await this.attackAgent(defender, aggressor, 'IRONSLAM');
            if (killed) return true;
        } else if (this.engine.canUseAbility(defender, 'FORTIFY') && defender.health < 0.6) {
            this.engine.useAbility(defender, 'FORTIFY');
            this.addLog(`${defender.id} used FORTIFY`);
        }

        this.engine.tickCooldowns(aggressor);
        this.engine.tickCooldowns(defender);

        this.updateUI();
        return false;
    }

    getCloserZone(from, to) {
        const adjacency = {
            'CENTER': ['NORTH1', 'NORTH2', 'SOUTH1', 'SOUTH2'],
            'NORTH1': ['CENTER', 'NORTH2'],
            'NORTH2': ['CENTER', 'NORTH1', 'SOUTH2'],
            'SOUTH1': ['CENTER', 'SOUTH2'],
            'SOUTH2': ['CENTER', 'SOUTH1', 'NORTH2']
        };

        const neighbors = adjacency[from] || [];
        if (neighbors.length === 0) return from;

        let closest = neighbors[0];
        let minDist = this.engine.getDistance(neighbors[0], to);

        for (const zone of neighbors) {
            const dist = this.engine.getDistance(zone, to);
            if (dist < minDist) {
                minDist = dist;
                closest = zone;
            }
        }

        return closest;
    }

    async startBattle() {
        if (this.battleActive) return;

        this.battleActive = true;
        this.round = 0;
        this.addLog('⚔️ BATTLE STARTED', 'kill');

        while (this.battleActive && this.round < 40) {
            const battleOver = await this.runRound();
            if (battleOver) break;
        }

        this.endBattle();
    }

    endBattle() {
        this.battleActive = false;
        const aggressor = this.agents.get('Aggressor');
        const defender = this.agents.get('Defender');

        const winner = aggressor.alive ? aggressor : (defender.alive ? defender : null);
        if (!winner) return;

        const payout = this.engine.calculatePayout(winner.id);

        const banner = document.createElement('div');
        banner.className = 'winner-banner';
        banner.innerHTML = `
            <h2>💀 VICTORY 💀</h2>
            <div style="font-size: 2em; color: var(--blood-glow); margin: 20px 0;">${winner.id}</div>
            <div style="color: var(--text-primary); font-size: 1.2em; line-height: 2;">
                Final Health: ${Math.round(winner.health * 100)}%<br>
                Kills: ${winner.stats.kills}<br>
                Damage: ${Math.round(winner.stats.damageDealt * 100)}%<br>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--blood-fresh);">
                    <div style="color: var(--rot-glow);">💰 PAYOUT</div>
                    Winner Receives: <span style="color: var(--rot-glow); font-weight: 700;">${payout.payout.toFixed(2)} SOL</span><br>
                    Profit: <span style="color: var(--rot-glow); font-weight: 700;">+${payout.profit.toFixed(2)} SOL</span>
                </div>
            </div>
            <button onclick="this.parentElement.remove()" style="margin-top: 20px;">CLOSE</button>
        `;
        document.getElementById('ui-overlay').appendChild(banner);

        this.addLog(`🏆 ${winner.id} WINS! +${payout.profit.toFixed(2)} SOL profit`, 'kill');
    }

    reset() {
        // Clear agents
        this.agents.forEach(agent => {
            if (agent.visual && agent.visual.mesh) {
                this.scene.remove(agent.visual.mesh);
            }
        });

        // Clear blood
        this.bloodParticles.forEach(p => this.scene.remove(p));
        this.bloodParticles = [];

        // Clear UI
        document.querySelectorAll('.winner-banner').forEach(el => el.remove());
        document.getElementById('combatLog').innerHTML = 
            '<div class="log-entry">SYSTEM: Arena reset.</div>';

        this.agents.clear();
        this.round = 0;
        this.battleActive = false;

        this.initializeAgents();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update agent positions (smooth movement)
        this.agents.forEach(agent => {
            if (agent.visual && agent.visual.isMoving) {
                const mesh = agent.visual.mesh;
                const target = agent.visual.targetPos;
                
                mesh.position.x += (target.x - mesh.position.x) * 0.1;
                mesh.position.z += (target.z - mesh.position.z) * 0.1;
            }

            // Attack animation
            if (agent.visual && agent.visual.isAttacking) {
                agent.visual.weapon.rotation.z += 0.3;
            } else if (agent.visual) {
                agent.visual.weapon.rotation.z = -Math.PI / 2;
            }

            // Idle animation (subtle rotation)
            if (agent.visual && !agent.visual.isMoving && !agent.visual.isAttacking) {
                agent.visual.body.rotation.y += 0.01;
            }
        });

        // Update blood particles
        this.bloodParticles = this.bloodParticles.filter(particle => {
            particle.life -= 0.016;
            
            if (particle.life <= 0) {
                this.scene.remove(particle);
                return false;
            }

            // Physics
            particle.velocity.y -= 0.02; // Gravity
            particle.position.add(particle.velocity);

            // Fade out
            particle.material.opacity = particle.life / 2;
            particle.material.transparent = true;

            return true;
        });

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize
let arena;
window.addEventListener('load', () => {
    arena = new Arena3D();
    arena.initializeAgents();
});
