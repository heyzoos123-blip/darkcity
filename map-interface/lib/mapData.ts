// DARKCITY map data: districts, streets, landmarks

import { District, Street, Landmark } from './types'

// Base coordinates: Center of DARKCITY (fictional NYC-like grid)
export const DARKCITY_CENTER: [number, number] = [40.7580, -73.9855]
export const DEFAULT_ZOOM = 13

// 10 Districts of DARKCITY
export const DISTRICTS: District[] = [
  {
    id: 'platinum-heights',
    name: 'Platinum Heights',
    description: 'Ultra-luxury residential district. Penthouse living, private elevators, rooftop gardens.',
    bounds: [
      [40.7700, -73.9700],
      [40.7700, -73.9550],
      [40.7580, -73.9550],
      [40.7580, -73.9700],
    ],
    color: '#9370DB',
    characteristics: ['Wealthy', 'Secure', 'Exclusive'],
  },
  {
    id: 'chrome-valley',
    name: 'Chrome Valley',
    description: 'Tech startup hub. Coworking spaces, innovation labs, venture capital offices.',
    bounds: [
      [40.7700, -73.9900],
      [40.7700, -73.9700],
      [40.7580, -73.9700],
      [40.7580, -73.9900],
    ],
    color: '#00CED1',
    characteristics: ['Tech', 'Innovation', 'Fast-paced'],
  },
  {
    id: 'binary-district',
    name: 'Binary District',
    description: 'Data centers and server farms. The digital backbone of DARKCITY.',
    bounds: [
      [40.7580, -73.9900],
      [40.7580, -73.9700],
      [40.7460, -73.9700],
      [40.7460, -73.9900],
    ],
    color: '#39FF14',
    characteristics: ['Industrial', 'Technical', '24/7'],
  },
  {
    id: 'neon-gardens',
    name: 'Neon Gardens',
    description: 'Entertainment district. Casinos, clubs, theaters, and vice.',
    bounds: [
      [40.7580, -73.9700],
      [40.7580, -73.9550],
      [40.7460, -73.9550],
      [40.7460, -73.9700],
    ],
    color: '#FF10F0',
    characteristics: ['Nightlife', 'Entertainment', 'Hedonistic'],
  },
  {
    id: 'rust-quarter',
    name: 'Rust Quarter',
    description: 'Old industrial zone. Warehouses, underground markets, gritty streets.',
    bounds: [
      [40.7460, -73.9900],
      [40.7460, -73.9700],
      [40.7340, -73.9700],
      [40.7340, -73.9900],
    ],
    color: '#8B4513',
    characteristics: ['Industrial', 'Underground', 'Rough'],
  },
  {
    id: 'crystal-exchange',
    name: 'Crystal Exchange',
    description: 'Financial district. Banks, trading floors, corporate headquarters.',
    bounds: [
      [40.7460, -73.9700],
      [40.7460, -73.9550],
      [40.7340, -73.9550],
      [40.7340, -73.9700],
    ],
    color: '#FFD700',
    characteristics: ['Financial', 'Corporate', 'High-stakes'],
  },
  {
    id: 'shadow-market',
    name: 'Shadow Market',
    description: 'Underground bazaar. Gray market goods, information brokers, anonymous deals.',
    bounds: [
      [40.7700, -74.0100],
      [40.7700, -73.9900],
      [40.7580, -73.9900],
      [40.7580, -74.0100],
    ],
    color: '#2F4F4F',
    characteristics: ['Underground', 'Anonymous', 'Risky'],
  },
  {
    id: 'voltage-park',
    name: 'Voltage Park',
    description: 'Residential mid-tier. Apartments, cafes, local shops.',
    bounds: [
      [40.7580, -74.0100],
      [40.7580, -73.9900],
      [40.7460, -73.9900],
      [40.7460, -74.0100],
    ],
    color: '#4169E1',
    characteristics: ['Residential', 'Middle-class', 'Community'],
  },
  {
    id: 'echo-district',
    name: 'Echo District',
    description: 'Arts and culture. Galleries, studios, performance spaces.',
    bounds: [
      [40.7700, -73.9550],
      [40.7700, -73.9400],
      [40.7580, -73.9400],
      [40.7580, -73.9550],
    ],
    color: '#FF6347',
    characteristics: ['Artistic', 'Creative', 'Bohemian'],
  },
  {
    id: 'glitch-zone',
    name: 'Glitch Zone',
    description: 'Experimental tech testing ground. Unpredictable, dangerous, cutting-edge.',
    bounds: [
      [40.7460, -74.0100],
      [40.7460, -73.9900],
      [40.7340, -73.9900],
      [40.7340, -74.0100],
    ],
    color: '#FF00FF',
    characteristics: ['Experimental', 'Dangerous', 'Unpredictable'],
  },
]

