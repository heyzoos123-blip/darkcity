// DARKCITY Character Model Definitions (6 Classes)
// N64 low-poly style with unique visual identity per class

class CharacterModels {
    static createWarrior(scene, position, color) {
        const group = new THREE.Group();
        const scale = 1.5;

        // WARRIOR - Balanced melee fighter
        // Heavy armor, medium build, sword & shield
        
        const torsoGeo = new THREE.BoxGeometry(2 * scale, 2.5 * scale, 1.3 * scale);
        const armorMat = new THREE.MeshStandardMaterial({
            color: color.primary,
            roughness: 0.7,
            metalness: 0.5,
            flatShading: true,
            emissive: color.glow,
            emissiveIntensity: 0.2
        });
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 2 * scale;
        torso.castShadow = true;
        group.add(torso);

        // Helmet (enclosed)
        const helmGeo = new THREE.BoxGeometry(1.3 * scale, 1.3 * scale, 1.3 * scale);
        const helm = new THREE.Mesh(helmGeo, armorMat);
        helm.position.y = 3.5 * scale;
        helm.castShadow = true;
        group.add(helm);

        // Massive shoulders (GAUNTLET STYLE)
        const shoulderGeo = new THREE.BoxGeometry(1.4 * scale, 1 * scale, 1 * scale);
        const lShoulder = new THREE.Mesh(shoulderGeo, armorMat);
        lShoulder.position.set(-1.7 * scale, 3 * scale, 0);
        lShoulder.castShadow = true;
        group.add(lShoulder);

        const rShoulder = new THREE.Mesh(shoulderGeo, armorMat);
        rShoulder.position.set(1.7 * scale, 3 * scale, 0);
        rShoulder.castShadow = true;
        group.add(rShoulder);

        // Sword (right hand)
        const swordGeo = new THREE.BoxGeometry(0.5 * scale, 4 * scale, 0.8 * scale);
        const swordMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 1.0,
            roughness: 0.2,
            emissive: color.weaponGlow,
            emissiveIntensity: 0.5,
            flatShading: true
        });
        const sword = new THREE.Mesh(swordGeo, swordMat);
        sword.position.set(2.3 * scale, 1.5 * scale, 0.7 * scale);
        sword.rotation.x = -0.5;
        sword.castShadow = true;
        group.add(sword);

        // Shield (left hand)
        const shieldGeo = new THREE.BoxGeometry(1.5 * scale, 2 * scale, 0.3 * scale);
        const shield = new THREE.Mesh(shieldGeo, armorMat);
        shield.position.set(-1.8 * scale, 1.5 * scale, 0.5 * scale);
        shield.rotation.y = -0.3;
        shield.castShadow = true;
        group.add(shield);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.3 * scale, 0.3 * scale, 0.2 * scale);
        const eyeMat = new THREE.MeshBasicMaterial({ color: color.eyes, emissive: color.eyes });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
        eye1.position.set(-0.4 * scale, 3.5 * scale, 0.7 * scale);
        group.add(eye1);
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
        eye2.position.set(0.4 * scale, 3.5 * scale, 0.7 * scale);
        group.add(eye2);

        group.position.set(position.x, 0, position.z);
        scene.add(group);

        return { group, weapon: sword, shield };
    }

    static createTank(scene, position, color) {
        const group = new THREE.Group();
        const scale = 1.7; // Bigger than warrior

        // TANK - Ultra heavy, slow, defensive
        
        // Massive torso
        const torsoGeo = new THREE.BoxGeometry(2.5 * scale, 2.8 * scale, 1.8 * scale);
        const armorMat = new THREE.MeshStandardMaterial({
            color: color.primary,
            roughness: 0.9,
            metalness: 0.6,
            flatShading: true
        });
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 2.2 * scale;
        torso.castShadow = true;
        group.add(torso);

        // Block helmet
        const helmGeo = new THREE.BoxGeometry(1.5 * scale, 1.5 * scale, 1.5 * scale);
        const helm = new THREE.Mesh(helmGeo, armorMat);
        helm.position.y = 4 * scale;
        helm.castShadow = true;
        group.add(helm);

        // HUGE shoulders (intimidating)
        const shoulderGeo = new THREE.BoxGeometry(1.8 * scale, 1.2 * scale, 1.2 * scale);
        const lShoulder = new THREE.Mesh(shoulderGeo, armorMat);
        lShoulder.position.set(-2 * scale, 3.5 * scale, 0);
        lShoulder.castShadow = true;
        group.add(lShoulder);

        const rShoulder = new THREE.Mesh(shoulderGeo, armorMat);
        rShoulder.position.set(2 * scale, 3.5 * scale, 0);
        rShoulder.castShadow = true;
        group.add(rShoulder);

        // Huge mace/hammer
        const hammerGeo = new THREE.BoxGeometry(1.2 * scale, 1.2 * scale, 1.2 * scale);
        const hammerMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            metalness: 0.9,
            roughness: 0.3,
            flatShading: true
        });
        const hammerHead = new THREE.Mesh(hammerGeo, hammerMat);
        hammerHead.position.set(2.5 * scale, 0.5 * scale, 0);
        hammerHead.castShadow = true;
        group.add(hammerHead);

        const handleGeo = new THREE.BoxGeometry(0.3 * scale, 3 * scale, 0.3 * scale);
        const handle = new THREE.Mesh(handleGeo, hammerMat);
        handle.position.set(2.5 * scale, 2.5 * scale, 0);
        handle.castShadow = true;
        group.add(handle);

        // Glowing eyes (menacing)
        const eyeGeo = new THREE.BoxGeometry(0.4 * scale, 0.2 * scale, 0.2 * scale);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000 });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
        eye1.position.set(-0.4 * scale, 4 * scale, 0.8 * scale);
        group.add(eye1);
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
        eye2.position.set(0.4 * scale, 4 * scale, 0.8 * scale);
        group.add(eye2);

        group.position.set(position.x, 0, position.z);
        scene.add(group);

        return { group, weapon: hammerHead };
    }

    static createMage(scene, position, color) {
        const group = new THREE.Group();
        const scale = 1.3; // Smaller, frailer

        // MAGE - Robed, staff, mystical
        
        // Thin torso (robes)
        const torsoGeo = new THREE.BoxGeometry(1.4 * scale, 2.5 * scale, 1 * scale);
        const robeMat = new THREE.MeshStandardMaterial({
            color: color.primary,
            roughness: 1.0,
            flatShading: true,
            emissive: color.glow,
            emissiveIntensity: 0.3
        });
        const torso = new THREE.Mesh(torsoGeo, robeMat);
        torso.position.y = 2 * scale;
        torso.castShadow = true;
        group.add(torso);

        // Pointed wizard hat
        const hatGeo = new THREE.ConeGeometry(0.8 * scale, 2 * scale, 6);
        const hat = new THREE.Mesh(hatGeo, robeMat);
        hat.position.y = 4.5 * scale;
        hat.castShadow = true;
        group.add(hat);

        // Staff (glowing crystal)
        const staffGeo = new THREE.BoxGeometry(0.2 * scale, 5 * scale, 0.2 * scale);
        const staffMat = new THREE.MeshStandardMaterial({
            color: 0x4a3a2a,
            flatShading: true
        });
        const staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.set(1.2 * scale, 2 * scale, 0);
        staff.castShadow = true;
        group.add(staff);

        // Crystal on staff
        const crystalGeo = new THREE.OctahedronGeometry(0.5 * scale, 0);
        const crystalMat = new THREE.MeshBasicMaterial({
            color: color.weaponGlow,
            emissive: color.weaponGlow,
            transparent: true,
            opacity: 0.8
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.set(1.2 * scale, 4.5 * scale, 0);
        group.add(crystal);

        // Glowing eyes (mystical)
        const eyeGeo = new THREE.SphereGeometry(0.2 * scale, 6, 6);
        const eyeMat = new THREE.MeshBasicMaterial({ color: color.eyes, emissive: color.eyes });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
        eye1.position.set(-0.3 * scale, 3.3 * scale, 0.6 * scale);
        group.add(eye1);
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
        eye2.position.set(0.3 * scale, 3.3 * scale, 0.6 * scale);
        group.add(eye2);

        group.position.set(position.x, 0, position.z);
        scene.add(group);

        return { group, weapon: crystal, staff };
    }

    static createRogue(scene, position, color) {
        const group = new THREE.Group();
        const scale = 1.4; // Medium, agile

        // ROGUE - Light armor, dual daggers, hood
        
        // Lean torso
        const torsoGeo = new THREE.BoxGeometry(1.6 * scale, 2.2 * scale, 1 * scale);
        const armorMat = new THREE.MeshStandardMaterial({
            color: color.primary,
            roughness: 0.8,
            flatShading: true
        });
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 1.8 * scale;
        torso.castShadow = true;
        group.add(torso);

        // Hood
        const hoodGeo = new THREE.ConeGeometry(1 * scale, 1.5 * scale, 6);
        const hood = new THREE.Mesh(hoodGeo, armorMat);
        hood.position.y = 3.5 * scale;
        hood.rotation.x = 0.2;
        hood.castShadow = true;
        group.add(hood);

        // Dual daggers
        const daggerGeo = new THREE.BoxGeometry(0.3 * scale, 2 * scale, 0.5 * scale);
        const daggerMat = new THREE.MeshStandardMaterial({
            color: 0x666666,
            metalness: 1.0,
            roughness: 0.1,
            emissive: color.weaponGlow,
            emissiveIntensity: 0.4,
            flatShading: true
        });
        
        const dagger1 = new THREE.Mesh(daggerGeo, daggerMat);
        dagger1.position.set(1.5 * scale, 1.5 * scale, 0.5 * scale);
        dagger1.rotation.x = -0.8;
        dagger1.castShadow = true;
        group.add(dagger1);

        const dagger2 = new THREE.Mesh(daggerGeo, daggerMat);
        dagger2.position.set(-1.5 * scale, 1.5 * scale, 0.5 * scale);
        dagger2.rotation.x = -0.8;
        dagger2.castShadow = true;
        group.add(dagger2);

        // Eyes (shadowed)
        const eyeGeo = new THREE.BoxGeometry(0.25 * scale, 0.15 * scale, 0.1 * scale);
        const eyeMat = new THREE.MeshBasicMaterial({ color: color.eyes, emissive: color.eyes });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
        eye1.position.set(-0.3 * scale, 3.2 * scale, 0.7 * scale);
        group.add(eye1);
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
        eye2.position.set(0.3 * scale, 3.2 * scale, 0.7 * scale);
        group.add(eye2);

        group.position.set(position.x, 0, position.z);
        scene.add(group);

        return { group, weapon: dagger1, dagger2 };
    }

    static createAssassin(scene, position, color) {
        const group = new THREE.Group();
        const scale = 1.35; // Slim, deadly

        // ASSASSIN - Dark, blade-focused, ninja-like
        
        // Sleek torso
        const torsoGeo = new THREE.BoxGeometry(1.5 * scale, 2.3 * scale, 0.9 * scale);
        const darkMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
            flatShading: true,
            emissive: color.glow,
            emissiveIntensity: 0.2
        });
        const torso = new THREE.Mesh(torsoGeo, darkMat);
        torso.position.y = 1.9 * scale;
        torso.castShadow = true;
        group.add(torso);

        // Mask/helm
        const maskGeo = new THREE.BoxGeometry(1.1 * scale, 1.1 * scale, 1.1 * scale);
        const mask = new THREE.Mesh(maskGeo, darkMat);
        mask.position.y = 3.3 * scale;
        mask.castShadow = true;
        group.add(mask);

        // Katana (huge blade)
        const katanaGeo = new THREE.BoxGeometry(0.3 * scale, 5 * scale, 0.6 * scale);
        const katanaMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 1.0,
            roughness: 0.1,
            emissive: color.weaponGlow,
            emissiveIntensity: 0.7,
            flatShading: true
        });
        const katana = new THREE.Mesh(katanaGeo, katanaMat);
        katana.position.set(2 * scale, 2 * scale, 0.5 * scale);
        katana.rotation.x = -0.7;
        katana.rotation.z = -0.3;
        katana.castShadow = true;
        group.add(katana);

        // Red eyes (menacing)
        const eyeGeo = new THREE.SphereGeometry(0.15 * scale, 6, 6);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000 });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
        eye1.position.set(-0.35 * scale, 3.3 * scale, 0.6 * scale);
        group.add(eye1);
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
        eye2.position.set(0.35 * scale, 3.3 * scale, 0.6 * scale);
        group.add(eye2);

        group.position.set(position.x, 0, position.z);
        scene.add(group);

        return { group, weapon: katana };
    }

    static createHealer(scene, position, color) {
        const group = new THREE.Group();
        const scale = 1.35; // Support build

        // HEALER - Robed, staff, holy/nature vibe
        
        // Flowing robes
        const torsoGeo = new THREE.CylinderGeometry(1.2 * scale, 1.5 * scale, 2.5 * scale, 8);
        const robeMat = new THREE.MeshStandardMaterial({
            color: color.primary,
            roughness: 1.0,
            flatShading: true,
            emissive: color.glow,
            emissiveIntensity: 0.3
        });
        const torso = new THREE.Mesh(torsoGeo, robeMat);
        torso.position.y = 2 * scale;
        torso.castShadow = true;
        group.add(torso);

        // Hood with cross
        const hoodGeo = new THREE.ConeGeometry(1 * scale, 1.8 * scale, 8);
        const hood = new THREE.Mesh(hoodGeo, robeMat);
        hood.position.y = 4 * scale;
        hood.castShadow = true;
        group.add(hood);

        // Healing staff
        const staffGeo = new THREE.BoxGeometry(0.25 * scale, 4.5 * scale, 0.25 * scale);
        const staffMat = new THREE.MeshStandardMaterial({
            color: 0x8a6a4a,
            flatShading: true
        });
        const staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.set(-1.3 * scale, 2 * scale, 0);
        staff.castShadow = true;
        group.add(staff);

        // Glowing orb on staff
        const orbGeo = new THREE.SphereGeometry(0.5 * scale, 8, 8);
        const orbMat = new THREE.MeshBasicMaterial({
            color: color.weaponGlow,
            emissive: color.weaponGlow,
            transparent: true,
            opacity: 0.8
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(-1.3 * scale, 4.5 * scale, 0);
        group.add(orb);

        // Kind eyes (soft glow)
        const eyeGeo = new THREE.SphereGeometry(0.18 * scale, 6, 6);
        const eyeMat = new THREE.MeshBasicMaterial({ color: color.eyes, emissive: color.eyes });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
        eye1.position.set(-0.3 * scale, 3.5 * scale, 0.6 * scale);
        group.add(eye1);
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
        eye2.position.set(0.3 * scale, 3.5 * scale, 0.6 * scale);
        group.add(eye2);

        group.position.set(position.x, 0, position.z);
        scene.add(group);

        return { group, weapon: orb, staff };
    }

    static getColorScheme(characterClass) {
        const schemes = {
            'Warrior': {
                primary: 0x3d0000,
                glow: 0x8b0000,
                eyes: 0xff0000,
                weaponGlow: 0xff0000
            },
            'Tank': {
                primary: 0x2a2a2a,
                glow: 0x555555,
                eyes: 0xff0000,
                weaponGlow: 0x888888
            },
            'Mage': {
                primary: 0x1a1a3d,
                glow: 0x3a3a8b,
                eyes: 0x00ffff,
                weaponGlow: 0x00ffff
            },
            'Rogue': {
                primary: 0x1a2a1a,
                glow: 0x2a4a2a,
                eyes: 0x00ff00,
                weaponGlow: 0x00ff00
            },
            'Assassin': {
                primary: 0x0a0a0a,
                glow: 0x1a1a1a,
                eyes: 0xff0000,
                weaponGlow: 0xff0000
            },
            'Healer': {
                primary: 0x3d3d1a,
                glow: 0x8b8b3d,
                eyes: 0xffff00,
                weaponGlow: 0xffff00
            }
        };
        return schemes[characterClass] || schemes['Warrior'];
    }

    static createCharacter(characterClass, scene, position) {
        const colors = this.getColorScheme(characterClass);
        
        switch(characterClass) {
            case 'Warrior': return this.createWarrior(scene, position, colors);
            case 'Tank': return this.createTank(scene, position, colors);
            case 'Mage': return this.createMage(scene, position, colors);
            case 'Rogue': return this.createRogue(scene, position, colors);
            case 'Assassin': return this.createAssassin(scene, position, colors);
            case 'Healer': return this.createHealer(scene, position, colors);
            default: return this.createWarrior(scene, position, colors);
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CharacterModels;
}
