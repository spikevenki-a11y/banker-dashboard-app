-- Create users table for simple table-based authentication
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empid VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Store hashed password
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- RLS Policies for users table


-- Allow anyone to read users (for login verification)
CREATE POLICY "Allow login verification" ON users
  FOR SELECT
  USING (true);

  
-- Create a function to hash passwords (simple MD5 for demo)
CREATE OR REPLACE FUNCTION hash_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN md5(plain_password);
END;
$$ LANGUAGE plpgsql;


-- Cast VARCHAR columns to TEXT to match function return type
CREATE OR REPLACE FUNCTION verify_password(empid_input TEXT, password_input TEXT)
RETURNS TABLE(user_id UUID, empid TEXT, full_name TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.empid::TEXT, u.full_name::TEXT, u.role::TEXT
  FROM users u
  WHERE u.empid = empid_input 
    AND u.password = md5(password_input)
    AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Seed users with login credentials
-- Password for all users: "password123" (hashed as MD5)

INSERT INTO users (empid, password, full_name, role, is_active) VALUES
  ('sldb00001', md5('password123'), 'Rajnagar', 'role1', true),
  ('sldb00002', md5('password123'), 'Basavakalyan', 'role1', true),
  ('sldb00003', md5('password123'), 'Super', 'role1', true)
ON CONFLICT (empid) DO UPDATE 
  SET password = EXCLUDED.password,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();
