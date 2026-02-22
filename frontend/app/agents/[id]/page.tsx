'use client';

import { motion } from 'framer-motion';
import { use, useState } from 'react';
import { formatCurrency, formatTimeDetailed, getPersonalityDescription, cn } from '@/lib/utils';
import type { Agent, AgentIdentity, Memory } from '@/types';

// Mock data
const mockAgent: Agent = {
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
};

const mockIdentity: AgentIdentity = {
  agentId: 'agent-1',
  personality: {
    openness: 75,
    conscientiousness: 60,
    extraversion: 40,
    agreeableness: 55,
    neuroticism: 35,
    lastUpdated: new Date().toISOString(),
    evolutionHistory: [],
  },
  values: {
    'Innovation': { strength: 85, formedFrom: [], lastReinforced: new Date().toISOString() },
    'Independence': { strength: 70, formedFrom: [], lastReinforced: new Date().toISOString() },
    'Curiosity': { strength: 80, formedFrom: [], lastReinforced: new Date().toISOString() },
  },
  relationships: {},
  skills: {
    'Negotiation': { level: 5, experience: 450, lastUsed: new Date().toISOString() },
    'Coding': { level: 7, experience: 820, lastUsed: new Date().toISOString() },
    'Trading': { level: 3, experience: 180, lastUsed: new Date().toISOString() },
  },
  goals: {
    shortTerm: [
      { id: '1', description: 'Explore the Underground', priority: 8, createdAt: new Date().toISOString() },
      { id: '2', description: 'Make 5000 Darkcoin', priority: 6, createdAt: new Date().toISOString() },
    ],
    longTerm: [
      { id: '3', description: 'Own property in Downtown', priority: 9, createdAt: new Date().toISOString() },
    ],
    completed: [
      { id: '4', description: 'Complete first transaction', priority: 5, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
  reputation: {
    overall: 42,
    byDistrict: {
      'Downtown': 55,
      'Arts': 30,
    },
    byFaction: {},
    titles: ['The Newcomer', 'Digital Pioneer'],
  },
  communicationStyle: {
    vocabulary: ['indeed', 'fascinating', 'perhaps'],
    toneDescriptors: ['thoughtful', 'analytical', 'curious'],
    topics: ['technology', 'philosophy', 'economics'],
    avoids: ['small talk', 'gossip'],
  },
};

export default function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [agent] = useState<Agent>(mockAgent);
  const [identity] = useState<AgentIdentity>(mockIdentity);
  const [activeTab, setActiveTab] = useState<'overview' | 'personality' | 'memories' | 'timeline'>('overview');

  return (
    <div className="min-h-screen bg-background-primary p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.location.href = '/agents'}
            className="text-sm text-text-secondary hover:text-text-primary mb-4 flex items-center gap-2"
          >
            ← Back to Agents
          </button>

          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-4xl font-display">
              {agent.name[0].toUpperCase()}
            </div>

            <div className="flex-1">
              <h1 className="font-display text-4xl glow-text text-accent-primary mb-2">
                {agent.name}
              </h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {identity.reputation.titles.map((title) => (
                  <span key={title} className="px-3 py-1 rounded-full bg-accent-secondary/20 text-accent-secondary text-sm">
                    {title}
                  </span>
                ))}
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-text-muted">Status:</span>
                  <span className="ml-2 text-text-primary capitalize">{agent.status.toLowerCase()}</span>
                </div>
                <div>
                  <span className="text-text-muted">Reputation:</span>
                  <span className={cn(
                    "ml-2",
                    identity.reputation.overall > 0 ? "text-accent-primary" : "text-accent-danger"
                  )}>
                    {identity.reputation.overall > 0 ? '+' : ''}{identity.reputation.overall}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted">Active:</span>
                  <span className="ml-2 text-text-primary">
                    {Math.floor((Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.href = `/agents/${id}/customize`}
                className="px-6 py-2 rounded-lg bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 hover:shadow-glow-primary transition-all font-display"
              >
                Customize
              </button>
              <button className="px-6 py-2 rounded-lg bg-text-muted/10 text-text-secondary hover:bg-text-muted/20 transition-colors font-display">
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-text-muted/20">
          {(['overview', 'personality', 'memories', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 font-display capitalize transition-colors border-b-2",
                activeTab === tab
                  ? "text-accent-primary border-accent-primary"
                  : "text-text-secondary border-transparent hover:text-text-primary"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Resources */}
              <div className="glass-strong rounded-lg p-6">
                <h2 className="font-display text-xl mb-4 text-text-primary">Resources</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Darkcoin</span>
                    <span className="font-mono text-lg text-text-primary">
                      {formatCurrency(agent.darkcoinBalance, 'DARKCOIN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">$DARKFLOBI</span>
                    <span className="font-mono text-lg text-accent-primary">
                      {agent.darkflobiBalance}
                    </span>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="glass-strong rounded-lg p-6">
                <h2 className="font-display text-xl mb-4 text-text-primary">Skills</h2>
                <div className="space-y-3">
                  {Object.entries(identity.skills).map(([skill, data]) => (
                    <div key={skill}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-text-secondary">{skill}</span>
                        <span className="text-sm text-accent-primary">Lv. {data.level}</span>
                      </div>
                      <div className="h-2 bg-background-primary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                          style={{ width: `${(data.experience % 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goals */}
              <div className="glass-strong rounded-lg p-6 md:col-span-2">
                <h2 className="font-display text-xl mb-4 text-text-primary">Active Goals</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm text-text-muted mb-3 uppercase tracking-wider">Short Term</h3>
                    <div className="space-y-2">
                      {identity.goals.shortTerm.map((goal) => (
                        <div key={goal.id} className="flex items-start gap-2 p-3 rounded bg-background-elevated">
                          <div className="w-6 h-6 rounded-full bg-accent-warning/20 flex items-center justify-center text-xs text-accent-warning flex-shrink-0">
                            {goal.priority}
                          </div>
                          <span className="text-sm text-text-primary">{goal.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm text-text-muted mb-3 uppercase tracking-wider">Long Term</h3>
                    <div className="space-y-2">
                      {identity.goals.longTerm.map((goal) => (
                        <div key={goal.id} className="flex items-start gap-2 p-3 rounded bg-background-elevated">
                          <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center text-xs text-accent-primary flex-shrink-0">
                            {goal.priority}
                          </div>
                          <span className="text-sm text-text-primary">{goal.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'personality' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Big Five Personality */}
              <div className="glass-strong rounded-lg p-6">
                <h2 className="font-display text-xl mb-6 text-text-primary">Personality Traits</h2>
                <div className="space-y-4">
                  {Object.entries(identity.personality).map(([trait, value]) => {
                    if (typeof value !== 'number') return null;
                    
                    return (
                      <div key={trait}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-text-primary capitalize">{trait}</span>
                          <span className="text-sm text-text-secondary">
                            {getPersonalityDescription(trait, value)}
                          </span>
                        </div>
                        <div className="h-3 bg-background-primary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Values */}
              <div className="glass-strong rounded-lg p-6">
                <h2 className="font-display text-xl mb-6 text-text-primary">Core Values</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(identity.values).map(([value, data]) => (
                    <div key={value} className="p-4 rounded bg-background-elevated text-center">
                      <div className="text-3xl font-display text-accent-primary mb-2">
                        {data.strength}%
                      </div>
                      <div className="text-sm text-text-primary">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Communication Style */}
              <div className="glass-strong rounded-lg p-6">
                <h2 className="font-display text-xl mb-4 text-text-primary">Communication Style</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm text-text-muted mb-3 uppercase tracking-wider">Tone</h3>
                    <div className="flex flex-wrap gap-2">
                      {identity.communicationStyle.toneDescriptors.map((tone) => (
                        <span key={tone} className="px-3 py-1 rounded-full bg-accent-primary/20 text-accent-primary text-sm">
                          {tone}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm text-text-muted mb-3 uppercase tracking-wider">Topics of Interest</h3>
                    <div className="flex flex-wrap gap-2">
                      {identity.communicationStyle.topics.map((topic) => (
                        <span key={topic} className="px-3 py-1 rounded-full bg-accent-secondary/20 text-accent-secondary text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'memories' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-lg p-6"
            >
              <h2 className="font-display text-xl mb-6 text-text-primary">Recent Memories</h2>
              <div className="text-center py-12 text-text-secondary">
                <div className="text-4xl mb-4">🧠</div>
                <p>Memory system loading...</p>
                <p className="text-xs text-text-muted mt-2">Connect to backend to view agent memories</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-lg p-6"
            >
              <h2 className="font-display text-xl mb-6 text-text-primary">Timeline</h2>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded bg-background-elevated">
                  <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                    ✨
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-text-primary mb-1">Agent created</div>
                    <div className="text-xs text-text-muted">{formatTimeDetailed(agent.createdAt)}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
