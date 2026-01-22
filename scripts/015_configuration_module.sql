CREATE TABLE config_sections (
  id VARCHAR(50) PRIMARY KEY,        -- e.g. membership
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  color VARCHAR(50),
  bg_color VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE config_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- DB internal ID
  setting_id VARCHAR(100) NOT NULL,       -- business ID
  section_id VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_setting_id UNIQUE (setting_id),
  CONSTRAINT fk_settings_section
    FOREIGN KEY (section_id)
    REFERENCES config_sections(id)
    ON DELETE CASCADE
);

INSERT INTO config_sections (id, title, description, icon, color, bg_color) VALUES
('membership','Membership Configuration','Configure member enrollment, KYC requirements, and account types','Users','text-blue-600','bg-blue-50'),
('savings','Savings Configuration','Set minimum balance, withdrawal limits and etc','Wallet','text-teal-600','bg-teal-50'),
('fixed-deposits','Fixed Deposit Configuration', 'set age limits, tenure options, Forclose options and etc','FileText','text-purple-600','bg-purple-50'),
('loans','Loan Configuration','Set loan interest rates, processing fees, and eligibility criteria','CreditCard','text-orange-600','bg-orange-50'),
('dividend','Dividend Configuration','Configure dividend calculation, distribution frequency, and eligibility','TrendingUp','text-green-600','bg-green-50'),
('shares','Share Management','Configure minumum share, transfer rules, withdrawal policies and etc','DollarSign','text-indigo-600','bg-indigo-50'),
('organization','Organization Settings','Bank details, branch information, operational hours and etc','Building2','text-cyan-600','bg-cyan-50'),
('security','Security & Compliance','Password policies, session management, and audit settings','Shield','text-red-600','bg-red-50'),
('notifications','Notifications & Alerts','Email, SMS, and in-app notification preferences','Bell','text-yellow-600','bg-yellow-50'),
('investments','Investment Configuration','Configure investment schemes, returns, and maturity rules','LineChart','text-emerald-600','bg-emerald-50'),
('borrowings','Borrowing Configuration','Configure borrowing limits, interest rates, and repayment terms','Repeat','text-rose-600','bg-rose-50'),
('users','User Management','Manage system users, roles, and access permissions','UserCog','text-slate-600','bg-slate-50'),
('assets','Asset Management','Manage organizational assets, depreciation, and valuation','Package','text-amber-600','bg-amber-50');
 

 INSERT INTO config_settings(setting_id, section_id, label, value, type)
VALUES('membership_min_age', 'membership', 'Minimum Age For Member', '100', 'number'),
('membership_nominee_required', 'membership', 'Is Nominee Compulsory While Adding New/Modify Member', 'false', 'boolean'),
('membership_kyc_required', 'membership', 'KYC Verification Required', 'true', 'boolean');

CREATE TABLE config_share(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  branch_id BIGINT NOT NULL
    REFERENCES branchparameters(branch_id),

  -- Share definition
  share_face_value NUMERIC(10,2) NOT NULL,

  -- A-Class rules
  a_class_min_share_balance NUMERIC(12,2) NOT NULL,
  a_class_max_share_balance NUMERIC(12,2) NOT NULL,

  -- B-Class rules
  b_class_share_allowed BOOLEAN NOT NULL DEFAULT false,
  b_class_min_share_balance NUMERIC(12,2),
  b_class_max_share_balance NUMERIC(12,2),

  -- Lifecycle
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT uq_share_config_branch_active
    UNIQUE (branch_id, is_active)
);
ALTER TABLE config_share
ADD COLUMN a_class_share_gl_account BIGINT NOT NULL,
ADD COLUMN b_class_share_gl_account BIGINT;

ALTER TABLE config_share
ADD COLUMN a_class_share_gl_account BIGINT NOT NULL,
ADD COLUMN b_class_share_gl_account BIGINT;


-- Optional but strongly recommended
ALTER TABLE config_share
ADD CONSTRAINT fk_config_share_a_class_gl
FOREIGN KEY (a_class_share_gl_account)
REFERENCES chart_of_accounts(accountcode);

ALTER TABLE config_share
ADD CONSTRAINT fk_config_share_b_class_gl
FOREIGN KEY (b_class_share_gl_account)
REFERENCES chart_of_accounts(accountcode);

ALTER TABLE config_share
ADD CONSTRAINT fk_share_gl_a_class
  FOREIGN KEY (a_class_share_gl_account)
  REFERENCES chart_of_accounts(accountcode);

ALTER TABLE config_share
ADD CONSTRAINT fk_share_gl_b_class
  FOREIGN KEY (b_class_share_gl_account)
  REFERENCES chart_of_accounts(accountcode);

INSERT INTO config_settings (setting_id, section_id, label, value, type) VALUES

-- Share definition
('share_face_value', 'shares', 'Face Value of One Share', '100', 'number'),

-- A-Class rules
('a_class_min_share_balance', 'shares', 'A-Class Minimum Share Balance', '1000', 'number'),
('a_class_max_share_balance', 'shares', 'A-Class Maximum Share Balance', '100000', 'number'),

-- B-Class rules
('b_class_share_allowed', 'shares', 'Allow B-Class Share Holding', 'false', 'boolean'),
('b_class_min_share_balance', 'shares', 'B-Class Minimum Share Balance', '0', 'number'),
('b_class_max_share_balance', 'shares', 'B-Class Maximum Share Balance', '0', 'number');
INSERT INTO config_settings (setting_id, section_id, label, value, type) VALUES
( 'a_class_share_gl_account', 'shares', 'A-Class Share GL Account', '', 'readonly'),
( 'b_class_share_gl_account', 'shares', 'B-Class Share GL Account', '', 'readonly');


INSERT INTO config_share (
  branch_id,

  share_face_value,

  a_class_min_share_balance,
  a_class_max_share_balance,

  b_class_share_allowed,
  b_class_min_share_balance,
  b_class_max_share_balance,

  effective_from,
  is_active
) VALUES (
  2310801,          -- Branch ID
  100.00,           -- Face value of one share
  1000.00,          -- A-Class minimum share balance
  100000.00,        -- A-Class maximum share balance
  false,            -- B-Class share allowed
  0.00,             -- B-Class minimum share balance
  0.00,             -- B-Class maximum share balance
  CURRENT_DATE,     -- Effective from today
  true              -- Active config
);
