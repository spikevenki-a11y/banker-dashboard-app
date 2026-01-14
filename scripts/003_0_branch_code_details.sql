create table public.branchcode (
  statecode int notnull,
  districtcode int notnull,
  branchtypecode int notnull,
  branchcode int notnull,
  branch_id bigint not null
) TABLESPACE pg_default;

create table public.statecodes (
  statecode int notnull,
  statename varchar(100) notnull
) TABLESPACE pg_default;

create table public.districtcodes (
  statecode int notnull,
  districtcode int notnull,
  districtname varchar(100) notnull
) TABLESPACE pg_default;
-- relaced with hierarchy_level table
-- create table public.branchtypes (
--   branchtypecode int notnull,
--   branchtypename varchar(100) notnull
-- ) TABLESPACE pg_default;

create table public.nextbranchcode (
  statecode int notnull,
  districtcode int notnull,
  branchtypecode int notnull,
  nextvalue int notnull
) TABLESPACE pg_default;

create table public.accounttypes (
  accounttypecode int notnull,
  accounttypename varchar(100) notnull
) TABLESPACE pg_default;

INSERT INTO public.nextbranchcode (statecode, districtcode, branchtypecode, nextvalue) VALUES
(23, 3, 1, 101),
(23, 3, 2, 201),
(23, 3, 3, 301);

-- replaced with hierarchy_level  table
-- INSERT INTO public.branchtypes (branchtypecode, branchtypename) VALUES
-- (1, 'HO'),
-- (2, 'SLDB'),
-- (3, 'LDB');


INSERT INTO public.statecodes (statecode, statename) VALUES
(1, 'Andhra Pradesh'),
(2, 'Arunachal Pradesh'),
(3, 'Assam'),
(4, 'Bihar'),
(5, 'Chhattisgarh'),
(6, 'Goa'),
(7, 'Gujarat'),
(8, 'Haryana'),
(9, 'Himachal Pradesh'),
(10, 'Jharkhand'),
(11, 'Karnataka'),
(12, 'Kerala'),
(13, 'Madhya Pradesh'),
(14, 'Maharashtra'),
(15, 'Manipur'),
(16, 'Meghalaya'),
(17, 'Mizoram'),
(18, 'Nagaland'),
(19, 'Odisha'),
(20, 'Punjab'),
(21, 'Rajasthan'),
(22, 'Sikkim'),
(23, 'Tamil Nadu'),
(24, 'Telangana'),
(25, 'Tripura'),
(26, 'Uttar Pradesh'),
(27, 'Uttarakhand'),
(28, 'West Bengal'),
(29, 'Andaman and Nicobar Islands'),
(30, 'Chandigarh'),
(31, 'Dadra and Nagar Haveli and Daman and Diu'),
(32, 'Delhi'),
(33, 'Jammu and Kashmir'),
(34, 'Ladakh'),
(35, 'Lakshadweep'),
(36, 'Puducherry');



INSERT INTO public.districtcodes (statecode, districtcode, districtname) VALUES
(23, 1, 'Ariyalur'),
(23, 2, 'Chengalpattu'),
(23, 3, 'Chennai'),
(23, 4, 'Coimbatore'),
(23, 5, 'Cuddalore'),
(23, 6, 'Dharmapuri'),
(23, 7, 'Dindigul'),
(23, 8, 'Erode'),
(23, 9, 'Kallakurichi'),
(23,10, 'Kanchipuram'),
(23,11, 'Kanyakumari'),
(23,12, 'Karur'),
(23,13, 'Krishnagiri'),
(23,14, 'Madurai'),
(23,15, 'Mayiladuthurai'),
(23,16, 'Nagapattinam'),
(23,17, 'Namakkal'),
(23,18, 'Nilgiris'),
(23,19, 'Perambalur'),
(23,20, 'Pudukkottai'),
(23,21, 'Ramanathapuram'),
(23,22, 'Ranipet'),
(23,23, 'Salem'),
(23,24, 'Sivaganga'),
(23,25, 'Tenkasi'),
(23,26, 'Thanjavur'),
(23,27, 'Theni'),
(23,28, 'Thoothukudi'),
(23,29, 'Tiruchirappalli'),
(23,30, 'Tirunelveli'),
(23,31, 'Tirupathur'),
(23,32, 'Tiruppur'),
(23,33, 'Tiruvallur'),
(23,34, 'Tiruvannamalai'),
(23,35, 'Tiruvarur'),
(23,36, 'Vellore'),
(23,37, 'Viluppuram'),
(23,38, 'Virudhunagar');

