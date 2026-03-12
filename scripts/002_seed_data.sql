-- Seed categories based on the system requirements
INSERT INTO categories (code, name, description) VALUES
  ('ADM', 'Administration of Deceased Estates', 'Handling of estates for deceased individuals'),
  ('CR', 'Corporate Rescue', 'Business rescue and corporate restructuring'),
  ('CB', 'Curator Bonis', 'Curator appointed to manage affairs of persons unable to do so'),
  ('CAL', 'Curator Ad Litem', 'Curator appointed to represent interests in litigation'),
  ('LIQ', 'Liquidations', 'Company liquidation proceedings'),
  ('SEQ', 'Sequestrations', 'Individual insolvency/sequestration proceedings')
ON CONFLICT (code) DO NOTHING;



