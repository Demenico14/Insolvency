-- Seed officers table with sample officers
-- Run this script to populate the Assigned Officer dropdown

INSERT INTO officers (name, email, department) VALUES
  ('John Mokoena', 'john.mokoena@master.gov.na', 'Insolvency'),
  ('Sarah Nghifindaka', 'sarah.nghifindaka@master.gov.na', 'Deceased Estates'),
  ('Peter Shikongo', 'peter.shikongo@master.gov.na', 'Corporate Rescue'),
  ('Maria Hamutenya', 'maria.hamutenya@master.gov.na', 'Liquidations'),
  ('David Nakale', 'david.nakale@master.gov.na', 'Curator Services')
ON CONFLICT DO NOTHING;
