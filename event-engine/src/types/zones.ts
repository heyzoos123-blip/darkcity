/**
 * DARKCITY Event Engine - Zone & District Types
 */

export type DistrictId = string;
export type ZoneId = string;

/**
 * District Configuration
 */
export interface District {
  id: DistrictId;
  name: string;
  description: string;
  zones: Zone[];
  connections: DistrictId[];
  transitTime: number; // minutes to cross
  ambiance: Ambiance;
  eventProbabilities: Record<string, number>;
  exclusiveEvents: string[];
  economy: DistrictEconomy;
}

export interface Zone {
  id: ZoneId;
  districtId: DistrictId;
  name: string;
  type: ZoneType;
  maxOccupancy: number;
  currentOccupancy: number;
  eventProbabilities: Record<string, number>;
  activeEventCount: number;
}

export type ZoneType = 
  | 'COMMERCIAL'
  | 'RESIDENTIAL'
  | 'ENTERTAINMENT'
  | 'BUSINESS'
  | 'INDUSTRIAL'
  | 'TRANSIT'
  | 'PUBLIC'
  | 'UNDERGROUND';

export interface Ambiance {
  noiseLevel: number; // 0-100
  crowding: number; // 0-100
  wealthIndex: number; // 0-100
  dangerLevel: number; // 0-100
  timeProfile: Record<number, Partial<Ambiance>>; // by hour
}

export interface DistrictEconomy {
  avgPropertyValue: number;
  avgIncome: number;
  dominantIndustries: string[];
}

/**
 * Agent Location
 */
export interface AgentLocation {
  agentId: string;
  zoneId: ZoneId;
  districtId: DistrictId;
  lastMoved: number;
}
