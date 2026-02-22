-- DARKCITY Property System Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Property Tiers Enum
CREATE TYPE property_tier AS ENUM ('STUDIO', 'ONE_BEDROOM', 'LUXURY', 'PENTHOUSE');
CREATE TYPE property_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');
CREATE TYPE residency_status AS ENUM ('ACTIVE', 'EVICTED', 'VACATED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'LATE');

-- Buildings table
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    total_floors INTEGER NOT NULL,
    location_x DECIMAL(10, 2),
    location_y DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties/Apartments table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier property_tier NOT NULL,
    address VARCHAR(255) NOT NULL UNIQUE,
    status property_status DEFAULT 'AVAILABLE',
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    floor INTEGER NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_unit UNIQUE (building_id, floor, unit_number)
);

-- Agent Residencies
CREATE TABLE residencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    agent_address VARCHAR(44) NOT NULL, -- Solana address
    status residency_status DEFAULT 'ACTIVE',
    move_in_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    move_out_date TIMESTAMP,
    next_payment_due TIMESTAMP NOT NULL,
    grace_period_ends TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_active_residency_per_property UNIQUE (property_id, status) 
        WHERE status = 'ACTIVE'
);

-- Rent Payments
CREATE TABLE rent_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    residency_id UUID NOT NULL REFERENCES residencies(id) ON DELETE CASCADE,
    amount DECIMAL(18, 9) NOT NULL, -- SOL with high precision
    due_date TIMESTAMP NOT NULL,
    paid_date TIMESTAMP,
    status payment_status DEFAULT 'PENDING',
    transaction_signature VARCHAR(88), -- Solana transaction signature
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rent_due_date (due_date),
    INDEX idx_rent_status (status)
);

-- Land Plots
CREATE TABLE land_plots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plot_number VARCHAR(50) NOT NULL UNIQUE,
    size_sqm INTEGER NOT NULL,
    price DECIMAL(18, 9) NOT NULL, -- SOL
    owner_address VARCHAR(44), -- Solana address, NULL = available
    purchased_at TIMESTAMP,
    location_x DECIMAL(10, 2) NOT NULL,
    location_y DECIMAL(10, 2) NOT NULL,
    zoning_type VARCHAR(50) DEFAULT 'MIXED_USE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_address),
    INDEX idx_location (location_x, location_y)
);

-- Custom Structures built on land plots
CREATE TABLE structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_plot_id UUID NOT NULL REFERENCES land_plots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    structure_type VARCHAR(100) NOT NULL, -- 'HOUSE', 'SHOP', 'CLUB', etc.
    blueprint_data JSONB NOT NULL, -- Custom design data
    build_cost DECIMAL(18, 9) NOT NULL,
    built_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_structure_per_plot UNIQUE (land_plot_id)
);

-- Customizations (furniture, decorations, etc.)
CREATE TABLE customizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    structure_id UUID REFERENCES structures(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL,
    item_type VARCHAR(100) NOT NULL, -- 'FURNITURE', 'WALLPAPER', 'LIGHTING', etc.
    item_data JSONB NOT NULL, -- Item configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customization_target CHECK (
        (property_id IS NOT NULL AND structure_id IS NULL) OR
        (property_id IS NULL AND structure_id IS NOT NULL)
    ),
    CONSTRAINT unique_slot_property UNIQUE (property_id, slot_index) 
        WHERE property_id IS NOT NULL,
    CONSTRAINT unique_slot_structure UNIQUE (structure_id, slot_index)
        WHERE structure_id IS NOT NULL
);

-- Spawn Points
CREATE TABLE spawn_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    structure_id UUID REFERENCES structures(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position_x DECIMAL(10, 4) NOT NULL,
    position_y DECIMAL(10, 4) NOT NULL,
    position_z DECIMAL(10, 4) NOT NULL,
    rotation DECIMAL(6, 2) DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT spawn_target CHECK (
        (property_id IS NOT NULL AND structure_id IS NULL) OR
        (property_id IS NULL AND structure_id IS NOT NULL)
    )
);

-- Eviction Log
CREATE TABLE evictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    residency_id UUID NOT NULL REFERENCES residencies(id),
    agent_address VARCHAR(44) NOT NULL,
    property_id UUID NOT NULL REFERENCES properties(id),
    reason TEXT NOT NULL,
    evicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    missed_payments INTEGER DEFAULT 0
);

-- Ownership Transfer Log
CREATE TABLE ownership_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_plot_id UUID NOT NULL REFERENCES land_plots(id),
    from_address VARCHAR(44),
    to_address VARCHAR(44) NOT NULL,
    price DECIMAL(18, 9),
    transaction_signature VARCHAR(88),
    transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_tier ON properties(tier);
CREATE INDEX idx_residencies_agent ON residencies(agent_address);
CREATE INDEX idx_residencies_status ON residencies(status);
CREATE INDEX idx_residencies_next_payment ON residencies(next_payment_due);
CREATE INDEX idx_land_plots_available ON land_plots(owner_address) WHERE owner_address IS NULL;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_residencies_updated_at BEFORE UPDATE ON residencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_land_plots_updated_at BEFORE UPDATE ON land_plots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
