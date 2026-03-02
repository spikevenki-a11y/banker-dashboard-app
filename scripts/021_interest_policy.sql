CREATE TABLE interest_policy (
    policy_id      BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_code   VARCHAR(50) NOT NULL,    --from scheme tables
    base_rate      DECIMAL(5,2),
    effective_from DATE NOT NULL,
    effective_to   DATE,
    status         VARCHAR(20) DEFAULT 'ACTIVE'
);

CREATE TABLE interest_condition (
    condition_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    policy_id    BIGINT NULL,
    parent_condition_id    BIGINT NULL,
    field_name   VARCHAR(50) NOT NULL, -- e.g., 'product', 'amount', 'tenure_months', 'customer_age'
    operator     VARCHAR(10) NOT NULL,
    value_from   VARCHAR(50) NOT NULL,
    value_to     VARCHAR(50),
    interest_rate DECIMAL(5,2) NOT NULL,
    penal_rate   DECIMAL(5,2) DEFAULT 0.00,
    FOREIGN KEY (policy_id) REFERENCES interest_policy(policy_id),
    FOREIGN KEY (parent_condition_id) REFERENCES interest_condition(condition_id)
);