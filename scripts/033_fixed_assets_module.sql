/*
asset_categories
asset_items
assets_items_details
purchase details
depreciation master
depreciation details
sales details

*/

// Fixed Assets Module

CREATE TABLE asset_categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id INT NULL,
    gl_account_code VARCHAR(50), -- link to chart of accounts for asset value
    depreciation_gl_account_code VARCHAR(50), -- link to chart of accounts for depreciation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES asset_categories(category_id)
);

CREATE TABLE asset_items_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id INT NOT NULL,
    asset_id INT PRIMARY KEY AUTO_INCREMENT,
    asset_name VARCHAR(150) NOT NULL,
    category_id INT NOT NULL,

    serial_number VARCHAR(100),
    model_number VARCHAR(100),

    purchase_id INT, -- link to purchase
    purchase_date DATE,
    purchase_value DECIMAL(15,2),
    net_book_value DECIMAL(15,2),

    last_depreciation_date DATE,

    status ENUM('active','sold','scrapped','inactive') DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES asset_categories(category_id)
);

CREATE TABLE purchase_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id INT NOT NULL,
    transaction_date DATE NOT NULL,
    batch_id INT,
    voucher_no VARCHAR(50),
    purchase_id INT PRIMARY KEY AUTO_INCREMENT,
    
    invoice_no VARCHAR(100),

    vendor_name VARCHAR(150),
    vendor_gstin VARCHAR(20),
    vendor_contact VARCHAR(100),
    vendor_address TEXT,
    
    purchase_date DATE NOT NULL,
    total_amount DECIMAL(15,2),

    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id INT NOT NULL,
    purchase_item_id INT PRIMARY KEY AUTO_INCREMENT,
    purchase_id INT NOT NULL,
    asset_name VARCHAR(150),
    quantity INT DEFAULT 1,
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),

    FOREIGN KEY (purchase_id) REFERENCES purchase_details(purchase_id)
);

CREATE TABLE depreciation_master (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id INT NOT NULL,
    depreciation_id INT ,
    asset_id INT NOT NULL,

    method ENUM('SLM','WDV') NOT NULL, -- Straight Line / Written Down
    useful_life_years INT,
    depreciation_rate DECIMAL(5,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES asset_items_details(asset_id)
);

CREATE TABLE depreciation_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id INT NOT NULL,
    dep_detail_id INT ,
    asset_id INT NOT NULL,

    depreciation_date DATE,
    depreciation_amount DECIMAL(15,2),
    accumulated_depreciation DECIMAL(15,2),
    book_value DECIMAL(15,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (asset_id) REFERENCES asset_items_details(asset_id)
); 

CREATE TABLE sales_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id INT NOT NULL,

    transaction_date DATE NOT NULL,
    batch_id INT,
    voucher_no VARCHAR(50),

    sale_id INT ,
    asset_id INT NOT NULL,

    sale_date DATE,
    sale_amount DECIMAL(15,2),

    buyer_name VARCHAR(150),
    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (asset_id) REFERENCES asset_items_details(asset_id)
);

CREATE TABLE asset_parameters (
    branch_id INT PRIMARY KEY,

    depr_based_on_category BOOLEAN DEFAULT TRUE,
    depr_on_current_year_purchase BOOLEAN DEFAULT TRUE,
    depr_on_current_year_sale BOOLEAN DEFAULT TRUE,
    depr_prorata_purchase_date BOOLEAN DEFAULT FALSE,
    depr_based_on_item BOOLEAN DEFAULT FALSE,
    depr_based_on_book_value BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

// Insert default asset categories
/*
Buildings including Godowns
Computers and Electrical Installations
Condemned Others
Furniture and Fixtures
Land
Other Fixed Assets
Vehicles
*/
insert into asset_categories (category_name, description, gl_account_code, depreciation_gl_account_code) values
('Buildings including Godowns', 'All types of buildings and godowns', '24010000', '43080100'),
('Computers and Electrical Installations', 'Computers, servers, electrical installations', '24020000', '43080200'),
('Condemned Others', 'Assets that are condemned or written off', '24030000', '43080300'),
('Furniture and Fixtures', 'Office furniture, fixtures, and fittings', '24040000', '43080400'),
('Land', 'Land owned by the company', '24050000', NULL), 
('Other Fixed Assets', 'Miscellaneous fixed assets not categorized elsewhere', '24060000', '43080600'),
('Vehicles', 'Company vehicles including cars, trucks, etc.', '24070000', '43080700');


INSERT INTO chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger,parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES(23108001, 24010000, 'Buildings including Godowns', 1, B'1',24000000, 0, B'1', now(), now()),
(23108001, 24020000, 'Computers and Electrical Installations', 1, B'1',24000000, 0, B'1', now(), now()),
(23108001, 24030000, 'Condemned Others', 1, B'1',24000000, 0, B'1', now(), now()),
(23108001, 24040000, 'Furniture and Fixtures', 1, B'1',24000000, 0, B'1', now(), now()),
(23108001, 24050000, 'Land', 1, B'1',24000000, 0, B'1', now(), now()),
(23108001, 24060000, 'Other Fixed Assets', 1, B'1',24000000, 0, B'1', now(), now()),
(23108001, 24070000, 'Vehicles', 1, B'1',24000000, 0, B'1', now(), now());