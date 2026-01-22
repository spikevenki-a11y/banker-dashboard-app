CREATE TABLE branch_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  branch_id BIGINT NULL
    REFERENCES branchparameters(branch_id),

  holiday_date DATE NOT NULL,

  description VARCHAR(200) NOT NULL,

  is_global BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT uq_branch_holiday
    UNIQUE (branch_id, holiday_date)
);


CREATE TABLE branch_business_day (
  branch_id BIGINT PRIMARY KEY
    REFERENCES branchparameters(branch_id),

  business_date DATE NOT NULL,

  is_open BOOLEAN NOT NULL DEFAULT true,

  opened_at TIMESTAMP NOT NULL DEFAULT now(),
  opened_by UUID NOT NULL,

  closed_at TIMESTAMP,
  closed_by UUID,

  CONSTRAINT uq_branch_open_day
    CHECK (
      (is_open = true AND closed_at IS NULL)
      OR
      (is_open = false AND closed_at IS NOT NULL)
    )
);
