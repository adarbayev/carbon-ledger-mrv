-- ═══════════════════════════════════════════════════════════════
--  Carbon Ledger MRV — SQLite Schema (MVP-1)
--  Versioned records, audit trail, calculation snapshots
-- ═══════════════════════════════════════════════════════════════

-- Installation metadata
CREATE TABLE IF NOT EXISTS installations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  period_start TEXT,
  period_end TEXT,
  workflow_status TEXT DEFAULT 'DRAFT',
  reviewer_name TEXT,
  review_date TEXT,
  submit_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Source streams / boundaries
CREATE TABLE IF NOT EXISTS boundaries (
  id TEXT PRIMARY KEY,
  installation_id TEXT REFERENCES installations(id),
  name TEXT NOT NULL,
  included INTEGER DEFAULT 1,
  notes TEXT,
  evidence TEXT
);

-- Production processes
CREATE TABLE IF NOT EXISTS processes (
  id TEXT PRIMARY KEY,
  installation_id TEXT REFERENCES installations(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Core',
  active INTEGER DEFAULT 1
);

-- ─── Versioned Activity Data ─────────────────────────────────

-- Fuel combustion entries (versioned)
CREATE TABLE IF NOT EXISTS fuel_entries (
  version_id TEXT PRIMARY KEY,
  stable_id TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  period TEXT NOT NULL,
  process_id TEXT REFERENCES processes(id),
  fuel_type_id TEXT NOT NULL,
  quantity REAL DEFAULT 0,
  unit TEXT DEFAULT 't',
  custom_ncv REAL,
  custom_ef_co2 REAL,
  custom_ef_ch4 REAL,
  custom_ef_n2o REAL,
  evidence TEXT,
  notes TEXT,
  created_by TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now')),
  supersedes_version_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_fuel_stable ON fuel_entries(stable_id, version_number);

-- Electricity consumption entries (versioned)
CREATE TABLE IF NOT EXISTS electricity_entries (
  version_id TEXT PRIMARY KEY,
  stable_id TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  period TEXT NOT NULL,
  process_id TEXT REFERENCES processes(id),
  mwh REAL DEFAULT 0,
  grid_country TEXT,
  ef REAL DEFAULT 0,
  ef_override INTEGER DEFAULT 0,
  evidence TEXT,
  notes TEXT,
  created_by TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now')),
  supersedes_version_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_elec_stable ON electricity_entries(stable_id, version_number);

-- Process events — anode consumption, PFC params, etc. (versioned)
CREATE TABLE IF NOT EXISTS process_events (
  version_id TEXT PRIMARY KEY,
  stable_id TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  period TEXT NOT NULL,
  process_id TEXT REFERENCES processes(id),
  event_type TEXT NOT NULL,
  parameter TEXT NOT NULL,
  value REAL DEFAULT 0,
  unit TEXT,
  data_source TEXT,
  evidence TEXT,
  created_by TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now')),
  supersedes_version_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_pe_stable ON process_events(stable_id, version_number);

-- Emission Blocks — generic formula-based process emissions
-- Replaces hardcoded anode/PFC with template-driven formulas
CREATE TABLE IF NOT EXISTS emission_blocks (
  id TEXT PRIMARY KEY,
  installation_id TEXT REFERENCES installations(id),
  period TEXT NOT NULL,
  process_id TEXT REFERENCES processes(id),
  template_id TEXT,
  name TEXT NOT NULL,
  output_gas TEXT DEFAULT 'CO2',
  formula TEXT NOT NULL DEFAULT '',
  formula_display TEXT DEFAULT '',
  parameters TEXT NOT NULL DEFAULT '[]',
  source TEXT,
  notes TEXT,
  created_by TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_eb_period ON emission_blocks(period);

-- ─── Products & Output ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  installation_id TEXT REFERENCES installations(id),
  name TEXT NOT NULL,
  cn_code TEXT,
  is_residue INTEGER DEFAULT 0
);

-- Production output per period (versioned)
CREATE TABLE IF NOT EXISTS production_output (
  version_id TEXT PRIMARY KEY,
  stable_id TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  period TEXT NOT NULL,
  product_id TEXT REFERENCES products(id),
  process_id TEXT REFERENCES processes(id),
  quantity REAL DEFAULT 0,
  data_source TEXT,
  evidence TEXT,
  created_by TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now')),
  supersedes_version_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_po_stable ON production_output(stable_id, version_number);

-- ─── Reference Data ──────────────────────────────────────────

-- Emission factor library (versioned, per-gas)
CREATE TABLE IF NOT EXISTS emission_factors (
  id TEXT PRIMARY KEY,
  fuel_type TEXT NOT NULL,
  gas TEXT NOT NULL,
  ef_value REAL NOT NULL,
  ef_unit TEXT DEFAULT 'kg/TJ',
  ncv REAL,
  ncv_unit TEXT DEFAULT 'GJ/t',
  region TEXT DEFAULT 'GLOBAL',
  source TEXT,
  effective_date TEXT,
  version_number INTEGER DEFAULT 1
);

-- GWP factor sets
CREATE TABLE IF NOT EXISTS gwp_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  co2 REAL DEFAULT 1,
  ch4 REAL DEFAULT 29.8,
  n2o REAL DEFAULT 273,
  cf4 REAL DEFAULT 7380,
  c2f6 REAL DEFAULT 12400
);

-- ─── Audit & Snapshots ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT DEFAULT 'user',
  changed_at TEXT DEFAULT (datetime('now')),
  change_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(changed_at);

-- Calculation run snapshots
CREATE TABLE IF NOT EXISTS calculation_runs (
  run_id TEXT PRIMARY KEY,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  gwp_set_id TEXT REFERENCES gwp_sets(id),
  created_by TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now')),
  input_snapshot TEXT,
  factor_snapshot TEXT,
  results TEXT,
  lineage TEXT
);

-- ─── CBAM Settings ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cbam_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  basis TEXT DEFAULT 'ACTUAL',
  scope TEXT DEFAULT 'DIRECT_ONLY',
  cert_price_scenario TEXT DEFAULT 'MID',
  al_price_scenario TEXT DEFAULT 'MID',
  carbon_credit_eligible INTEGER DEFAULT 1,
  carbon_credit_scenario TEXT DEFAULT 'HIGH',
  imported_qty REAL DEFAULT 110000,
  cn_code TEXT DEFAULT '7601',
  good_category TEXT DEFAULT 'Aluminium'
);

-- ─── Allocation Settings ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS allocation_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  method TEXT DEFAULT 'mass',
  treat_residue_as_waste INTEGER DEFAULT 1
);
