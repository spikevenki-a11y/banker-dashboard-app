CREATE TABLE NextNumber (
    branch_id INT NOT NULL foreign key REFERENCES public.branchparams(branch_id) ON DELETE CASCADE,
    accounttype INT NOT NULL,
    NextValue BIGINT NOT NULL,
    CreatedDate TIMESTAMPTZ DEFAULT NOW(),
    ModifiedDate TIMESTAMPTZ DEFAULT NOW()
);