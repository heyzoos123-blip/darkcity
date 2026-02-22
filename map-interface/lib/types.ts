// TypeScript types for DARKCITY map interface

export interface Agent {
  id: string
  name: string
  owner: string
  currentLocation: Location
  homeLocation: Location
  workLocation?: Location
  status: AgentStatus
  balance: number
  avatar?: string
}

export interface Location {
  lat: number
  lng: number
  street: string
  district: string
  landmark?: string
}

export type AgentStatus = 'active' | 'idle' | 'offline' | 'traveling'

export interface Position {
  lat: number
  lng: number
  timestamp: number
}

export interface Breadcrumb extends Position {
  agentId: string
}

export interface Interaction {
  id: string
  agentId: string
  type: InteractionType
  location: Location
  timestamp: number
  details: string
  participants?: string[]
  amount?: number
}

export type InteractionType = 
  | 'conversation'
  | 'transaction'
  | 'work'
  | 'leisure'
  | 'travel'
  | 'event'

export interface District {
  id: string
  name: string
  description: string
  bounds: [number, number][]
  color: string
  characteristics: string[]
}

export interface Street {
  name: string
  type: 'avenue' | 'street' | 'boulevard' | 'highway'
  coordinates: [number, number][]
}

export interface Landmark {
  id: string
  name: string
  type: LandmarkType
  location: Location
  description: string
  icon: string
}

export type LandmarkType =
  | 'casino'
  | 'club'
  | 'transit'
  | 'corporate'
  | 'residential'
  | 'entertainment'
  | 'government'
  | 'market'

export interface WebSocketMessage {
  type: 'position' | 'interaction' | 'status' | 'stats'
  agentId: string
  timestamp: number
  data: any
}

export interface ActivityFilter {
  timeRange: 'today' | 'week' | 'month' | 'all'
  types: InteractionType[]
  districts: string[]
}

export interface MapState {
  selectedAgent: string | null
  showBreadcrumbs: boolean
  showInteractions: boolean
  showDistricts: boolean
  showLandmarks: boolean
  filter: ActivityFilter
}
