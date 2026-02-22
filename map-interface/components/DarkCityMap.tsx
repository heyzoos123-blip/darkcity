'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { Agent, Breadcrumb, Interaction, MapState } from '../lib/types'
import { DARKCITY_CENTER, DEFAULT_ZOOM, DISTRICTS, LANDMARKS, STREETS } from '../lib/mapData'
import { DarkCityWebSocket, createMockDataStream, WebSocketCallback } from '../lib/websocket'
import MapControls from './MapControls'
import StatsPanel from './StatsPanel'

// Fix Leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom marker icons
const createCustomIcon = (color: string, symbol: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        border: 2px solid #000;
        transform: rotate(-45deg);
        box-shadow: 0 0 10px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 16px;">${symbol}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  })
}

const ICONS = {
  agent: createCustomIcon('#39ff14', '🤖'),
  home: createCustomIcon('#4169E1', '🏠'),
  work: createCustomIcon('#FFD700', '💼'),
  interaction: createCustomIcon('#FF10F0', '💬'),
}

export default function DarkCityMap() {
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map())
  const [breadcrumbs, setBreadcrumbs] = useState<Map<string, Breadcrumb[]>>(new Map())
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [mapState, setMapState] = useState<MapState>({
    selectedAgent: null,
    showBreadcrumbs: true,
    showInteractions: true,
    showDistricts: true,
    showLandmarks: true,
    filter: {
      timeRange: 'today',
      types: [],
      districts: [],
    },
  })
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<DarkCityWebSocket | null>(null)

  // Initialize WebSocket or mock data
  useEffect(() => {
    const handleMessage: WebSocketCallback = (message) => {
      if (message.type === 'position') {
        const { agentId, data } = message
        
        // Update agent position
        setAgents(prev => {
          const updated = new Map(prev)
          const existing = updated.get(agentId)
          
          updated.set(agentId, {
            id: agentId,
            name: existing?.name || `Agent ${agentId}`,
            owner: existing?.owner || 'Unknown',
            currentLocation: {
              lat: data.lat,
              lng: data.lng,
              street: data.street,
              district: data.district,
            },
            homeLocation: existing?.homeLocation || data,
            status: 'active',
            balance: existing?.balance || 0,
          })
          
          return updated
        })
        
        // Add breadcrumb
        setBreadcrumbs(prev => {
          const updated = new Map(prev)
          const trail = updated.get(agentId) || []
          
          trail.push({
            agentId,
            lat: data.lat,
            lng: data.lng,
            timestamp: message.timestamp,
          })
          
          // Keep last 50 breadcrumbs
          if (trail.length > 50) trail.shift()
          
          updated.set(agentId, trail)
          return updated
        })
      } else if (message.type === 'interaction') {
        const { agentId, data } = message
        
        setInteractions(prev => [
          ...prev,
          {
            id: `${agentId}-${message.timestamp}`,
            agentId,
            type: data.type,
            location: data.location,
            timestamp: message.timestamp,
            details: data.details,
          },
        ].slice(-100)) // Keep last 100 interactions
      }
    }

    // Try WebSocket first, fall back to mock data
    try {
      const ws = new DarkCityWebSocket()
      wsRef.current = ws
      
      ws.subscribe(handleMessage)
      ws.connect()
      
      setWsConnected(ws.isConnected())
      
      // If not connected after 2 seconds, use mock data
      const fallbackTimeout = setTimeout(() => {
        if (!ws.isConnected()) {
          console.log('[DarkCityMap] WebSocket unavailable, using mock data')
          createMockDataStream(handleMessage)
        }
      }, 2000)

      return () => {
        clearTimeout(fallbackTimeout)
        ws.disconnect()
      }
    } catch (error) {
      console.error('[DarkCityMap] WebSocket error, using mock data:', error)
      return createMockDataStream(handleMessage)
    }
  }, [])

  // Get selected agent
  const selectedAgent = mapState.selectedAgent 
    ? agents.get(mapState.selectedAgent)
    : agents.values().next().value

  return (
    <div className="darkcity-map-container">
      <MapControls
        agents={Array.from(agents.values())}
        selectedAgent={selectedAgent}
        mapState={mapState}
        onStateChange={setMapState}
        wsConnected={wsConnected}
      />

      <div className="map-wrapper">
        <MapContainer
          center={DARKCITY_CENTER}
          zoom={DEFAULT_ZOOM}
          className="darkcity-map"
          style={{ height: '100%', width: '100%' }}
        >
          {/* Dark tile layer */}
          <TileLayer
            attribution='&copy; DARKCITY'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* District overlays */}
          {mapState.showDistricts && DISTRICTS.map(district => (
            <Polygon
              key={district.id}
              positions={district.bounds}
              pathOptions={{
                color: district.color,
                weight: 2,
                opacity: 0.6,
                fillOpacity: 0.1,
              }}
            >
              <Popup>
                <div className="district-popup">
                  <h3>{district.name}</h3>
                  <p>{district.description}</p>
                  <div className="characteristics">
                    {district.characteristics.map(c => (
                      <span key={c} className="badge">{c}</span>
                    ))}
                  </div>
                </div>
              </Popup>
            </Polygon>
          ))}

          {/* Street grid */}
          {STREETS.map(street => (
            <Polyline
              key={street.name}
              positions={street.coordinates}
              pathOptions={{
                color: '#333',
                weight: street.type === 'highway' ? 3 : street.type === 'boulevard' ? 2 : 1,
                opacity: 0.5,
              }}
            />
          ))}

          {/* Landmarks */}
          {mapState.showLandmarks && LANDMARKS.map(landmark => (
            <Marker
              key={landmark.id}
              position={[landmark.location.lat, landmark.location.lng]}
              icon={createCustomIcon('#888', landmark.icon)}
            >
              <Popup>
                <div className="landmark-popup">
                  <h3>{landmark.icon} {landmark.name}</h3>
                  <p className="type">{landmark.type}</p>
                  <p>{landmark.description}</p>
                  <p className="location">{landmark.location.street}, {landmark.location.district}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Agent markers */}
          {Array.from(agents.values()).map(agent => (
            <Marker
              key={agent.id}
              position={[agent.currentLocation.lat, agent.currentLocation.lng]}
              icon={ICONS.agent}
            >
              <Popup>
                <div className="agent-popup">
                  <h3>🤖 {agent.name}</h3>
                  <p className="status">Status: {agent.status}</p>
                  <p className="location">
                    {agent.currentLocation.street}, {agent.currentLocation.district}
                  </p>
                  <p className="balance">Balance: {agent.balance} SOL</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Breadcrumb trails */}
          {mapState.showBreadcrumbs && Array.from(breadcrumbs.entries()).map(([agentId, trail]) => {
            if (mapState.selectedAgent && agentId !== mapState.selectedAgent) return null
            
            return (
              <Polyline
                key={agentId}
                positions={trail.map(b => [b.lat, b.lng])}
                pathOptions={{
                  color: '#39ff14',
                  weight: 2,
                  opacity: 0.6,
                  dashArray: '5, 10',
                }}
              />
            )
          })}

          {/* Interaction markers */}
          {mapState.showInteractions && interactions
            .filter(i => !mapState.selectedAgent || i.agentId === mapState.selectedAgent)
            .map(interaction => (
              <Marker
                key={interaction.id}
                position={[interaction.location.lat, interaction.location.lng]}
                icon={ICONS.interaction}
              >
                <Popup>
                  <div className="interaction-popup">
                    <h3>💬 {interaction.type}</h3>
                    <p>{interaction.details}</p>
                    <p className="location">
                      {interaction.location.street}, {interaction.location.district}
                    </p>
                    <p className="timestamp">
                      {new Date(interaction.timestamp).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>

      <StatsPanel
        agent={selectedAgent}
        recentInteractions={interactions.filter(i => i.agentId === selectedAgent?.id).slice(-5)}
      />

      <style jsx global>{`
        .darkcity-map-container {
          position: relative;
          width: 100vw;
          height: 100vh;
          background: #0a0a0f;
          overflow: hidden;
        }

        .map-wrapper {
          position: absolute;
          top: 0;
          left: 320px;
          right: 0;
          bottom: 120px;
        }

        .darkcity-map {
          background: #0a0a0f;
        }

        .custom-marker {
          background: none;
          border: none;
        }

        /* Popup styling */
        .leaflet-popup-content-wrapper {
          background: #1a1a2e;
          color: #fff;
          border: 1px solid #39ff14;
          box-shadow: 0 0 20px rgba(57, 255, 20, 0.3);
        }

        .leaflet-popup-tip {
          background: #1a1a2e;
          border: 1px solid #39ff14;
        }

        .district-popup h3,
        .landmark-popup h3,
        .agent-popup h3,
        .interaction-popup h3 {
          margin: 0 0 8px 0;
          color: #39ff14;
          font-size: 16px;
        }

        .district-popup p,
        .landmark-popup p,
        .agent-popup p,
        .interaction-popup p {
          margin: 4px 0;
          font-size: 13px;
        }

        .characteristics {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .badge {
          background: #39ff14;
          color: #000;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
        }

        .type {
          color: #ff10f0;
          font-style: italic;
        }

        .status {
          color: #39ff14;
        }

        .location {
          color: #888;
          font-size: 12px;
        }

        .balance {
          color: #ffd700;
          font-weight: 600;
        }

        .timestamp {
          color: #666;
          font-size: 11px;
        }

        @media (max-width: 768px) {
          .map-wrapper {
            left: 0;
            top: 60px;
            bottom: 180px;
          }
        }
      `}</style>
    </div>
  )
}
