export enum PropertyTier {
  STUDIO = 'STUDIO',
  ONE_BEDROOM = 'ONE_BEDROOM',
  LUXURY = 'LUXURY',
  PENTHOUSE = 'PENTHOUSE'
}

export enum PropertyStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE'
}

export enum ResidencyStatus {
  ACTIVE = 'ACTIVE',
  EVICTED = 'EVICTED',
  VACATED = 'VACATED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  LATE = 'LATE'
}

export interface PropertyTierConfig {
  tier: PropertyTier;
  rentPerMonth: number; // SOL
  storageCapacity: number; // GB
  customizationSlots: number;
  maxSpawnPoints: number;
  features: string[];
}

export const PROPERTY_TIERS: Record<PropertyTier, PropertyTierConfig> = {
  [PropertyTier.STUDIO]: {
    tier: PropertyTier.STUDIO,
    rentPerMonth: 0.01,
    storageCapacity: 1,
    customizationSlots: 3,
    maxSpawnPoints: 1,
    features: ['basic_furniture', 'single_room']
  },
  [PropertyTier.ONE_BEDROOM]: {
    tier: PropertyTier.ONE_BEDROOM,
    rentPerMonth: 0.05,
    storageCapacity: 5,
    customizationSlots: 8,
    maxSpawnPoints: 2,
    features: ['bedroom', 'living_room', 'custom_colors', 'decorations']
  },
  [PropertyTier.LUXURY]: {
    tier: PropertyTier.LUXURY,
    rentPerMonth: 0.2,
    storageCapacity: 20,
    customizationSlots: 20,
    maxSpawnPoints: 5,
    features: ['multiple_rooms', 'premium_furniture', 'custom_lighting', 'music_player', 'balcony']
  },
  [PropertyTier.PENTHOUSE]: {
    tier: PropertyTier.PENTHOUSE,
    rentPerMonth: 0.5,
    storageCapacity: 100,
    customizationSlots: 50,
    maxSpawnPoints: 10,
    features: ['rooftop_access', 'custom_layout', 'vip_furniture', 'private_elevator', 'city_view', 'party_mode']
  }
};

export interface Property {
  id: string;
  tier: PropertyTier;
  address: string;
  status: PropertyStatus;
  building_id: string;
  floor: number;
  unit_number: string;
  created_at: Date;
  updated_at: Date;
}

export interface Residency {
  id: string;
  property_id: string;
  agent_address: string;
  status: ResidencyStatus;
  move_in_date: Date;
  move_out_date?: Date;
  next_payment_due: Date;
  created_at: Date;
  updated_at: Date;
}

export interface RentPayment {
  id: string;
  residency_id: string;
  amount: number;
  due_date: Date;
  paid_date?: Date;
  status: PaymentStatus;
  transaction_signature?: string;
  created_at: Date;
}

export interface LandPlot {
  id: string;
  plot_number: string;
  size_sqm: number;
  price: number; // SOL
  owner_address?: string;
  purchased_at?: Date;
  location_x: number;
  location_y: number;
  zoning_type: string;
  created_at: Date;
  updated_at: Date;
}

export interface Structure {
  id: string;
  land_plot_id: string;
  name: string;
  structure_type: string;
  blueprint_data: Record<string, any>;
  build_cost: number;
  built_at: Date;
  created_at: Date;
}

export interface Customization {
  id: string;
  property_id?: string;
  structure_id?: string;
  slot_index: number;
  item_type: string;
  item_data: Record<string, any>;
  created_at: Date;
}

export interface SpawnPoint {
  id: string;
  property_id?: string;
  structure_id?: string;
  name: string;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation: number;
  is_default: boolean;
  created_at: Date;
}
