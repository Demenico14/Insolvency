-- Seed categories based on the system requirements
INSERT INTO categories (code, name, description) VALUES
  ('ADM', 'Administration of Deceased Estates', 'Handling of estates for deceased individuals'),
  ('CR', 'Corporate Rescue', 'Business rescue and corporate restructuring'),
  ('CB', 'Curator Bonis', 'Curator appointed to manage affairs of persons unable to do so'),
  ('CAL', 'Curator Ad Litem', 'Curator appointed to represent interests in litigation'),
  ('TRS', 'Trusts', 'Trust administration and management'),
  ('LIQ', 'Liquidations', 'Company liquidation proceedings'),
  ('SEQ', 'Sequestrations', 'Individual insolvency/sequestration proceedings')
ON CONFLICT (code) DO NOTHING;

-- Seed some sample officers
INSERT INTO officers (name, email, department) VALUES
  ('John Smith', 'john.smith@insolvency.gov', 'Estates'),
  ('Sarah Johnson', 'sarah.johnson@insolvency.gov', 'Corporate'),
  ('Michael Brown', 'michael.brown@insolvency.gov', 'Trusts'),
  ('Emily Davis', 'emily.davis@insolvency.gov', 'Litigation'),
  ('David Wilson', 'david.wilson@insolvency.gov', 'Records')
ON CONFLICT (email) DO NOTHING;
