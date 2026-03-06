-- Seed categories table with insolvency file categories
-- Run this script to populate the categories dropdown in the Register File form

INSERT INTO categories (code, name, description) VALUES
  ('ADM', 'ADM (Administration of Deceased Estates)', 'Administration of deceased estates, including beneficiary and guardian details'),
  ('CR', 'Corporate Rescue', 'Business rescue proceedings for companies in financial distress'),
  ('LC', 'Liquidations (Corporates)', 'Liquidation proceedings for corporate entities'),
  ('LN', 'Liquidations (Natural Persons)', 'Insolvency proceedings for natural persons'),
  ('CB', 'Curator Bonis', 'Appointment of curator bonis for incapacitated persons'),
  ('CL', 'Curator ad Litem', 'Appointment of curator ad litem for legal proceedings'),
  ('MISC', 'Miscellaneous', 'Other documents and files not fitting other categories')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;
