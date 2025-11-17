-- Migration: create_ace_tables
-- Description: Creates ACE module tables for dwelling management, visits, foci tracking, and audit logs
-- Date: 2025-11-17

-- ACE Dwellings Table (Imóveis ACE)
CREATE TABLE IF NOT EXISTS ace_dwellings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES health_units(id) ON DELETE RESTRICT,
  microarea VARCHAR(10),
  street TEXT NOT NULL,
  number VARCHAR(20),
  complement TEXT,
  neighborhood TEXT,
  zip_code VARCHAR(10),
  latitude TEXT,
  longitude TEXT,
  dwelling_type TEXT,
  sanitation TEXT,
  water_supply TEXT,
  has_electricity BOOLEAN DEFAULT true,
  has_animals BOOLEAN DEFAULT false,
  animal_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  household_members INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ACE Visits Table (Visitas ACE)
CREATE TABLE IF NOT EXISTS ace_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dwelling_id UUID NOT NULL REFERENCES ace_dwellings(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES health_units(id) ON DELETE RESTRICT,
  visit_date TIMESTAMP NOT NULL,
  visit_type TEXT,
  visit_motive TEXT,
  latitude TEXT,
  longitude TEXT,
  temperature NUMERIC(4,1),
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate INTEGER,
  respiratory_rate INTEGER,
  blood_glucose INTEGER,
  weight NUMERIC(5,2),
  height NUMERIC(5,2),
  observations TEXT,
  findings JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ACE Foci Table (Focos de Vetores)
CREATE TABLE IF NOT EXISTS ace_foci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES ace_visits(id) ON DELETE CASCADE,
  dwelling_id UUID NOT NULL REFERENCES ace_dwellings(id) ON DELETE CASCADE,
  foci_type TEXT NOT NULL,
  location_description TEXT,
  latitude TEXT,
  longitude TEXT,
  quantity INTEGER DEFAULT 1,
  action_taken TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- ACE Audit Logs Table (Logs de Auditoria)
CREATE TABLE IF NOT EXISTS ace_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changes JSONB DEFAULT '{}'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for geolocation queries
CREATE INDEX IF NOT EXISTS idx_ace_dwellings_location ON ace_dwellings(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ace_visits_location ON ace_visits(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ace_foci_location ON ace_foci(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ace_dwellings_unit_id ON ace_dwellings(unit_id);
CREATE INDEX IF NOT EXISTS idx_ace_dwellings_microarea ON ace_dwellings(microarea);
CREATE INDEX IF NOT EXISTS idx_ace_visits_dwelling_id ON ace_visits(dwelling_id);
CREATE INDEX IF NOT EXISTS idx_ace_visits_professional_id ON ace_visits(professional_id);
CREATE INDEX IF NOT EXISTS idx_ace_visits_visit_date ON ace_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_ace_foci_visit_id ON ace_foci(visit_id);
CREATE INDEX IF NOT EXISTS idx_ace_foci_dwelling_id ON ace_foci(dwelling_id);
CREATE INDEX IF NOT EXISTS idx_ace_foci_status ON ace_foci(status);
CREATE INDEX IF NOT EXISTS idx_ace_audit_logs_entity ON ace_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ace_audit_logs_user_id ON ace_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ace_audit_logs_created_at ON ace_audit_logs(created_at);

-- Comments
COMMENT ON TABLE ace_dwellings IS 'ACE module dwelling registry with geolocation support';
COMMENT ON TABLE ace_visits IS 'ACE home visits with health data collection';
COMMENT ON TABLE ace_foci IS 'Vector foci tracking for epidemiological surveillance';
COMMENT ON TABLE ace_audit_logs IS 'Audit trail for all ACE module operations';
