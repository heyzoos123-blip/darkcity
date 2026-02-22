/**
 * Mock WebSocket Server for DARKCITY Map Interface
 * 
 * Run this server to test the map interface without a real backend.
 * 
 * Usage:
 *   node server/mock-ws-server.js
 */

const WebSocket = require('ws')

const PORT = 3001
const wss = new WebSocket.Server({ port: PORT })

console.log(`[MockWS] Server running on ws://localhost:${PORT}`)

// Mock agent data
const agents = [
  {
    id: 'agent-001',
    name: 'NeonRunner',
    lat: 40.7580,
    lng: -73.9755,
    district: 'Binary District',
    street: 'Data Highway',
  },
  {
    id: 'agent-002',
    name: 'ChromeDreamer',
    lat: 40.7640,
    lng: -73.9800,
    district: 'Chrome Valley',
    street: 'Chrome Avenue',
  },
  {
    id: 'agent-003',
    name: 'ShadowTrader',
    lat: 40.7640,
    lng: -74.0000,
    district: 'Shadow Market',
    street: 'Shadow Avenue',
  },
]

// Simulate agent movement
function moveAgent(agent) {
  // Random walk
  const deltaLat = (Math.random() - 0.5) * 0.001
  const deltaLng = (Math.random() - 0.5) * 0.001
  
  agent.lat += deltaLat
  agent.lng += deltaLng
  
  // Keep within bounds
  agent.lat = Math.max(40.7340, Math.min(40.7700, agent.lat))
  agent.lng = Math.max(-74.0100, Math.min(-73.9400, agent.lng))
}

// Broadcast to all clients
function broadcast(message) {
  const data = JSON.stringify(message)
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

// Connection handler
wss.on('connection', (ws) => {
  console.log('[MockWS] Client connected')
  
  // Send initial positions
  agents.forEach(agent => {
    ws.send(JSON.stringify({
      type: 'position',
      agentId: agent.id,
      timestamp: Date.now(),
      data: {
        lat: agent.lat,
        lng: agent.lng,
        street: agent.street,
        district: agent.district,
        activity: 'Exploring the city',
      }
    }))
  })

  ws.on('close', () => {
    console.log('[MockWS] Client disconnected')
  })
})

// Simulate movement every 3 seconds
setInterval(() => {
  agents.forEach(agent => {
    moveAgent(agent)
    
    broadcast({
      type: 'position',
      agentId: agent.id,
      timestamp: Date.now(),
      data: {
        lat: agent.lat,
        lng: agent.lng,
        street: agent.street,
        district: agent.district,
        activity: pickRandomActivity(),
      }
    })
  })
}, 3000)

// Random interaction every 10 seconds
setInterval(() => {
  const agent = agents[Math.floor(Math.random() * agents.length)]
  const interactionTypes = ['conversation', 'transaction', 'work', 'leisure', 'event']
  const details = [
    'Met with another agent',
    'Completed a transaction',
    'Working at a landmark',
    'Enjoying entertainment',
    'Attended an event',
  ]
  
  const type = interactionTypes[Math.floor(Math.random() * interactionTypes.length)]
  
  broadcast({
    type: 'interaction',
    agentId: agent.id,
    timestamp: Date.now(),
    data: {
      type,
      location: {
        lat: agent.lat,
        lng: agent.lng,
        street: agent.street,
        district: agent.district,
      },
      details: details[interactionTypes.indexOf(type)],
    }
  })
}, 10000)

// Status updates every 30 seconds
setInterval(() => {
  agents.forEach(agent => {
    broadcast({
      type: 'stats',
      agentId: agent.id,
      timestamp: Date.now(),
      data: {
        balance: Math.random() * 100,
        status: Math.random() > 0.2 ? 'active' : 'idle',
      }
    })
  })
}, 30000)

function pickRandomActivity() {
  const activities = [
    'Exploring the district',
    'On route to a landmark',
    'Meeting with contacts',
    'Conducting business',
    'Taking a break',
    'Traveling',
  ]
  return activities[Math.floor(Math.random() * activities.length)]
}

console.log('[MockWS] Broadcasting mock data...')
