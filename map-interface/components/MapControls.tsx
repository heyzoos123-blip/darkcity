'use client'

import { Agent, MapState, InteractionType } from '../lib/types'

interface MapControlsProps {
  agents: Agent[]
  selectedAgent: Agent | null
  mapState: MapState
  onStateChange: (state: MapState) => void
  wsConnected: boolean
}

export default function MapControls({
  agents,
  selectedAgent,
  mapState,
  onStateChange,
  wsConnected,
}: MapControlsProps) {
  const toggleBreadcrumbs = () => {
    onStateChange({ ...mapState, showBreadcrumbs: !mapState.showBreadcrumbs })
  }

  const toggleInteractions = () => {
    onStateChange({ ...mapState, showInteractions: !mapState.showInteractions })
  }

  const toggleDistricts = () => {
    onStateChange({ ...mapState, showDistricts: !mapState.showDistricts })
  }

  const toggleLandmarks = () => {
    onStateChange({ ...mapState, showLandmarks: !mapState.showLandmarks })
  }

  const selectAgent = (agentId: string) => {
    onStateChange({ ...mapState, selectedAgent: agentId })
  }

  const setTimeRange = (range: 'today' | 'week' | 'month' | 'all') => {
    onStateChange({
      ...mapState,
      filter: { ...mapState.filter, timeRange: range },
    })
  }

  return (
    <div className="map-controls">
      <div className="controls-header">
        <h1>DARKCITY</h1>
        <div className="connection-status">
          <div className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
          <span>{wsConnected ? 'LIVE' : 'MOCK'}</span>
        </div>
      </div>

      <div className="section">
        <h2>Agents ({agents.length})</h2>
        <div className="agent-list">
          {agents.length === 0 ? (
            <p className="empty">No agents detected...</p>
          ) : (
            agents.map(agent => (
              <div
                key={agent.id}
                className={`agent-card ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
                onClick={() => selectAgent(agent.id)}
              >
                <div className="agent-info">
                  <span className="agent-name">🤖 {agent.name}</span>
                  <span className={`agent-status status-${agent.status}`}>
                    {agent.status}
                  </span>
                </div>
                <div className="agent-location">
                  📍 {agent.currentLocation.district}
                </div>
                <div className="agent-balance">
                  💰 {agent.balance.toFixed(4)} SOL
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="section">
        <h2>Filters</h2>
        <div className="filter-group">
          <label>Time Range</label>
          <div className="button-group">
            <button
              className={mapState.filter.timeRange === 'today' ? 'active' : ''}
              onClick={() => setTimeRange('today')}
            >
              Today
            </button>
            <button
              className={mapState.filter.timeRange === 'week' ? 'active' : ''}
              onClick={() => setTimeRange('week')}
            >
              Week
            </button>
            <button
              className={mapState.filter.timeRange === 'all' ? 'active' : ''}
              onClick={() => setTimeRange('all')}
            >
              All
            </button>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Map Layers</h2>
        <div className="toggle-list">
          <label className="toggle">
            <input
              type="checkbox"
              checked={mapState.showBreadcrumbs}
              onChange={toggleBreadcrumbs}
            />
            <span>Breadcrumb Trail</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={mapState.showInteractions}
              onChange={toggleInteractions}
            />
            <span>Interactions</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={mapState.showDistricts}
              onChange={toggleDistricts}
            />
            <span>District Boundaries</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={mapState.showLandmarks}
              onChange={toggleLandmarks}
            />
            <span>Landmarks</span>
          </label>
        </div>
      </div>

      <style jsx>{`
        .map-controls {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 320px;
          background: #0f0f1a;
          border-right: 2px solid #39ff14;
          overflow-y: auto;
          padding: 20px;
          box-shadow: 0 0 30px rgba(57, 255, 20, 0.2);
        }

        .controls-header {
          margin-bottom: 24px;
        }

        .controls-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, #39ff14, #ff10f0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 2px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          font-size: 12px;
          color: #888;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.connected {
          background: #39ff14;
          box-shadow: 0 0 10px #39ff14;
          animation: pulse 2s infinite;
        }

        .status-dot.disconnected {
          background: #666;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .section {
          margin-bottom: 24px;
        }

        .section h2 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #39ff14;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .agent-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty {
          color: #666;
          font-style: italic;
          font-size: 13px;
        }

        .agent-card {
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .agent-card:hover {
          border-color: #39ff14;
          box-shadow: 0 0 10px rgba(57, 255, 20, 0.2);
        }

        .agent-card.selected {
          border-color: #39ff14;
          background: #1f1f35;
          box-shadow: 0 0 15px rgba(57, 255, 20, 0.3);
        }

        .agent-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .agent-name {
          font-weight: 600;
          color: #fff;
          font-size: 14px;
        }

        .agent-status {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 3px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .status-active {
          background: #39ff14;
          color: #000;
        }

        .status-idle {
          background: #ffd700;
          color: #000;
        }

        .status-offline {
          background: #666;
          color: #fff;
        }

        .status-traveling {
          background: #ff10f0;
          color: #fff;
        }

        .agent-location {
          font-size: 12px;
          color: #888;
          margin-bottom: 4px;
        }

        .agent-balance {
          font-size: 13px;
          color: #ffd700;
          font-weight: 600;
        }

        .filter-group {
          margin-bottom: 12px;
        }

        .filter-group label {
          display: block;
          font-size: 12px;
          color: #888;
          margin-bottom: 6px;
        }

        .button-group {
          display: flex;
          gap: 6px;
        }

        .button-group button {
          flex: 1;
          padding: 8px;
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 4px;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .button-group button:hover {
          border-color: #39ff14;
        }

        .button-group button.active {
          background: #39ff14;
          color: #000;
          border-color: #39ff14;
        }

        .toggle-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }

        .toggle input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #39ff14;
        }

        .toggle span {
          font-size: 13px;
          color: #ccc;
        }

        @media (max-width: 768px) {
          .map-controls {
            width: 100%;
            height: 60px;
            bottom: auto;
            border-right: none;
            border-bottom: 2px solid #39ff14;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 12px;
            white-space: nowrap;
          }

          .controls-header h1 {
            font-size: 20px;
          }

          .section {
            display: inline-block;
            margin-right: 20px;
            vertical-align: top;
          }
        }
      `}</style>
    </div>
  )
}
