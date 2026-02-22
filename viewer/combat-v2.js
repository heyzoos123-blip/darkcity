// DARKCITY Combat Engine V2 - Proper Mechanics

class CombatEngine {
    constructor() {
        this.STAKE_AMOUNT = 0.1; // SOL per agent
        this.PLATFORM_FEE = 0.05; // 5%
        
        this.abilities = {
            BLOODSTRIKE: { damage: 0.15, cooldown: 0, range: 1 },
            IRONSLAM: { damage: 0.12, cooldown: 0, range: 1 },
            REGENERATE: { heal: 0.10, cooldown: 3 },
            FORTIFY: { defenseBoost: 0.5, cooldown: 4, duration: 2 },
            VOIDSTRIKE: { damage: 0.18, cooldown: 0, range: 2 }
        };
        
        this.statusEffects = {
            BLEEDING: { damagePerRound: 0.02, duration: 3 },
            DEFENDING: { damageReduction: 0.5, duration: 1 },
            FORTIFIED: { damageReduction: 0.3, duration: 2 },
            STUNNED: { duration: 1 }
        };
    }
    
    initializeAgent(id, zone, characterClass = 'WARRIOR') {
        return {
            id: id,
            class: characterClass,
            health: 1.0, // 100% health
            maxHealth: 1.0,
            zone: zone,
            effects: [],
            abilities: {
                BLOODSTRIKE: { cooldown: 0 },
                FORTIFY: { cooldown: 0 }
            },
            stats: {
                kills: 0,
                damageDealt: 0,
                damageTaken: 0
            },
            alive: true
        };
    }
    
    calculatePayout(winner) {
        const totalPot = this.STAKE_AMOUNT * 2;
        const platformCut = totalPot * this.PLATFORM_FEE;
        const winnerPayout = totalPot - platformCut;
        
        return {
            winner: winner,
            payout: winnerPayout,
            stake: this.STAKE_AMOUNT,
            profit: winnerPayout - this.STAKE_AMOUNT,
            platformFee: platformCut
        };
    }
    
    applyDamage(attacker, defender, baseDamage, abilityName) {
        let damage = baseDamage;
        
        // Apply status effect modifiers
        if (defender.effects.includes('FORTIFIED')) {
            damage *= 0.7; // 30% reduction
        }
        
        if (defender.effects.includes('DEFENDING')) {
            damage *= 0.5; // 50% reduction
        }
        
        // Critical hit chance (10%)
        if (Math.random() < 0.1) {
            damage *= 1.5;
        }
        
        // Apply damage
        const actualDamage = Math.min(damage, defender.health);
        defender.health -= actualDamage;
        defender.stats.damageTaken += actualDamage;
        attacker.stats.damageDealt += actualDamage;
        
        if (defender.health <= 0) {
            defender.health = 0;
            defender.alive = false;
            attacker.stats.kills++;
        }
        
        return {
            damage: actualDamage,
            killed: !defender.alive,
            critical: damage > baseDamage,
            mitigated: actualDamage < baseDamage
        };
    }
    
    applyStatusEffects(agent) {
        const effects = [...agent.effects];
        let totalDamage = 0;
        
        effects.forEach(effect => {
            if (effect === 'BLEEDING') {
                const bleed = this.statusEffects.BLEEDING.damagePerRound;
                agent.health -= bleed;
                totalDamage += bleed;
                
                if (agent.health < 0) {
                    agent.health = 0;
                    agent.alive = false;
                }
            }
        });
        
        return totalDamage;
    }
    
    tickCooldowns(agent) {
        for (const abilityName in agent.abilities) {
            if (agent.abilities[abilityName].cooldown > 0) {
                agent.abilities[abilityName].cooldown--;
            }
        }
    }
    
    tickStatusEffects(agent) {
        // Remove expired effects (this is simplified)
        agent.effects = agent.effects.filter(effect => {
            // In real implementation, track duration per effect
            return Math.random() > 0.3; // Simplified decay
        });
    }
    
    canUseAbility(agent, abilityName) {
        return agent.abilities[abilityName] && 
               agent.abilities[abilityName].cooldown === 0;
    }
    
    useAbility(agent, abilityName) {
        if (!this.canUseAbility(agent, abilityName)) return false;
        
        const ability = this.abilities[abilityName];
        if (!ability) return false;
        
        // Set cooldown
        agent.abilities[abilityName].cooldown = ability.cooldown;
        
        // Apply ability effects
        if (abilityName === 'REGENERATE') {
            agent.health = Math.min(1.0, agent.health + ability.heal);
        } else if (abilityName === 'FORTIFY') {
            if (!agent.effects.includes('FORTIFIED')) {
                agent.effects.push('FORTIFIED');
            }
        }
        
        return true;
    }
    
    getDistance(zone1, zone2) {
        const adjacency = {
            'CENTER': ['NORTH1', 'NORTH2', 'SOUTH1', 'SOUTH2'],
            'NORTH1': ['CENTER', 'NORTH2'],
            'NORTH2': ['CENTER', 'NORTH1', 'SOUTH2'],
            'SOUTH1': ['CENTER', 'SOUTH2'],
            'SOUTH2': ['CENTER', 'SOUTH1', 'NORTH2']
        };

        if (zone1 === zone2) return 0;
        if (adjacency[zone1]?.includes(zone2)) return 1;
        return 2;
    }
    
    isInRange(agent, target, abilityName) {
        const ability = this.abilities[abilityName];
        if (!ability) return false;
        
        const distance = this.getDistance(agent.zone, target.zone);
        return distance <= (ability.range || 1);
    }
}

// Export for use in viewer
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CombatEngine;
}
