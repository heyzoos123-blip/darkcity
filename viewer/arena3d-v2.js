// DARKCITY 3D Arena V2 - Diablo/Gauntlet Inspired

class Arena3D {
    constructor() {
        this.engine = new CombatEngine();
        this.agents = new Map();
        this.round = 0;
        this.battleActive = false;
        
        this.initScene();
        this.initLights();
        this.initArena();
        this.initPostProcessing();
        this.animate();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x0a0000, 0.05);

        // ISOMETRIC CAMERA (Diablo-style)
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(20, 25, 20); // Isometric angle
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.5;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.bloodParticles = [];
        this.gibParticles = [];
    }

    initPostProcessing() {
        // Blood overlay on screen
        this.bloodOverlay = document.createElement('div');
        this.bloodOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            background: radial-gradient(circle at 50% 50%, transparent 40%, rgba(139, 0, 0, 0) 100%);
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 99;
        `;
        document.body.appendChild(this.bloodOverlay);
    }

    flashBloodScreen(intensity) {
        this.bloodOverlay.style.opacity = intensity;
        setTimeout(() => {
            this.bloodOverlay.style.opacity = 0;
        }, 200);
    }

    initLights() {
        const ambient = new THREE.AmbientLight(0x1a0000, 0.2);
        this.scene.add(ambient);

        const moon = new THREE.DirectionalLight(0x5a0000, 1.2);
        moon.position.set(10, 40, 10);
        moon.castShadow = true;
        moon.shadow.mapSize.width = 4096;
        moon.shadow.mapSize.height = 4096;
        moon.shadow.camera.far = 100;
        moon.shadow.camera.left = -30;
        moon.shadow.camera.right = 30;
        moon.shadow.camera.top = 30;
        moon.shadow.camera.bottom = -30;
        this.scene.add(moon);

        // Rim lights for character definition
        const rim1 = new THREE.DirectionalLight(0x8b0000, 0.6);
        rim1.position.set(-20, 10, -20);
        this.scene.add(rim1);

        const rim2 = new THREE.DirectionalLight(0x1a3d1a, 0.4);
        rim2.position.set(20, 10, 20);
        this.scene.add(rim2);
    }

    initArena() {
        // Cracked city street
        const floorGeo = new THREE.PlaneGeometry(60, 60, 20, 20);
        const vertices = floorGeo.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] += (Math.random() - 0.5) * 0.5;
        }
        floorGeo.computeVertexNormals();
        
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0f0f0f,
            roughness: 1.0,
            metalness: 0.0
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Combat zones
        this.zones = {
            'CENTER': { x: 0, z: 0 },
            'NORTH1': { x: -7, z: -10 },
            'NORTH2': { x: 7, z: -10 },
            'SOUTH1': { x: -7, z: 10 },
            'SOUTH2': { x: 7, z: 10 }
        };

        // Ruined cityscape
        this.createCityscape();
        
        // Blood pools
        this.bloodPools = [];
        for (let i = 0; i < 15; i++) {
            const poolGeo = new THREE.CircleGeometry(1 + Math.random() * 2, 16);
            const poolMat = new THREE.MeshBasicMaterial({
                color: 0x3d0000,
                transparent: true,
                opacity: 0.7
            });
            const pool = new THREE.Mesh(poolGeo, poolMat);
            pool.rotation.x = -Math.PI / 2;
            pool.position.set(
                (Math.random() - 0.5) * 40,
                0.02,
                (Math.random() - 0.5) * 40
            );
            this.scene.add(pool);
            this.bloodPools.push(pool);
        }
    }

    createCityscape() {
        const buildings = [
            { x: -18, z: -25, w: 12, h: 35, d: 10 },
            { x: 8, z: -28, w: 15, h: 40, d: 12 },
            { x: 22, z: -20, w: 10, h: 30, d: 10 },
            { x: -20, z: 25, w: 14, h: 38, d: 12 },
            { x: 12, z: 28, w: 12, h: 32, d: 10 },
            { x: -30, z: 0, w: 10, h: 36, d: 10 },
            { x: 30, z: 3, w: 12, h: 42, d: 12 }
        ];

        buildings.forEach(b => {
            const buildingGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
            const buildingMat = new THREE.MeshStandardMaterial({
                color: 0x0a0a0a,
                roughness: 0.95,
                metalness: 0.2
            });
            const building = new THREE.Mesh(buildingGeo, buildingMat);
            building.position.set(b.x, b.h / 2, b.z);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);

            // Windows
            const windowRows = Math.floor(b.h / 4);
            for (let i = 0; i < windowRows; i++) {
                for (let j = 0; j < 3; j++) {
                    const windowGeo = new THREE.PlaneGeometry(1.2, 2);
                    const windowMat = new THREE.MeshBasicMaterial({ 
                        color: Math.random() > 0.8 ? 0x3d0000 : 0x000000 
                    });
                    const window1 = new THREE.Mesh(windowGeo, windowMat);
                    window1.position.set(
                        b.x + (j - 1) * (b.w / 4),
                        4 + i * 4,
                        b.z + b.d / 2 + 0.1
                    );
                    this.scene.add(window1);
                }
            }
        });
    }

    createAgent(id, zone, colorScheme) {
        const group = new THREE.Group();
        const pos = this.zones[zone];

        // Diablo-style character (hulking brute)
        const torsoGeo = new THREE.CylinderGeometry(1, 1.4, 2.5, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: colorScheme.body,
            roughness: 0.9,
            metalness: 0.1,
            emissive: colorScheme.glow,
            emissiveIntensity: 0.3
        });
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        torso.position.y = 1.8;
        torso.castShadow = true;
        group.add(torso);

        // Massive shoulders
        const shoulderGeo = new THREE.BoxGeometry(3, 0.8, 1.2);
        const shoulders = new THREE.Mesh(shoulderGeo, bodyMat);
        shoulders.position.y = 3;
        shoulders.castShadow = true;
        group.add(shoulders);

        // Head (small, brutal)
        const headGeo = new THREE.BoxGeometry(0.9, 1, 1);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 3.9;
        head.castShadow = true;
        group.add(head);

        // Horns/spikes
        const hornGeo = new THREE.ConeGeometry(0.2, 1, 4);
        const hornMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.3,
            metalness: 0.8
        });
        const horn1 = new THREE.Mesh(hornGeo, hornMat);
        horn1.position.set(-0.5, 4.5, 0.3);
        horn1.rotation.z = -0.3;
        group.add(horn1);
        
        const horn2 = new THREE.Mesh(hornGeo, hornMat);
        horn2.position.set(0.5, 4.5, 0.3);
        horn2.rotation.z = 0.3;
        group.add(horn2);

        // Arms (massive)
        const armGeo = new THREE.CylinderGeometry(0.4, 0.5, 2.5, 6);
        const leftArm = new THREE.Mesh(armGeo, bodyMat);
        leftArm.position.set(-1.8, 2.2, 0);
        leftArm.rotation.z = 0.4;
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, bodyMat);
        rightArm.position.set(1.8, 2.2, 0);
        rightArm.rotation.z = -0.4;
        rightArm.castShadow = true;
        group.add(rightArm);

        // Weapons (huge brutal blades)
        const weaponGeo = new THREE.BoxGeometry(0.3, 3, 0.8);
        const weaponMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.2,
            metalness: 0.95,
            emissive: 0x8b0000,
            emissiveIntensity: 0.5
        });
        const leftWeapon = new THREE.Mesh(weaponGeo, weaponMat);
        leftWeapon.position.set(-2.3, 0.8, 0.5);
        leftWeapon.rotation.x = -0.5;
        leftWeapon.castShadow = true;
        group.add(leftWeapon);

        const rightWeapon = new THREE.Mesh(weaponGeo, weaponMat);
        rightWeapon.position.set(2.3, 0.8, 0.5);
        rightWeapon.rotation.x = -0.5;
        rightWeapon.castShadow = true;
        group.add(rightWeapon);

        // Glowing eyes
        const eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({
            color: colorScheme.eyes,
            emissive: colorScheme.eyes
        });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
        eye1.position.set(-0.3, 4, 0.8);
        group.add(eye1);
        
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
        eye2.position.set(0.3, 4, 0.8);
        group.add(eye2);

        // Blood/gore texture
        for (let i = 0; i < 8; i++) {
            const splatterGeo = new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 4, 4);
            const splatterMat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
            const splatter = new THREE.Mesh(splatterGeo, splatterMat);
            splatter.position.set(
                (Math.random() - 0.5) * 2,
                Math.random() * 3,
                (Math.random() - 0.5) + 0.8
            );
            group.add(splatter);
        }

        group.position.set(pos.x, 0, pos.z);
        this.scene.add(group);

        return {
            id: id,
            mesh: group,
            body: torso,
            leftWeapon: leftWeapon,
            rightWeapon: rightWeapon,
            zone: zone,
            targetPos: { x: pos.x, z: pos.z },
            isMoving: false,
            isAttacking: false,
            attackTimer: 0
        };
    }

    initializeAgents() {
        const agent1 = this.engine.initializeAgent('Aggressor', 'NORTH1');
        const agent2 = this.engine.initializeAgent('Defender', 'SOUTH2');

        agent1.visual = this.createAgent('Aggressor', 'NORTH1', {
            body: 0x2a0000,
            glow: 0x8b0000,
            eyes: 0xff0000
        });
        
        agent2.visual = this.createAgent('Defender', 'SOUTH2', {
            body: 0x1a2a1a,
            glow: 0x1b5e20,
            eyes: 0x00ff00
        });

        this.agents = new Map([
            ['Aggressor', agent1],
            ['Defender', agent2]
        ]);

        this.updateUI();
        this.addLog('DARKCITY INITIALIZED - 0.1 SOL per combatant');
    }

    updateUI() {
        this.agents.forEach((agent, id) => {
            const num = id === 'Aggressor' ? '1' : '2';
            const healthPct = Math.round(agent.health * 100);
            
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

        while (log.children.length > 25) {
            log.removeChild(log.firstChild);
        }
    }

    async moveAgent(agent, newZone) {
        const targetPos = this.zones[newZone];
        agent.zone = newZone;
        agent.visual.targetPos = { x: targetPos.x, z: targetPos.z };
        agent.visual.isMoving = true;

        this.addLog(`${agent.id} advancing to ${newZone}`);
        await this.sleep(600);
        agent.visual.isMoving = false;
    }

    async attackAgent(attacker, defender, abilityName) {
        attacker.visual.isAttacking = true;
        attacker.visual.attackTimer = 0;
        
        // Face target
        const dx = defender.visual.mesh.position.x - attacker.visual.mesh.position.x;
        const dz = defender.visual.mesh.position.z - attacker.visual.mesh.position.z;
        const angle = Math.atan2(dx, dz);
        attacker.visual.mesh.rotation.y = angle;

        await this.sleep(150);

        const result = this.engine.applyDamage(attacker, defender, 
            this.engine.abilities[abilityName].damage, abilityName);

        // MASSIVE GORE
        this.spawnBloodExplosion(
            defender.visual.mesh.position.x,
            defender.visual.mesh.position.y + 2,
            defender.visual.mesh.position.z,
            result.damage * 60
        );

        // Screen effects
        this.flashBloodScreen(result.damage * 0.8);
        this.shakeCamera(result.damage * 15);

        // Impact flash
        this.createImpactFlash(defender.visual.mesh.position);

        const msg = `${attacker.id} ${abilityName} ${defender.id} for ${Math.round(result.damage * 100)}%`;
        this.addLog(result.critical ? `💥 CRITICAL! ${msg}` : msg);

        if (result.killed) {
            await this.dismemberAgent(defender);
            this.addLog(`💀 ${attacker.id} SLAUGHTERED ${defender.id}!`, 'kill');
            return true;
        }

        await this.sleep(250);
        attacker.visual.isAttacking = false;

        this.updateUI();
        return false;
    }

    async dismemberAgent(agent) {
        // Hide main body
        agent.visual.mesh.visible = false;

        // Create gibs/chunks
        const pos = agent.visual.mesh.position;
        
        for (let i = 0; i < 30; i++) {
            const gibGeo = new THREE.BoxGeometry(
                0.2 + Math.random() * 0.4,
                0.2 + Math.random() * 0.4,
                0.2 + Math.random() * 0.4
            );
            const gibMat = new THREE.MeshStandardMaterial({
                color: Math.random() > 0.5 ? 0x8b0000 : 0x3d0000,
                roughness: 0.9
            });
            const gib = new THREE.Mesh(gibGeo, gibMat);
            gib.position.set(pos.x, pos.y + 2, pos.z);
            
            gib.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                Math.random() * 0.4,
                (Math.random() - 0.5) * 0.4
            );
            gib.angularVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            gib.life = 3 + Math.random() * 2;
            gib.castShadow = true;
            
            this.scene.add(gib);
            this.gibParticles.push(gib);
        }

        // Blood pool grows
        const poolGeo = new THREE.CircleGeometry(4, 16);
        const poolMat = new THREE.MeshBasicMaterial({
            color: 0x3d0000,
            transparent: true,
            opacity: 0
        });
        const pool = new THREE.Mesh(poolGeo, poolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(pos.x, 0.01, pos.z);
        this.scene.add(pool);

        // Fade in pool
        for (let i = 0; i < 10; i++) {
            await this.sleep(50);
            pool.material.opacity = i / 10 * 0.9;
        }
    }

    spawnBloodExplosion(x, y, z, count) {
        for (let i = 0; i < count; i++) {
            const size = 0.08 + Math.random() * 0.2;
            const geo = new THREE.SphereGeometry(size, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ 
                color: Math.random() > 0.3 ? 0x8b0000 : 0xff0000 
            });
            const particle = new THREE.Mesh(geo, mat);

            particle.position.set(x, y, z);
            
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.4,
                (Math.random() - 0.5) * 0.5
            );
            
            particle.life = 1.5 + Math.random() * 1.5;
            particle.castShadow = true;
            
            this.scene.add(particle);
            this.bloodParticles.push(particle);
        }
    }

    createImpactFlash(position) {
        const flashGeo = new THREE.SphereGeometry(2, 8, 8);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.copy(position);
        this.scene.add(flash);

        let scale = 0;
        const animate = () => {
            scale += 0.3;
            flash.scale.set(scale, scale, scale);
            flash.material.opacity = 0.8 - (scale / 3);
            
            if (scale < 3) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(flash);
            }
        };
        animate();
    }

    shakeCamera(intensity) {
        const originalPos = this.camera.position.clone();
        const shakeAmount = Math.min(intensity * 0.08, 2);
        
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                this.camera.position.x = originalPos.x + (Math.random() - 0.5) * shakeAmount;
                this.camera.position.y = originalPos.y + (Math.random() - 0.5) * shakeAmount;
                
                if (i === 11) {
                    this.camera.position.copy(originalPos);
                }
            }, i * 25);
        }
    }

    async runRound() {
        this.round++;
        const aggressor = this.agents.get('Aggressor');
        const defender = this.agents.get('Defender');

        if (!aggressor.alive || !defender.alive) return true;

        await this.sleep(800);

        const distance = this.engine.getDistance(aggressor.zone, defender.zone);
        
        if (distance <= 1) {
            const killed = await this.attackAgent(aggressor, defender, 'BLOODSTRIKE');
            if (killed) return true;
        } else {
            const newZone = this.getCloserZone(aggressor.zone, defender.zone);
            await this.moveAgent(aggressor, newZone);
        }

        await this.sleep(600);

        if (!defender.alive) return true;

        if (distance <= 1 && Math.random() > 0.3) {
            const killed = await this.attackAgent(defender, aggressor, 'IRONSLAM');
            if (killed) return true;
        } else if (this.engine.canUseAbility(defender, 'FORTIFY') && defender.health < 0.6) {
            this.engine.useAbility(defender, 'FORTIFY');
            this.addLog(`${defender.id} FORTIFIED`);
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
        if (!neighbors.length) return from;

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
        this.addLog('⚔️ BATTLE COMMENCED', 'kill');

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
            <div style="font-size: 2.2em; color: var(--blood-glow); margin: 20px 0; font-weight: 700;">${winner.id}</div>
            <div style="color: var(--text-primary); font-size: 1.2em; line-height: 2;">
                Health: ${Math.round(winner.health * 100)}%<br>
                Kills: ${winner.stats.kills}<br>
                Damage: ${Math.round(winner.stats.damageDealt * 100)}%<br>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--blood-fresh);">
                    <div style="color: var(--rot-glow); font-size: 1.1em;">💰 PAYOUT</div>
                    Winner: <span style="color: var(--rot-glow); font-weight: 700;">${payout.payout.toFixed(2)} SOL</span><br>
                    Profit: <span style="color: var(--rot-glow); font-weight: 700;">+${payout.profit.toFixed(2)} SOL</span>
                </div>
            </div>
            <button onclick="this.parentElement.remove()" style="margin-top: 20px;">CLOSE</button>
        `;
        document.getElementById('ui-overlay').appendChild(banner);

        this.addLog(`🏆 ${winner.id} VICTORIOUS! +${payout.profit.toFixed(2)} SOL`, 'kill');
    }

    reset() {
        this.agents.forEach(agent => {
            if (agent.visual?.mesh) this.scene.remove(agent.visual.mesh);
        });

        this.bloodParticles.forEach(p => this.scene.remove(p));
        this.gibParticles.forEach(p => this.scene.remove(p));
        this.bloodParticles = [];
        this.gibParticles = [];

        document.querySelectorAll('.winner-banner').forEach(el => el.remove());
        document.getElementById('combatLog').innerHTML = 
            '<div class="log-entry">SYSTEM: Arena cleansed.</div>';

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

        this.agents.forEach(agent => {
            if (!agent.visual) return;

            // Movement
            if (agent.visual.isMoving) {
                const mesh = agent.visual.mesh;
                const target = agent.visual.targetPos;
                
                mesh.position.x += (target.x - mesh.position.x) * 0.15;
                mesh.position.z += (target.z - mesh.position.z) * 0.15;

                // Bob animation
                mesh.position.y = Math.sin(Date.now() * 0.01) * 0.1;
            }

            // Attack animation
            if (agent.visual.isAttacking) {
                agent.visual.attackTimer += 0.3;
                agent.visual.leftWeapon.rotation.x = -0.5 + Math.sin(agent.visual.attackTimer) * 1.5;
                agent.visual.rightWeapon.rotation.x = -0.5 + Math.sin(agent.visual.attackTimer + Math.PI) * 1.5;
            } else {
                agent.visual.leftWeapon.rotation.x = -0.5;
                agent.visual.rightWeapon.rotation.x = -0.5;
            }

            // Idle breathing
            if (!agent.visual.isMoving && !agent.visual.isAttacking) {
                agent.visual.body.scale.y = 1 + Math.sin(Date.now() * 0.002) * 0.05;
            }
        });

        // Blood particles
        this.bloodParticles = this.bloodParticles.filter(particle => {
            particle.life -= 0.016;
            
            if (particle.life <= 0) {
                this.scene.remove(particle);
                return false;
            }

            particle.velocity.y -= 0.03;
            particle.position.add(particle.velocity);

            if (particle.position.y < 0.1) {
                particle.position.y = 0.1;
                particle.velocity.multiplyScalar(0.3);
            }

            particle.material.opacity = Math.min(1, particle.life);
            particle.material.transparent = true;

            return true;
        });

        // Gibs
        this.gibParticles = this.gibParticles.filter(gib => {
            gib.life -= 0.016;
            
            if (gib.life <= 0) {
                this.scene.remove(gib);
                return false;
            }

            gib.velocity.y -= 0.04;
            gib.position.add(gib.velocity);
            gib.rotation.x += gib.angularVelocity.x;
            gib.rotation.y += gib.angularVelocity.y;
            gib.rotation.z += gib.angularVelocity.z;

            if (gib.position.y < 0.1) {
                gib.position.y = 0.1;
                gib.velocity.multiplyScalar(0.2);
                gib.angularVelocity.multiplyScalar(0.5);
            }

            return true;
        });

        this.renderer.render(this.scene, this.camera);
    }
}

let arena;
window.addEventListener('load', () => {
    arena = new Arena3D();
    arena.initializeAgents();
});
