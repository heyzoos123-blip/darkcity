// DARKCITY Combat Viewer V2 - Proper Game Mechanics

class BattleViewer {
    constructor() {
        this.engine = new CombatEngine();
        this.agents = new Map();
        this.round = 0;
        this.battleActive = false;
        this.zonePositions = this.calculateZonePositions();
    }

    calculateZonePositions() {
        const zones = document.querySelectorAll('.zone');
        const positions = {};
        zones.forEach(zone => {
            const rect = zone.getBoundingClientRect();
            const zoneName = zone.dataset.zone;
            positions[zoneName] = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                element: zone
            };
        });
        return positions;
    }

    initializeAgents() {
        const aggressor = this.engine.initializeAgent('Aggressor', 'NORTH1');
        const defender = this.engine.initializeAgent('Defender', 'SOUTH2');
        
        this.agents = new Map([
            ['Aggressor', aggressor],
            ['Defender', defender]
        ]);

        // Create agent tokens
        const battlefield = document.getElementById('battlefield');
        this.agents.forEach((agent, id) => {
            const token = document.createElement('div');
            token.className = `agent-token agent${id === 'Aggressor' ? '1' : '2'}`;
            token.innerHTML = `
                <div style="font-size: 2.5em;">${id[0]}</div>
                <div class="agent-name">${id}</div>
            `;
            token.id = `token-${id}`;
            battlefield.appendChild(token);
            agent.element = token;
            this.updateAgentPosition(agent);
        });

        this.updateUI();
        this.addLog(`BATTLE INITIALIZED - Stake: ${this.engine.STAKE_AMOUNT} SOL per agent`);
    }

    updateAgentPosition(agent) {
        const pos = this.zonePositions[agent.zone];
        if (pos && agent.element) {
            const rect = pos.element.getBoundingClientRect();
            const battlefield = document.getElementById('battlefield').getBoundingClientRect();
            agent.element.style.left = (rect.left - battlefield.left + rect.width / 2 - 50) + 'px';
            agent.element.style.top = (rect.top - battlefield.top + rect.height / 2 - 50) + 'px';
        }
    }

    updateUI() {
        const aggressor = this.agents.get('Aggressor');
        const defender = this.agents.get('Defender');

        if (aggressor) {
            const healthPct = Math.round(aggressor.health * 100);
            document.getElementById('agent1Name').textContent = aggressor.id;
            document.getElementById('agent1Sol').textContent = `${healthPct}%`;
            document.getElementById('agent1Bar').style.width = (aggressor.health * 100) + '%';
            document.getElementById('agent1Kills').textContent = aggressor.stats.kills;
            document.getElementById('agent1Damage').textContent = Math.round(aggressor.stats.damageDealt * 100) + '%';
        }

        if (defender) {
            const healthPct = Math.round(defender.health * 100);
            document.getElementById('agent2Name').textContent = defender.id;
            document.getElementById('agent2Sol').textContent = `${healthPct}%`;
            document.getElementById('agent2Bar').style.width = (defender.health * 100) + '%';
            document.getElementById('agent2Kills').textContent = defender.stats.kills;
            document.getElementById('agent2Damage').textContent = Math.round(defender.stats.damageDealt * 100) + '%';
        }
    }

    addLog(message, type = 'action') {
        const logContainer = document.getElementById('combatLog');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = this.round > 0 ? `[R${this.round}] ${message}` : message;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // Limit log size
        while (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.firstChild);
        }
    }

    spawnBloodSplatter(x, y, persist = false) {
        const battlefield = document.getElementById('battlefield');
        const splatter = document.createElement('div');
        splatter.className = 'blood-splatter';
        splatter.style.left = x + 'px';
        splatter.style.top = y + 'px';
        
        if (persist) {
            splatter.style.animation = 'splatter-persist 0.5s ease-out forwards';
        }
        
        battlefield.appendChild(splatter);
        
        if (!persist) {
            setTimeout(() => splatter.remove(), 1000);
        }
    }

    spawnDamageNumber(x, y, damage, critical = false) {
        const battlefield = document.getElementById('battlefield');
        const num = document.createElement('div');
        num.className = 'damage-number';
        num.textContent = `-${Math.round(damage * 100)}%`;
        if (critical) {
            num.textContent = `CRIT! ${num.textContent}`;
            num.style.fontSize = '2.8em';
        }
        num.style.left = x + 'px';
        num.style.top = y + 'px';
        battlefield.appendChild(num);
        
        setTimeout(() => num.remove(), 1500);
    }

    screenShake() {
        const battlefield = document.getElementById('battlefield');
        battlefield.style.animation = 'none';
        setTimeout(() => {
            battlefield.style.animation = 'screen-shake 0.3s ease';
        }, 10);
    }

    async dealDamage(attacker, defender, abilityName) {
        const ability = this.engine.abilities[abilityName];
        if (!ability || !ability.damage) return false;
        
        const result = this.engine.applyDamage(attacker, defender, ability.damage, abilityName);
        
        // Visual effects
        this.screenShake();
        
        const defenderPos = defender.element.getBoundingClientRect();
        const battlefield = document.getElementById('battlefield').getBoundingClientRect();
        const x = defenderPos.left - battlefield.left + 50;
        const y = defenderPos.top - battlefield.top + 50;
        
        // Damage number
        this.spawnDamageNumber(x, y - 20, result.damage, result.critical);
        
        // Blood splatter (more for bigger hits)
        const splatters = Math.ceil(result.damage * 30);
        for (let i = 0; i < splatters; i++) {
            setTimeout(() => {
                const offsetX = (Math.random() - 0.5) * 80;
                const offsetY = (Math.random() - 0.5) * 80;
                this.spawnBloodSplatter(x + offsetX, y + offsetY, i % 3 === 0);
            }, i * 60);
        }

        const damageMsg = `${attacker.id} ${abilityName} ${defender.id} for ${Math.round(result.damage * 100)}% HP`;
        this.addLog(
            result.critical ? `💥 CRITICAL! ${damageMsg}` : damageMsg,
            'damage'
        );

        if (result.killed) {
            defender.element.classList.add('dead');
            this.addLog(`💀 ${attacker.id} KILLED ${defender.id}!`, 'kill');
            
            // Massive gore on kill
            for (let i = 0; i < 40; i++) {
                setTimeout(() => {
                    const offsetX = (Math.random() - 0.5) * 200;
                    const offsetY = (Math.random() - 0.5) * 200;
                    this.spawnBloodSplatter(x + offsetX, y + offsetY, true);
                }, i * 25);
            }
            
            return true; // Battle over
        }

        this.updateUI();
        return false;
    }

    moveAgent(agent, newZone) {
        agent.zone = newZone;
        this.updateAgentPosition(agent);
        this.addLog(`${agent.id} moved to ${newZone}`, 'action');
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

    async runRound() {
        this.round++;
        const aggressor = this.agents.get('Aggressor');
        const defender = this.agents.get('Defender');

        if (!aggressor.alive || !defender.alive) return true;

        // Apply status effects (bleeding, etc)
        const bleedDmg = this.engine.applyStatusEffects(aggressor) + this.engine.applyStatusEffects(defender);
        if (bleedDmg > 0) {
            this.addLog(`Status effects dealt ${Math.round(bleedDmg * 100)}% damage`, 'damage');
        }

        await this.sleep(1500);

        // Aggressor AI: Aggressive with abilities
        const distance = this.engine.getDistance(aggressor.zone, defender.zone);
        
        if (distance <= 1) {
            // Use BLOODSTRIKE if ready
            const abilityName = this.engine.canUseAbility(aggressor, 'BLOODSTRIKE') ? 'BLOODSTRIKE' : 'IRONSLAM';
            this.engine.useAbility(aggressor, abilityName);
            const battleOver = await this.dealDamage(aggressor, defender, abilityName);
            if (battleOver) return true;
        } else {
            // Move closer
            const newZone = this.getCloserZone(aggressor.zone, defender.zone);
            this.moveAgent(aggressor, newZone);
        }

        await this.sleep(1200);

        // Defender AI: Use FORTIFY defensively, counter when possible
        if (!defender.alive) return true;
        
        if (this.engine.canUseAbility(defender, 'FORTIFY') && defender.health < 0.6) {
            this.engine.useAbility(defender, 'FORTIFY');
            defender.effects.push('FORTIFIED');
            this.addLog(`${defender.id} used FORTIFY (+50% defense)`, 'action');
        } else if (distance <= 1 && Math.random() > 0.4) {
            const battleOver = await this.dealDamage(defender, aggressor, 'IRONSLAM');
            if (battleOver) return true;
        } else if (distance > 1) {
            this.addLog(`${defender.id} is preparing...`, 'action');
        }

        // Tick cooldowns
        this.engine.tickCooldowns(aggressor);
        this.engine.tickCooldowns(defender);
        this.engine.tickStatusEffects(aggressor);
        this.engine.tickStatusEffects(defender);

        this.updateUI();
        return false;
    }

    async runBattle() {
        this.battleActive = true;
        this.round = 0;
        
        this.addLog('⚔️ BATTLE STARTED', 'action');

        while (this.battleActive) {
            const battleOver = await this.runRound();
            if (battleOver) break;
            if (this.round > 40) {
                this.addLog('⏱️ ROUND LIMIT REACHED - DRAW', 'kill');
                break;
            }
        }

        this.endBattle();
    }

    endBattle() {
        this.battleActive = false;
        const aggressor = this.agents.get('Aggressor');
        const defender = this.agents.get('Defender');
        
        const winner = aggressor.alive ? aggressor : (defender.alive ? defender : null);

        if (!winner) {
            this.addLog('⚔️ DRAW - Both agents survived', 'kill');
            return;
        }

        const payout = this.engine.calculatePayout(winner.id);

        // Show winner banner
        const banner = document.createElement('div');
        banner.className = 'winner-banner';
        banner.innerHTML = `
            <h2>💀 VICTORY 💀</h2>
            <div style="font-size: 2.5em; color: var(--blood-glow); margin: 20px 0; font-weight: 700; letter-spacing: 4px;">
                ${winner.id}
            </div>
            <div style="color: var(--text-primary); font-size: 1.3em; line-height: 1.8;">
                <div style="margin: 10px 0;">Final Health: <span style="color: var(--blood-glow); font-weight: 700;">${Math.round(winner.health * 100)}%</span></div>
                <div style="margin: 10px 0;">Kills: <span style="color: var(--blood-glow); font-weight: 700;">${winner.stats.kills}</span></div>
                <div style="margin: 10px 0;">Damage Dealt: <span style="color: var(--blood-glow); font-weight: 700;">${Math.round(winner.stats.damageDealt * 100)}%</span></div>
                <div style="margin: 20px 0; padding-top: 20px; border-top: 2px solid var(--blood-fresh);">
                    <div style="font-size: 1.1em; color: var(--rot-glow);">💰 PAYOUT</div>
                    <div style="margin: 5px 0;">Entry Stake: <span style="color: var(--text-secondary);">${payout.stake} SOL</span></div>
                    <div style="margin: 5px 0; font-size: 1.4em; font-weight: 700;">Winner Receives: <span style="color: var(--rot-glow);">${payout.payout.toFixed(2)} SOL</span></div>
                    <div style="margin: 5px 0;">Profit: <span style="color: var(--rot-glow); font-weight: 700;">+${payout.profit.toFixed(2)} SOL</span></div>
                    <div style="margin: 5px 0; font-size: 0.9em; color: var(--text-secondary);">Platform Fee: ${payout.platformFee.toFixed(2)} SOL (5%)</div>
                </div>
            </div>
            <button onclick="this.parentElement.remove()" style="margin-top: 30px;">CLOSE</button>
        `;
        document.body.appendChild(banner);

        this.addLog(`🏆 ${winner.id} WINS! Payout: ${payout.payout.toFixed(2)} SOL (+${payout.profit.toFixed(2)} profit)`, 'kill');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    reset() {
        // Clear agents
        document.querySelectorAll('.agent-token').forEach(el => el.remove());
        
        // Clear blood splatters
        document.querySelectorAll('.blood-splatter').forEach(el => el.remove());
        
        // Clear damage numbers
        document.querySelectorAll('.damage-number').forEach(el => el.remove());
        
        // Clear log
        document.getElementById('combatLog').innerHTML = 
            '<div class="log-entry">SYSTEM: Combat arena reset. Ready for battle.</div>';
        
        // Remove winner banner if exists
        document.querySelectorAll('.winner-banner').forEach(el => el.remove());

        this.agents.clear();
        this.round = 0;
        this.battleActive = false;
    }
}

// Global instance
const viewer = new BattleViewer();

function startBattle() {
    if (viewer.battleActive) return;
    
    viewer.reset();
    viewer.initializeAgents();
    
    setTimeout(() => {
        viewer.runBattle();
    }, 500);
}

function resetBattle() {
    viewer.battleActive = false;
    viewer.reset();
    viewer.initializeAgents();
}

// Initialize on load
window.addEventListener('load', () => {
    viewer.initializeAgents();
});

// Recalculate positions on resize
window.addEventListener('resize', () => {
    viewer.zonePositions = viewer.calculateZonePositions();
    viewer.agents.forEach(agent => {
        if (agent.element) {
            viewer.updateAgentPosition(agent);
        }
    });
});
