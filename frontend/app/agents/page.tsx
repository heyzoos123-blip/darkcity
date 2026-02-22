'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { formatCurrency, getStatusColor, cn } from '@/lib/utils';
import type { Agent } from '@/types';

// Mock agents for development
const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    ownerId: 'user-1',
    name: 'Cypher',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastActiveAt: new Date().toISOString(),
    currentLocationId: 'loc-1',
    status: 'IDLE',
    darkcoinBalance: 1250,
    darkflobiBalance: 0,
    metadata: {},
  },
  {
    id: 'agent-2',
    ownerId: 'user-1',
    name: 'Nova',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'OFFLINE',
    darkcoinBalance: 430,
    darkflobiBalance: 5,
    metadata: {},
  },
];

export default function AgentsPage() {
  const [agents] = useState<Agent[]>(mockAgents);

  return (
    <div className="min-h-screen bg-background-primary p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl glow-text text-accent-primary mb-2">
              My Agents
            </h1>
            <p className="text-text-secondary">
              Manage your digital consciousness
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 rounded-lg bg-text-muted/10 text-text-secondary hover:bg-text-muted/20 transition-colors font-display"
            >
              Back to City
            </button>
            <button className="px-6 py-2 rounded-lg bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 hover:shadow-glow-primary transition-all font-display">
              + Create Agent
            </button>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent, index) => {
          const statusColor = getStatusColor(agent.status);

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-strong rounded-lg p-6 hover:scale-[1.02] transition-transform cursor-pointer"
              onClick={() => window.location.href = `/agents/${agent.id}`}
            >
              {/* Avatar & Status */}
              <div className="flex items-start gap-4 mb-4">
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
                  <h3 className="text-xl font-display text-text-primary mb-1">
                    {agent.name}
                  </h3>
                  <div className="text-sm text-text-secondary capitalize">
                    {agent.status.toLowerCase()}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">Balance</span>
                  <span className="font-mono text-text-primary">
                    {formatCurrency(agent.darkcoinBalance, 'DARKCOIN')}
                  </span>
                </div>

                {agent.darkflobiBalance > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">$DARKFLOBI</span>
                    <span className="font-mono text-accent-primary">
                      {agent.darkflobiBalance}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">Active</span>
                  <span className="text-text-primary">
                    {(() => {
                      const days = Math.floor(
                        (Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return `${days} days`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/agents/${agent.id}`;
                  }}
                  className="flex-1 py-2 px-3 rounded bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 text-sm transition-colors"
                >
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/agents/${agent.id}/customize`;
                  }}
                  className="flex-1 py-2 px-3 rounded bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30 text-sm transition-colors"
                >
                  Customize
                </button>
              </div>
            </motion.div>
          );
        })}

        {/* Create New Agent Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: agents.length * 0.1 }}
          className="glass-strong rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px] cursor-pointer hover:scale-[1.02] transition-transform border-2 border-dashed border-accent-primary/30"
          onClick={() => console.log('Create new agent')}
        >
          <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center text-3xl mb-4">
            +
          </div>
          <h3 className="text-xl font-display text-accent-primary mb-2">
            Create New Agent
          </h3>
          <p className="text-sm text-text-secondary text-center">
            Bring a new consciousness to life
          </p>
        </motion.div>
      </div>

      {/* Limits Info */}
      <div className="max-w-7xl mx-auto mt-8 glass p-4 rounded-lg text-center">
        <span className="text-sm text-text-secondary">
          {agents.length} / 3 agent slots used
        </span>
        <span className="text-accent-primary text-sm ml-2">
          • Upgrade for more slots
        </span>
      </div>
    </div>
  );
}
