'use client'

import { Agent, Interaction } from '../lib/types'

interface StatsPanelProps {
  agent: Agent | null
  recentInteractions: Interaction[]
}

export default function StatsPanel({ agent, recentInteractions }: StatsPanelProps) {
  if (!agent) {
    return (
      <div className="stats-panel">
        <p className="no-agent">No agent selected</p>
        <style jsx>{`
          .stats-panel {
            position: fixed;
            left: 320px;
            right: 0;
            bottom: 0;
            height: 120px;
            background: #0f0f1a;
            border-top: 2px solid #39ff14;
            padding: 16px 20px;
            box-shadow: 0 0 30px rgba(57, 255, 20, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .no-agent {
            color: #666;
            font-style: italic;
          }

          @media (max-width: 768px) {
            .stats-panel {
              left: 0;
              height: 180px;
            }
          }
        `}</style>
      </div>
    )
  }

  // Calculate earnings today (mock for now)
  const earningsToday = recentInteractions
    .filter(i => i.timestamp > Date.now() - 24 * 60 * 60 * 1000)
    .reduce((sum, i) => sum + (i.amount || 0), 0)

  // Get current activity
  const latestInteraction = recentInteractions[recentInteractions.length - 1]
  const currentActivity = latestInteraction
    ? `${latestInteraction.type} at ${latestInteraction.location.landmark || latestInteraction.location.district}`
    : 'Idle'

  return (
    <div className="stats-panel">
      <div className="stat-group">
        <div className="stat-item">
          <div className="stat-label">Current Location</div>
          <div className="stat-value location">
            📍 {agent.currentLocation.street}
          </div>
          <div className="stat-subvalue">
            {agent.currentLocation.district}
          </div>
        </div>
      </div>

      <div className="stat-divider" />

      <div className="stat-group">
        <div className="stat-item">
          <div className="stat-label">Current Activity</div>
          <div className="stat-value activity">
            {currentActivity}
          </div>
          <div className="stat-subvalue">
            {agent.status === 'active' ? '🟢 Active' : '⚪ Idle'}
          </div>
        </div>
      </div>

      <div className="stat-divider" />

      <div className="stat-group">
        <div className="stat-item">
          <div className="stat-label">Earnings Today</div>
          <div className="stat-value earnings">
            💰 {earningsToday.toFixed(4)} SOL
          </div>
          <div className="stat-subvalue">
            Balance: {agent.balance.toFixed(4)} SOL
          </div>
        </div>
      </div>

      <div className="stat-divider" />

      <div className="stat-group interactions-group">
        <div className="stat-label">Recent Interactions</div>
        <div className="interactions-list">
          {recentInteractions.length === 0 ? (
            <p className="no-interactions">No recent activity</p>
          ) : (
            recentInteractions.slice(-3).reverse().map(interaction => (
              <div key={interaction.id} className="interaction-item">
                <span className="interaction-icon">
                  {interaction.type === 'conversation' ? '💬' :
                   interaction.type === 'transaction' ? '💸' :
                   interaction.type === 'work' ? '💼' :
                   interaction.type === 'leisure' ? '🎮' : '📍'}
                </span>
                <span className="interaction-text">
                  {interaction.details}
                </span>
                <span className="interaction-time">
                  {formatTime(interaction.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .stats-panel {
          position: fixed;
          left: 320px;
          right: 0;
          bottom: 0;
          height: 120px;
          background: #0f0f1a;
          border-top: 2px solid #39ff14;
          padding: 16px 20px;
          display: flex;
          gap: 20px;
          align-items: center;
          box-shadow: 0 0 30px rgba(57, 255, 20, 0.2);
          overflow-x: auto;
        }

        .stat-group {
          flex-shrink: 0;
        }

        .interactions-group {
          flex: 1;
          min-width: 300px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
        }

        .stat-value.location {
          color: #39ff14;
        }

        .stat-value.activity {
          color: #ff10f0;
        }

        .stat-value.earnings {
          color: #ffd700;
        }

        .stat-subvalue {
          font-size: 12px;
          color: #666;
        }

        .stat-divider {
          width: 1px;
          height: 60px;
          background: #333;
          flex-shrink: 0;
        }

        .interactions-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }

        .no-interactions {
          color: #666;
          font-size: 12px;
          font-style: italic;
        }

        .interaction-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #ccc;
          background: #1a1a2e;
          padding: 6px 10px;
          border-radius: 4px;
          border-left: 2px solid #39ff14;
        }

        .interaction-icon {
          font-size: 14px;
        }

        .interaction-text {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .interaction-time {
          color: #666;
          font-size: 11px;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .stats-panel {
            left: 0;
            height: 180px;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .stat-divider {
            width: 100%;
            height: 1px;
          }

          .interactions-group {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  )
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
