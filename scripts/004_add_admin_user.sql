-- Insert admin user for system management
INSERT INTO users (empid, password, full_name, role, is_active) VALUES
  ('admin001', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/ace', 'System Administrator', 'admin', true)
ON CONFLICT (empid) DO UPDATE 
  SET role = 'admin', 
      is_active = true,
      updated_at = NOW();

-- Insert some demo branch data if not exists
INSERT INTO branchparameters (branch_id, branch_name, bank_name, branch_code, bank_type, is_head_office, address, city, state, postal_code, phone_number, email)
VALUES 
  (1, 'Head Office', 'NextZen Bank', 'HO001', 'P', 1, '123 Main Street', 'New York', 'NY', '10001', '212-555-0100', 'hq@nextzenbank.com'),
  (2, 'Downtown Branch', 'NextZen Bank', 'DB001', 'B', 0, '456 Park Avenue', 'New York', 'NY', '10002', '212-555-0200', 'downtown@nextzenbank.com'),
  (3, 'Westside Branch', 'NextZen Bank', 'WB001', 'B', 0, '789 West Street', 'New York', 'NY', '10003', '212-555-0300', 'westside@nextzenbank.com')
ON CONFLICT (branch_id) DO UPDATE 
  SET modified_date = GETDATE();