INSERT INTO public.nextbranchcode (statecode, districtcode, branchtypecode, nextvalue) VALUES
-- District 1 to 38, Branch Type 1
(23, 1, 1, 01),(23, 2, 1, 01),(23, 3, 1, 01),(23, 4, 1, 01),
(23, 5, 1, 01),(23, 6, 1, 01),(23, 7, 1, 01),(23, 8, 1, 01),
(23, 9, 1, 01),(23,10, 1, 01),(23,11, 1, 01),(23,12, 1, 01),
(23,13, 1, 01),(23,14, 1, 01),(23,15, 1, 01),(23,16, 1, 01),
(23,17, 1, 01),(23,18, 1, 01),(23,19, 1, 01),(23,20, 1, 01),
(23,21, 1, 01),(23,22, 1, 01),(23,23, 1, 01),(23,24, 1, 01),
(23,25, 1, 01),(23,26, 1, 01),(23,27, 1, 01),(23,28, 1, 01),
(23,29, 1, 01),(23,30, 1, 01),(23,31, 1, 01),(23,32, 1, 01),
(23,33, 1, 01),(23,34, 1, 01),(23,35, 1, 01),(23,36, 1, 01),
(23,37, 1, 01),(23,38, 1, 01),

-- District 1 to 38, Branch Type 2
(23, 1, 2, 01),(23, 2, 2, 01),(23, 3, 2, 01),(23, 4, 2, 01),
(23, 5, 2, 01),(23, 6, 2, 01),(23, 7, 2, 01),(23, 8, 2, 01),
(23, 9, 2, 01),(23,10, 2, 01),(23,11, 2, 01),(23,12, 2, 01),
(23,13, 2, 01),(23,14, 2, 01),(23,15, 2, 01),(23,16, 2, 01),
(23,17, 2, 01),(23,18, 2, 01),(23,19, 2, 01),(23,20, 2, 01),
(23,21, 2, 01),(23,22, 2, 01),(23,23, 2, 01),(23,24, 2, 01),
(23,25, 2, 01),(23,26, 2, 01),(23,27, 2, 01),(23,28, 2, 01),
(23,29, 2, 01),(23,30, 2, 01),(23,31, 2, 01),(23,32, 2, 01),
(23,33, 2, 01),(23,34, 2, 01),(23,35, 2, 01),(23,36, 2, 01),
(23,37, 2, 01),(23,38, 2, 01),

-- District 1 to 38, Branch Type 3
(23, 1, 3, 01),(23, 2, 3, 01),(23, 3, 3, 01),(23, 4, 3, 01),
(23, 5, 3, 01),(23, 6, 3, 01),(23, 7, 3, 01),(23, 8, 3, 01),
(23, 9, 3, 01),(23,10, 3, 01),(23,11, 3, 01),(23,12, 3, 01),
(23,13, 3, 01),(23,14, 3, 01),(23,15, 3, 01),(23,16, 3, 01),
(23,17, 3, 01),(23,18, 3, 01),(23,19, 3, 01),(23,20, 3, 01),
(23,21, 3, 01),(23,22, 3, 01),(23,23, 3, 01),(23,24, 3, 01),
(23,25, 3, 01),(23,26, 3, 01),(23,27, 3, 01),(23,28, 3, 01),
(23,29, 3, 01),(23,30, 3, 01),(23,31, 3, 01),(23,32, 3, 01),
(23,33, 3, 01),(23,34, 3, 01),(23,35, 3, 01),(23,36, 3, 01),
(23,37, 3, 01),(23,38, 3, 01);
