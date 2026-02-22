// DARKCITY - Gauntlet Legends Style Dungeon Crawler

class DungeonArena {
    constructor() {
        this.engine = new CombatEngine();
        this.agents = new Map();
        this.round = 0;
        this.battleActive = false;
        
        this.initScene();
        this.initLights();
        this.initDungeon();
        this.animate();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.Fog(0x0a0000, 5, 35);

        // CLOSE camera (see the combat clearly)
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            200
        );
        this.camera.position.set(0, 12, 10); // Much closer
        this.camera.lookAt(0, 1, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: false }); // Retro low-poly look
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap; // Sharper shadows (N64 style)
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.bloodParticles = [];
        this.gibParticles = [];
    }

    initLights() {
        // Very dark ambient
        const ambient = new THREE.AmbientLight(0x1a0808, 0.15);
        this.scene.add(ambient);

        // Overhead dim light
        const overhead = new THREE.DirectionalLight(0x3d1a1a, 0.4);
        overhead.position.set(0, 30, 0);
        overhead.castShadow = true;
        overhead.shadow.mapSize.width = 1024;
        overhead.shadow.mapSize.height = 1024;
        this.scene.add(overhead);
    }

    initDungeon() {
        // CITY STREET (cracked asphalt)
        const floorGeo = new THREE.PlaneGeometry(40, 40, 10, 10);
        const vertices = floorGeo.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] += (Math.random() - 0.5) * 0.3; // Cracks
        }
        floorGeo.computeVertexNormals();
        
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 1.0,
            metalness: 0.0,
            flatShading: true
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Blood stains on street
        for (let i = 0; i < 15; i++) {
            const stainGeo = new THREE.CircleGeometry(1 + Math.random() * 2, 8);
            const stainMat = new THREE.MeshBasicMaterial({
                color: 0x3d0000,
                transparent: true,
                opacity: 0.8
            });
            const stain = new THREE.Mesh(stainGeo, stainMat);
            stain.rotation.x = -Math.PI / 2;
            stain.position.set(
                (Math.random() - 0.5) * 30,
                0.01,
                (Math.random() - 0.5) * 30
            );
            this.scene.add(stain);
        }

        // CITY BUILDINGS (low-poly, surrounding arena)
        const buildings = [
            { x: -15, z: -15, w: 8, h: 18, d: 6 },
            { x: 15, z: -15, w: 10, h: 22, d: 8 },
            { x: -15, z: 15, w: 12, h: 20, d: 10 },
            { x: 15, z: 15, w: 8, h: 16, d: 6 }
        ];

        buildings.forEach(b => {
            const buildingGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
            const buildingMat = new THREE.MeshStandardMaterial({
                color: 0x0f0f0f,
                roughness: 0.9,
                flatShading: true
            });
            const building = new THREE.Mesh(buildingGeo, buildingMat);
            building.position.set(b.x, b.h / 2, b.z);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);

            // Windows (dark)
            for (let i = 0; i < 4; i++) {
                const windowGeo = new THREE.BoxGeometry(1.5, 2, 0.2);
                const windowMat = new THREE.MeshBasicMaterial({ 
                    color: Math.random() > 0.8 ? 0x3d0000 : 0x000000 
                });
                const win = new THREE.Mesh(windowGeo, windowMat);
                win.position.set(b.x, 4 + i * 4, b.z + b.d / 2 + 0.1);
                this.scene.add(win);
            }
        });

        // STREET LIGHTS (flickering)
        this.torches = [];
        const lightPositions = [
            { x: -10, z: -8 },
            { x: 10, z: -8 },
            { x: -10, z: 8 },
            { x: 10, z: 8 }
        ];

        lightPositions.forEach(pos => {
            // Street lamp post
            const postGeo = new THREE.CylinderGeometry(0.2, 0.2, 7, 6);
            const postMat = new THREE.MeshStandardMaterial({ 
                color: 0x2a2a2a,
                flatShading: true 
            });
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(pos.x, 3.5, pos.z);
            this.scene.add(post);

            // Lamp (blood red)
            const lampGeo = new THREE.BoxGeometry(0.8, 1, 0.8);
            const lampMat = new THREE.MeshBasicMaterial({
                color: 0x8b0000,
                emissive: 0x8b0000
            });
            const lamp = new THREE.Mesh(lampGeo, lampMat);
            lamp.position.set(pos.x, 7, pos.z);
            this.scene.add(lamp);

            // Red light
            const light = new THREE.PointLight(0x8b0000, 2, 12);
            light.position.set(pos.x, 7, pos.z);
            light.castShadow = true;
            this.scene.add(light);

            this.torches.push({ fire: lamp, light });
        });

        // Combat zones
        this.zones = {
            'CENTER': { x: 0, z: 0 },
            'NORTH1': { x: -4, z: -6 },
            'NORTH2': { x: 4, z: -6 },
            'SOUTH1': { x: -4, z: 6 },
            'SOUTH2': { x: 4, z: 6 }
        };

        // Zone markers
        Object.entries(this.zones).forEach(([name, pos]) => {
            const markerGeo = new THREE.RingGeometry(2, 2.3, 8);
            const markerMat = new THREE.MeshBasicMaterial({
                color: name === 'CENTER' ? 0x8b0000 : 0x3a3a3a,
                side: THREE.DoubleSide
            });
            const marker = new THREE.Mesh(markerGeo, markerMat);
            marker.rotation.x = -Math.PI / 2;
            marker.position.set(pos.x, 0.02, pos.z);
            this.scene.add(marker);
        });
    }

    createWarrior(id, zone, colorScheme) {
        const group = new THREE.Group();
        const pos = this.zones[zone];

        // BIGGER LOW-POLY WARRIOR (actually visible!)
        const scale = 1.5; // 50% bigger
        
        // Body (blocky N64 aesthetic)
        const torsoGeo = new THREE.BoxGeometry(1.8 * scale, 2.2 * scale, 1.2 * scale);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: colorScheme.armor,
            roughness: 0.8,
            metalness: 0.3,
            flatShading: true,
            emissive: colorScheme.glow,
            emissiveIntensity: 0.2
        });
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        torso.position.y = 1.8 * scale;
        torso.castShadow = true;
        group.add(torso);

        // Head (blocky helmet)
        const headGeo = new THREE.BoxGeometry(1.2 * scale, 1.2 * scale, 1.2 * scale);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 3.2 * scale;
        head.castShadow = true;
        group.add(head);

        // Horns (bigger)
        const hornGeo = new THREE.ConeGeometry(0.25 * scale, 1.2 * scale, 4);
        const hornMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            flatShading: true
        });
        const horn1 = new THREE.Mesh(hornGeo, hornMat);
        horn1.position.set(-0.6 * scale, 3.8 * scale, 0);
        horn1.rotation.z = -0.4;
        group.add(horn1);
        
        const horn2 = new THREE.Mesh(hornGeo, hornMat);
        horn2.position.set(0.6 * scale, 3.8 * scale, 0);
        horn2.rotation.z = 0.4;
        group.add(horn2);

        // Shoulders (HUGE - gauntlet style)
        const shoulderGeo = new THREE.BoxGeometry(1.2 * scale, 1 * scale, 1 * scale);
        const leftShoulder = new THREE.Mesh(shoulderGeo, bodyMat);
        leftShoulder.position.set(-1.5 * scale, 2.8 * scale, 0);
        leftShoulder.castShadow = true;
        group.add(leftShoulder);

        const rightShoulder = new THREE.Mesh(shoulderGeo, bodyMat);
        rightShoulder.position.set(1.5 * scale, 2.8 * scale, 0);
        rightShoulder.castShadow = true;
        group.add(rightShoulder);

        // Arms (thick)
        const armGeo = new THREE.BoxGeometry(0.6 * scale, 2.2 * scale, 0.6 * scale);
        const leftArm = new THREE.Mesh(armGeo, bodyMat);
        leftArm.position.set(-1.5 * scale, 1.5 * scale, 0);
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, bodyMat);
        rightArm.position.set(1.5 * scale, 1.5 * scale, 0);
        rightArm.castShadow = true;
        group.add(rightArm);

        // MASSIVE WEAPON (very visible)
        const weaponGeo = new THREE.BoxGeometry(0.5 * scale, 4.5 * scale, 1 * scale);
        const weaponMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.2,
            metalness: 1.0,
            emissive: colorScheme.glow,
            emissiveIntensity: 0.6,
            flatShading: true
        });
        const weapon = new THREE.Mesh(weaponGeo, weaponMat);
        weapon.position.set(2.2 * scale, 1.5 * scale, 0.8 * scale);
        weapon.rotation.x = -0.5;
        weapon.castShadow = true;
        group.add(weapon);

        // Eyes (bigger, brighter)
        const eyeGeo = new THREE.BoxGeometry(0.35 * scale, 0.35 * scale, 0.2 * scale);
        const eyeMat = new THREE.MeshBasicMaterial({
            color: colorScheme.eyes,
            emissive: colorScheme.eyes
        });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
        eye1.position.set(-0.4 * scale, 3.3 * scale, 0.7 * scale);
        group.add(eye1);
        
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
        eye2.position.set(0.4 * scale, 3.3 * scale, 0.7 * scale);
        group.add(eye2);

        // Cape
        const capeGeo = new THREE.PlaneGeometry(2 * scale, 2.5 * scale);
        const capeMat = new THREE.MeshStandardMaterial({
            color: colorScheme.cape,
            side: THREE.DoubleSide
        });
        const cape = new THREE.Mesh(capeGeo, capeMat);
        cape.position.set(0, 2.5 * scale, -0.8 * scale);
        group.add(cape);

        group.position.set(pos.x, 0, pos.z);
        this.scene.add(group);

        return {
            id,
            mesh: group,
            body: torso,
            weapon,
            cape,
            zone,
            targetPos: { x: pos.x, z: pos.z },
            isMoving: false,
            isAttacking: false
        };
    }

    initializeAgents() {
        const agent1 = this.engine.initializeAgent('WARRIOR', 'NORTH1');
        const agent2 = this.engine.initializeAgent('DEMON', 'SOUTH2');

        agent1.visual = this.createWarrior('WARRIOR', 'NORTH1', {
            armor: 0x3d0000,
            cape: 0x8b0000,
            glow: 0xff0000,
            eyes: 0xff0000
        });
        
        agent2.visual = this.createWarrior('DEMON', 'SOUTH2', {
            armor: 0x1a3d1a,
            cape: 0x2a5a2a,
            glow: 0x00ff00,
            eyes: 0x00ff00
        });

        this.agents = new Map([
            ['WARRIOR', agent1],
            ['DEMON', agent2]
        ]);

        this.updateUI();
        this.addLog('DUNGEON BATTLE INITIALIZED - 0.1 SOL STAKES');
    }

    updateUI() {
        this.agents.forEach((agent, id) => {
            const num = id === 'WARRIOR' ? '1' : '2';
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

        while (log.children.length > 20) {
            log.removeChild(log.firstChild);
        }
    }

    async moveAgent(agent, newZone) {
        const targetPos = this.zones[newZone];
        agent.zone = newZone;
        agent.visual.targetPos = { x: targetPos.x, z: targetPos.z };
        agent.visual.isMoving = true;

        this.addLog(`${agent.id} advances`);
        await this.sleep(500);
        agent.visual.isMoving = false;
    }

    async attackAgent(attacker, defender, abilityName) {
        attacker.visual.isAttacking = true;
        
        // Face target
        const dx = defender.visual.mesh.position.x - attacker.visual.mesh.position.x;
        const dz = defender.visual.mesh.position.z - attacker.visual.mesh.position.z;
        const angle = Math.atan2(dx, dz);
        attacker.visual.mesh.rotation.y = angle;

        // Lunge forward (visible attack motion)
        const startPos = attacker.visual.mesh.position.clone();
        const lungeTarget = new THREE.Vector3(
            startPos.x + Math.sin(angle) * 1.5,
            startPos.y,
            startPos.z + Math.cos(angle) * 1.5
        );

        // Quick lunge
        for (let i = 0; i < 5; i++) {
            await this.sleep(20);
            attacker.visual.mesh.position.lerp(lungeTarget, 0.3);
        }

        const result = this.engine.applyDamage(attacker, defender, 
            this.engine.abilities[abilityName].damage, abilityName);

        // MASSIVE BLOOD SPRAY
        this.spawnBloodSpray(
            defender.visual.mesh.position.x,
            defender.visual.mesh.position.y + 3,
            defender.visual.mesh.position.z,
            result.damage * 50
        );

        // Big flash
        this.createHitFlash(defender.visual.mesh.position, result.critical ? 3 : 2);

        // Defender knockback
        const knockbackDir = new THREE.Vector3(
            defender.visual.mesh.position.x - attacker.visual.mesh.position.x,
            0,
            defender.visual.mesh.position.z - attacker.visual.mesh.position.z
        ).normalize().multiplyScalar(0.8);
        
        for (let i = 0; i < 3; i++) {
            await this.sleep(30);
            defender.visual.mesh.position.add(knockbackDir.clone().multiplyScalar(0.3));
        }

        const msg = `${attacker.id} hits ${defender.id} for ${Math.round(result.damage * 100)}%!`;
        this.addLog(result.critical ? `💥 CRITICAL! ${msg}` : msg);

        if (result.killed) {
            await this.defeatAgent(defender);
            this.addLog(`💀 ${attacker.id} has slain ${defender.id}!`, 'kill');
            return true;
        }

        // Return to position
        for (let i = 0; i < 5; i++) {
            await this.sleep(20);
            attacker.visual.mesh.position.lerp(startPos, 0.3);
        }

        await this.sleep(100);
        attacker.visual.isAttacking = false;

        this.updateUI();
        return false;
    }

    async defeatAgent(agent) {
        // Death animation - fall over
        const mesh = agent.visual.mesh;
        
        for (let i = 0; i < 10; i++) {
            await this.sleep(30);
            mesh.rotation.x += 0.15;
            mesh.position.y -= 0.3;
        }

        // Blood pool
        const poolGeo = new THREE.CircleGeometry(3, 12);
        const poolMat = new THREE.MeshBasicMaterial({
            color: 0x3d0000,
            transparent: true,
            opacity: 0
        });
        const pool = new THREE.Mesh(poolGeo, poolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(mesh.position.x, 0.01, mesh.position.z);
        this.scene.add(pool);

        for (let i = 0; i < 10; i++) {
            await this.sleep(40);
            pool.material.opacity = i / 10 * 0.8;
        }

        // Scatter gibs
        for (let i = 0; i < 15; i++) {
            const gibGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            const gibMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
            const gib = new THREE.Mesh(gibGeo, gibMat);
            gib.position.set(mesh.position.x, 2, mesh.position.z);
            
            gib.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.3
            );
            gib.life = 2 + Math.random();
            gib.castShadow = true;
            
            this.scene.add(gib);
            this.gibParticles.push(gib);
        }
    }

    spawnBloodSpray(x, y, z, count) {
        for (let i = 0; i < count; i++) {
            const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
            const mat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
            const particle = new THREE.Mesh(geo, mat);

            particle.position.set(x, y, z);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.4
            );
            particle.life = 1 + Math.random();
            
            this.scene.add(particle);
            this.bloodParticles.push(particle);
        }
    }

    createHitFlash(position, size = 2) {
        const flashGeo = new THREE.BoxGeometry(size, size, size);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.9
        });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.copy(position);
        flash.position.y += 2;
        this.scene.add(flash);

        let scale = 1;
        const animate = () => {
            scale += 0.4;
            flash.scale.set(scale, scale, scale);
            flash.material.opacity = 0.9 - (scale / 5);
            
            if (scale < 4) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(flash);
            }
        };
        animate();
    }

    async runRound() {
        this.round++;
        const warrior = this.agents.get('WARRIOR');
        const demon = this.agents.get('DEMON');

        if (!warrior.alive || !demon.alive) return true;

        await this.sleep(600);

        const distance = this.engine.getDistance(warrior.zone, demon.zone);
        
        if (distance <= 1) {
            const killed = await this.attackAgent(warrior, demon, 'BLOODSTRIKE');
            if (killed) return true;
        } else {
            const newZone = this.getCloserZone(warrior.zone, demon.zone);
            await this.moveAgent(warrior, newZone);
        }

        await this.sleep(500);

        if (!demon.alive) return true;

        if (distance <= 1) {
            const killed = await this.attackAgent(demon, warrior, 'BLOODSTRIKE');
            if (killed) return true;
        }

        this.engine.tickCooldowns(warrior);
        this.engine.tickCooldowns(demon);

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
        this.addLog('BATTLE COMMENCES!', 'kill');

        while (this.battleActive && this.round < 40) {
            const battleOver = await this.runRound();
            if (battleOver) break;
        }

        this.endBattle();
    }

    endBattle() {
        this.battleActive = false;
        const warrior = this.agents.get('WARRIOR');
        const demon = this.agents.get('DEMON');

        const winner = warrior.alive ? warrior : (demon.alive ? demon : null);
        if (!winner) return;

        const payout = this.engine.calculatePayout(winner.id);

        const banner = document.createElement('div');
        banner.className = 'winner-banner';
        banner.innerHTML = `
            <h2>VICTORY</h2>
            <div style="font-size: 2em; margin: 20px 0;">${winner.id}</div>
            <div style="font-size: 1.2em;">
                Health: ${Math.round(winner.health * 100)}%<br>
                💰 Payout: ${payout.payout.toFixed(2)} SOL<br>
                Profit: +${payout.profit.toFixed(2)} SOL
            </div>
            <button onclick="this.parentElement.remove()">CONTINUE</button>
        `;
        document.getElementById('ui-overlay').appendChild(banner);

        this.addLog(`${winner.id} VICTORIOUS! +${payout.profit.toFixed(2)} SOL`, 'kill');
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
            '<div class="log-entry">Dungeon reset.</div>';

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

        // Torch flickering
        this.torches.forEach(torch => {
            if (Math.random() > 0.7) {
                torch.light.intensity = 1.2 + Math.random() * 0.6;
                torch.fire.scale.y = 0.9 + Math.random() * 0.2;
            }
        });

        // Agent animations
        this.agents.forEach(agent => {
            if (!agent.visual) return;

            // Movement
            if (agent.visual.isMoving) {
                const mesh = agent.visual.mesh;
                const target = agent.visual.targetPos;
                
                mesh.position.x += (target.x - mesh.position.x) * 0.2;
                mesh.position.z += (target.z - mesh.position.z) * 0.2;

                // Walk bob
                agent.visual.body.position.y = 1.8 + Math.sin(Date.now() * 0.015) * 0.1;
                agent.visual.cape.rotation.x = Math.sin(Date.now() * 0.015) * 0.2;
            }

            // Attack swing
            if (agent.visual.isAttacking) {
                agent.visual.weapon.rotation.x = -0.8 + Math.sin(Date.now() * 0.05) * 0.8;
            } else {
                agent.visual.weapon.rotation.x = -0.8;
            }

            // Idle breathing
            if (!agent.visual.isMoving && !agent.visual.isAttacking) {
                agent.visual.body.scale.y = 1 + Math.sin(Date.now() * 0.003) * 0.03;
            }
        });

        // Blood physics
        this.bloodParticles = this.bloodParticles.filter(particle => {
            particle.life -= 0.016;
            
            if (particle.life <= 0) {
                this.scene.remove(particle);
                return false;
            }

            particle.velocity.y -= 0.04;
            particle.position.add(particle.velocity);

            if (particle.position.y < 0.1) {
                particle.position.y = 0.1;
                particle.velocity.multiplyScalar(0.2);
            }

            return true;
        });

        // Gibs
        this.gibParticles = this.gibParticles.filter(gib => {
            gib.life -= 0.016;
            
            if (gib.life <= 0) {
                this.scene.remove(gib);
                return false;
            }

            gib.velocity.y -= 0.05;
            gib.position.add(gib.velocity);
            gib.rotation.x += 0.1;
            gib.rotation.z += 0.1;

            if (gib.position.y < 0.1) {
                gib.position.y = 0.1;
                gib.velocity.multiplyScalar(0.1);
            }

            return true;
        });

        this.renderer.render(this.scene, this.camera);
    }
}

let arena;
window.addEventListener('load', () => {
    arena = new DungeonArena();
    arena.initializeAgents();
});
