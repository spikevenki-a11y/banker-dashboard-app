CREATE TABLE ui_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  route TEXT,
  icon TEXT,
  parent_id UUID REFERENCES ui_menus(id),
  sort_order INT,
  permission_code TEXT REFERENCES permissions(permission_code),
  is_active BOOLEAN DEFAULT true
);


INSERT INTO ui_menus(label,route,icon,sort_order,permission_code) VALUES
('Dashboard','/dashboard','LayoutDashboard',1,'DASHBOARD_VIEW'),
('Members','/members','Users',2,'MEMBER_VIEW'),
('Savings','/savings','Wallet',3,'SAVINGS_VIEW'),
('Fixed Deposits','/fixed-deposits','FileText',4,'FD_VIEW'),
('Loans','/loans','CreditCard',5,'LOAN_VIEW'),
('Finance','/finance','TrendingUp',6,'FINANCE_VIEW'),
('Reports','/reports','BarChart3',7,'REPORT_VIEW'),
('Administration','/admin','ShieldAlert',8,'ADMIN_PANEL');

INSERT INTO ui_menus(label,route,icon,parent_id,sort_order,permission_code)
SELECT 'Branch Management','/admin/branches','Building2',id,1,'BRANCH_MANAGE'
FROM ui_menus WHERE label='Administration';

INSERT INTO ui_menus(label,route,icon,parent_id,sort_order,permission_code)
SELECT 'Staff Management','/admin/staff','Users',id,2,'STAFF_MANAGE'
FROM ui_menus WHERE label='Administration';

INSERT INTO ui_menus(label,route,icon,parent_id,sort_order,permission_code)
SELECT 'Day Open / Close','/admin/day','Clock',id,3,'DAY_OPEN';

