'use client';

import { motion } from 'framer-motion';
import type { Agent, AgentIdentity } from '@/types';
import { formatCurrency, getStatusColor, cn } from '@/lib/utils';

interface AgentPanelProps {
  agent: Agent;
  identity?: AgentIdentity;
  onMove?: () => void;
  onInteract?: () => void;
  onCustomize?: () => void;
}

export function AgentPanel({
  agent,
  identity,
  onMove,
  onInteract,
  onCustomize,
}: AgentPanelProps) {
  const statusColor = getStatusColor(agent.status);

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="glass-strong p-6 rounded-lg space-y-6"
    >
      {/* Agent Header */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-2xl font-display">
            {agent.name[0].toUpperCase()}
          </div>
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background-elevated"
            style={{ backgroundColor: statusColor }}
          />
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-display text-text-primary">{agent.name}</h2>
          <div className="text-sm text-text-secondary capitalize">{agent.status.toLowerCase()}</div>
          {identity && identity.reputation.titles.length > 0 && (
            <div className="text-xs text-accent-primary mt-1">
              {identity.reputation.titles[0]}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Balance</span>
          <span className="text-sm font-mono text-text-primary">
            {formatCurrency(agent.darkcoinBalance, 'DARKCOIN')}
          </span>
        </div>

        {agent.darkflobiBalance > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">$DARKFLOBI</span>
            <span className="text-sm font-mono text-accent-primary">
              {formatCurrency(agent.darkflobiBalance, 'DARKFLOBI')}
            </span>
          </div>
        )}

        {identity && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Reputation</span>
              <span className={cn(
                "text-sm font-mono",
                identity.reputation.overall > 0 ? "text-accent-primary" : "text-accent-danger"
              )}>
                {identity.reputation.overall > 0 ? '+' : ''}{identity.reputation.overall}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Skills</span>
              <span className="text-sm text-text-primary">
                {Object.keys(identity.skills).length}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Personality Preview */}
      {identity && (
        <div className="space-y-2">
          <div className="text-xs text-text-muted font-display uppercase tracking-wider">
            Personality
          </div>
          <div className="grid grid-cols-5 gap-1">
            {Object.entries(identity.personality).map(([trait, value]) => {
              if (typeof value !== 'number') return null;
              
              return (
                <div key={trait} className="relative h-16">
                  <div className="absolute bottom-0 w-full bg-accent-primary/20 rounded-t"
                    style={{ height: `${value}%` }}
                  />
                  <div className="absolute bottom-0 w-full h-0.5 bg-accent-primary"
                    style={{ bottom: `${value}%` }}
                  />
                  <div className="absolute -bottom-5 left-0 right-0 text-[8px] text-center text-text-muted capitalize truncate">
                    {trait.slice(0, 4)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-2">
        <button
          onClick={onMove}
          disabled={agent.status === 'MOVING'}
          className={cn(
            "w-full py-2 px-4 rounded-lg font-display text-sm transition-all",
            agent.status === 'MOVING'
              ? "bg-text-muted/20 text-text-muted cursor-not-allowed"
              : "bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 hover:shadow-glow-primary"
          )}
        >
          {agent.status === 'MOVING' ? 'Moving...' : 'Move'}
        </button>

        <button
          onClick={onInteract}
          disabled={agent.status === 'OFFLINE'}
          className={cn(
            "w-full py-2 px-4 rounded-lg font-display text-sm transition-all",
            agent.status === 'OFFLINE'
              ? "bg-text-muted/20 text-text-muted cursor-not-allowed"
              : "bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30 hover:shadow-glow-secondary"
          )}
        >
          Interact
        </button>

        <button
          onClick={onCustomize}
          className="w-full py-2 px-4 rounded-lg font-display text-sm bg-text-muted/10 text-text-secondary hover:bg-text-muted/20 transition-all"
        >
          Customize
        </button>
      </div>

      {/* Current Location */}
      {agent.currentLocationId && (
        <div className="pt-4 border-t border-text-muted/20">
          <div className="text-xs text-text-muted mb-2 font-display uppercase tracking-wider">
            Current Location
          </div>
          <div className="text-sm text-text-primary">
            {/* TODO: Fetch and display location name */}
            Location #{agent.currentLocationId.slice(0, 8)}
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      {identity && (
        <div className="pt-4 border-t border-text-muted/20 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-display text-accent-primary">
              {Object.keys(identity.relationships).length}
            </div>
            <div className="text-xs text-text-muted mt-1">Connections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display text-accent-warning">
              {identity.goals.shortTerm.length + identity.goals.longTerm.length}
            </div>
            <div className="text-xs text-text-muted mt-1">Active Goals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display text-accent-blue">
              {identity.goals.completed.length}
            </div>
            <div className="text-xs text-text-muted mt-1">Achieved</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
