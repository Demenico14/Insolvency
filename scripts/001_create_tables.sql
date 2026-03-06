-- Officers table (assigned officers who handle files)
CREATE TABLE IF NOT EXISTS officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories lookup table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_reference TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES categories(id),
  client_name TEXT NOT NULL,
  registration_id TEXT,
  date_received DATE NOT NULL,
  assigned_officer_id UUID REFERENCES officers(id),
  physical_location TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Missing')),
  
  -- Category-specific fields stored as JSONB for flexibility
  category_details JSONB DEFAULT '{}',
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- File movements/tracking table
CREATE TABLE IF NOT EXISTS file_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('Check Out', 'Check In', 'Transfer', 'Archive', 'Retrieve')),
  from_location TEXT,
  to_location TEXT,
  checked_out_to TEXT,
  purpose TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_officer ON files(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_files_date_received ON files(date_received);
CREATE INDEX IF NOT EXISTS idx_files_reference ON files(file_reference);
CREATE INDEX IF NOT EXISTS idx_movements_file ON file_movements(file_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON file_movements(performed_at);

-- Enable Row Level Security
ALTER TABLE officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for officers (everyone can read, only authenticated can modify)
CREATE POLICY "officers_select_all" ON officers FOR SELECT TO authenticated USING (true);
CREATE POLICY "officers_insert" ON officers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "officers_update" ON officers FOR UPDATE TO authenticated USING (true);

-- RLS Policies for categories (everyone can read, only authenticated can modify)
CREATE POLICY "categories_select_all" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_insert" ON categories FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for files (authenticated users can CRUD)
CREATE POLICY "files_select_all" ON files FOR SELECT TO authenticated USING (true);
CREATE POLICY "files_insert" ON files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "files_update" ON files FOR UPDATE TO authenticated USING (true);
CREATE POLICY "files_delete" ON files FOR DELETE TO authenticated USING (true);

-- RLS Policies for file_movements
CREATE POLICY "movements_select_all" ON file_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "movements_insert" ON file_movements FOR INSERT TO authenticated WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for files table
DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