// Major streets (Manhattan-inspired grid)
export const STREETS: Street[] = [
  // Avenues (North-South)
  { name: 'Neon Avenue', type: 'avenue', coordinates: [[40.7700, -73.9600], [40.7340, -73.9600]] },
  { name: 'Chrome Avenue', type: 'avenue', coordinates: [[40.7700, -73.9700], [40.7340, -73.9700]] },
  { name: 'Binary Avenue', type: 'avenue', coordinates: [[40.7700, -73.9800], [40.7340, -73.9800]] },
  { name: 'Voltage Avenue', type: 'avenue', coordinates: [[40.7700, -73.9900], [40.7340, -73.9900]] },
  { name: 'Shadow Avenue', type: 'avenue', coordinates: [[40.7700, -74.0000], [40.7340, -74.0000]] },
  { name: 'Pulse Avenue', type: 'avenue', coordinates: [[40.7700, -73.9500], [40.7340, -73.9500]] },
  
  // Streets (East-West)
  { name: 'Platinum Street', type: 'street', coordinates: [[40.7680, -74.0100], [40.7680, -73.9400]] },
  { name: 'Diamond Street', type: 'street', coordinates: [[40.7640, -74.0100], [40.7640, -73.9400]] },
  { name: 'Crystal Street', type: 'street', coordinates: [[40.7600, -74.0100], [40.7600, -73.9400]] },
  { name: 'Zenith Street', type: 'street', coordinates: [[40.7560, -74.0100], [40.7560, -73.9400]] },
  { name: 'Eclipse Street', type: 'street', coordinates: [[40.7520, -74.0100], [40.7520, -73.9400]] },
  { name: 'Nova Street', type: 'street', coordinates: [[40.7480, -74.0100], [40.7480, -73.9400]] },
  { name: 'Quantum Street', type: 'street', coordinates: [[40.7440, -74.0100], [40.7440, -73.9400]] },
  { name: 'Flux Street', type: 'street', coordinates: [[40.7400, -74.0100], [40.7400, -73.9400]] },
  { name: 'Cipher Street', type: 'street', coordinates: [[40.7360, -74.0100], [40.7360, -73.9400]] },
  
  // Boulevards (Major corridors)
  { name: 'Midnight Boulevard', type: 'boulevard', coordinates: [[40.7580, -74.0100], [40.7580, -73.9400]] },
  { name: 'Ethereal Boulevard', type: 'boulevard', coordinates: [[40.7460, -74.0100], [40.7460, -73.9400]] },
  
  // Highway
  { name: 'Data Highway', type: 'highway', coordinates: [[40.7700, -73.9750], [40.7340, -73.9750]] },
]

