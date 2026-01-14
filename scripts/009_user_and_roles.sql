CREATE TABLE staff_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(30) UNIQUE,
    full_name TEXT,
    mobile TEXT,
    email TEXT,
    password_hash TEXT,
    branch_id BIGINT REFERENCES branchparameters(branch_id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);


CREATE TABLE staff_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code TEXT UNIQUE,
    role_name TEXT,
    hierarchy_level SMALLINT
);

-- | hierarchy_level    |
-- | ------------------ |
-- | 1 – Teller         |
-- | 2 – Manager        |
-- | 3 – District Admin |
-- | 4 – State Admin    |
-- | 5 – Auditor        |

CREATE TABLE staff_role_assignments (
    staff_id UUID REFERENCES staff_users(id),
    role_id UUID REFERENCES staff_roles(id),
    PRIMARY KEY (staff_id, role_id)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_code TEXT UNIQUE,
    description TEXT
);


CREATE TABLE role_permissions_1 (
    role_id UUID REFERENCES staff_roles(id),
    permission_id UUID REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE role_permissions (
  role TEXT,
  permission_code TEXT REFERENCES permissions(code),
  PRIMARY KEY (role,permission_code)
);



CREATE TABLE approval_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module TEXT,
    record_id UUID,
    action TEXT,
    maker_id UUID,
    checker_id UUID,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT now()
);


CREATE TABLE user_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID,
    action TEXT,
    entity TEXT,
    entity_id UUID,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE staff_login_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID,
  branch_id BIGINT,
  login_time TIMESTAMP DEFAULT now(),
  ip_address TEXT,
  success BOOLEAN,
  failure_reason TEXT
);

CREATE TABLE staff_login_failures (
  staff_id UUID PRIMARY KEY,
  failure_count INT DEFAULT 0,
  locked_until TIMESTAMP
);

CREATE TABLE branch_business_day (
  branch_id BIGINT PRIMARY KEY,
  business_date DATE,
  is_open BOOLEAN DEFAULT false,
  opened_at TIMESTAMP,
  closed_at TIMESTAMP
);
