create table loan_purpose_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose_id int not null unique,
    purpose_name varchar(255) not null,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
insert into loan_purpose_master (purpose_id, purpose_name) values
(1, 'Working Capital'),
(2, 'Term Loan'),
(3, 'Project Finance'),
(4, 'Personal Loan'),
(5, 'Education Loan'),
(6, 'Home Loan'),
(7, 'Vehicle Loan'),
(8, 'Agricultural Loan'),
(9, 'Microfinance Loan'),
(10, 'Gold'),
(11, 'Other');

create table loan_scheme_purpose_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id int not null,
    scheme_id int not null,
    purpose_id int not null,
    foreign key (branch_id) references branchparameters(branch_id),
    foreign key (purpose_id) references loan_purpose_master(purpose_id)
);

insert into loan_scheme_purpose_mapping (branch_id, scheme_id, purpose_id) values
(23108001, 501, 9),
(23108001, 501,11);

create table loan_scheme_security_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id int not null unique,
    security_name varchar(255) not null,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

insert into loan_scheme_security_master (security_id, security_name) values
(1, 'Land'),
(2, 'Building'),
(3, 'Machinery'),
(4, 'Inventory'),
(5, 'Accounts Receivable'),
(6, 'Gold'),
(7, 'Vehicle'),
(8, 'Deposit'),
(9, 'Other');


create table loan_scheme_security_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id int not null,
    scheme_id int not null,
    security_id int not null,
    foreign key (branch_id) references branchparameters(branch_id),
    foreign key (security_id) references security_master(security_id)
);

insert into loan_scheme_security_mapping (branch_id, scheme_id, security_id) values
(23108001, 501, 8);

CREATE TABLE security_details (
    branch_id INT,
    account_number VARCHAR(50),
    security_type VARCHAR(50),
    security_detail VARCHAR(100),  -- 4th column (flexible)
    security_value DECIMAL(15,2),
    maximum_allowed_amount DECIMAL(15,2)
);