// Landmarks
export const LANDMARKS: Landmark[] = [
  // Casinos
  {
    id: 'obsidian-casino',
    name: 'Obsidian Casino',
    type: 'casino',
    location: { lat: 40.7520, lng: -73.9625, street: 'Eclipse Street', district: 'Neon Gardens' },
    description: 'High-stakes gambling, crypto poker, AI-powered games',
    icon: '🎰',
  },
  {
    id: 'voltage-casino',
    name: 'Voltage Casino',
    type: 'casino',
    location: { lat: 40.7500, lng: -73.9600, street: 'Neon Avenue', district: 'Neon Gardens' },
    description: 'Mid-tier casino with slots and tables',
    icon: '🎲',
  },
  
  // Clubs
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    type: 'club',
    location: { lat: 40.7540, lng: -73.9650, street: 'Neon Avenue', district: 'Neon Gardens' },
    description: 'Underground techno club, holographic DJs',
    icon: '🎵',
  },
  {
    id: 'chrome-lounge',
    name: 'Chrome Lounge',
    type: 'club',
    location: { lat: 40.7640, lng: -73.9800, street: 'Chrome Avenue', district: 'Chrome Valley' },
    description: 'Upscale networking lounge for tech elites',
    icon: '🍸',
  },
  
  // Transit
  {
    id: 'central-station',
    name: 'Central Station',
    type: 'transit',
    location: { lat: 40.7580, lng: -73.9750, street: 'Midnight Boulevard', district: 'Binary District' },
    description: 'Main transit hub connecting all districts',
    icon: '🚇',
  },
  {
    id: 'skyport',
    name: 'SkyPort Terminal',
    type: 'transit',
    location: { lat: 40.7680, lng: -73.9600, street: 'Platinum Street', district: 'Platinum Heights' },
    description: 'Private aerial transit for the wealthy',
    icon: '🚁',
  },
  
  // Corporate
  {
    id: 'axiom-tower',
    name: 'Axiom Tower',
    type: 'corporate',
    location: { lat: 40.7400, lng: -73.9625, street: 'Crystal Exchange', district: 'Crystal Exchange' },
    description: 'Mega-corp headquarters, 200 floors',
    icon: '🏢',
  },
  {
    id: 'quantum-labs',
    name: 'Quantum Labs',
    type: 'corporate',
    location: { lat: 40.7640, lng: -73.9850, street: 'Chrome Avenue', district: 'Chrome Valley' },
    description: 'AI research facility, cutting-edge tech',
    icon: '🔬',
  },
  
  // Residential
  {
    id: 'platinum-tower',
    name: 'Platinum Tower',
    type: 'residential',
    location: { lat: 40.7660, lng: -73.9625, street: 'Diamond Street', district: 'Platinum Heights' },
    description: 'Ultra-luxury condos, penthouses only',
    icon: '🏙️',
  },
  {
    id: 'voltage-apartments',
    name: 'Voltage Apartments',
    type: 'residential',
    location: { lat: 40.7520, lng: -73.9950, street: 'Voltage Avenue', district: 'Voltage Park' },
    description: 'Mid-tier housing, good amenities',
    icon: '🏘️',
  },
  
  // Entertainment
  {
    id: 'hologram-theater',
    name: 'Hologram Theater',
    type: 'entertainment',
    location: { lat: 40.7640, lng: -73.9475, street: 'Diamond Street', district: 'Echo District' },
    description: 'Immersive holographic performances',
    icon: '🎭',
  },
  {
    id: 'circuit-arena',
    name: 'Circuit Arena',
    type: 'entertainment',
    location: { lat: 40.7500, lng: -73.9750, street: 'Eclipse Street', district: 'Binary District' },
    description: 'Esports arena, competitive gaming',
    icon: '🎮',
  },
  
  // Markets
  {
    id: 'shadow-bazaar',
    name: 'Shadow Bazaar',
    type: 'market',
    location: { lat: 40.7640, lng: -74.0000, street: 'Diamond Street', district: 'Shadow Market' },
    description: 'Anonymous marketplace, gray goods',
    icon: '🛒',
  },
  {
    id: 'data-exchange',
    name: 'Data Exchange',
    type: 'market',
    location: { lat: 40.7400, lng: -73.9625, street: 'Flux Street', district: 'Crystal Exchange' },
    description: 'Information trading floor',
    icon: '💹',
  },
  
  // Government
  {
    id: 'city-nexus',
    name: 'City Nexus',
    type: 'government',
    location: { lat: 40.7580, lng: -73.9625, street: 'Zenith Street', district: 'Neon Gardens' },
    description: 'Central governance hub, AI council chambers',
    icon: '🏛️',
  },
]

// Helper function to get district by coordinates
export function getDistrictByCoords(lat: number, lng: number): District | null {
  for (const district of DISTRICTS) {
    if (isPointInPolygon([lat, lng], district.bounds)) {
      return district
    }
  }
  return null
}

// Point-in-polygon check
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    
    const intersect = ((yi > point[1]) !== (yj > point[1])) &&
      (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// Helper to find nearest street
export function getNearestStreet(lat: number, lng: number): string {
  let nearest = STREETS[0]
  let minDist = Infinity
  
  for (const street of STREETS) {
    for (const coord of street.coordinates) {
      const dist = Math.hypot(coord[0] - lat, coord[1] - lng)
      if (dist < minDist) {
        minDist = dist
        nearest = street
      }
    }
  }
  
  return nearest.name
}
