-- Reference data for Sahlafood, for use after scripts/neon-bootstrap.sql.
--
-- Ids are preserved from the original Supabase database so profiles and
-- restaurants.owner_id keep pointing at the right auth users. Auth passwords
-- are NOT portable: the migrated users must sign in via OAuth or reset.
--
-- Neon rejects multiple commands in one prepared statement, so this file is
-- meant to be run statement by statement (psql -f, or one call per statement).

-- ---------------------------------------------------------------------------
-- Auth users
-- ---------------------------------------------------------------------------
-- Neon Auth (Better Auth) stores users in neon_auth."user". Note the quoted
-- camelCase columns: "emailVerified", "createdAt", "updatedAt".
insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role) values
('b5dcb7e0-9375-4b8a-993d-c6cb2397c7ac','queenoflovetik','queenoflovetik@gmail.com',false,now(),now(),'2026-10-05 09:22:43.236484+00'),
('2ee937e0-e44b-4364-b048-62c6ef736cb1','Probe User','sf_probe_1791461680436@gmail.com',false,now(),now(),'2026-10-08 12:14:45.143104+00'),
('a7083aed-489f-47f1-9f15-aa122a7fc2e5','mieleltahar','mieleltahar@gmail.com',false,now(),now(),'2026-10-08 15:36:03.261962+00'),
('1e6d394d-34b9-4f69-ae66-a7aea67c623d','El-Tahar Tahar','foujroux@gmail.com',false,now(),now(),'2026-10-08 17:53:12.817416+00')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
insert into public.profiles (id, full_name, phone, role, preferred_language, created_at) values
('b5dcb7e0-9375-4b8a-993d-c6cb2397c7ac','','','client','fr','2026-10-08 11:37:13.854889+00'),
('2ee937e0-e44b-4364-b048-62c6ef736cb1','Probe User','+213555000000','driver','fr','2026-10-08 12:14:45.141104+00'),
('a7083aed-489f-47f1-9f15-aa122a7fc2e5','','','client','fr','2026-10-08 15:36:03.260966+00'),
('1e6d394d-34b9-4f69-ae66-a7aea67c623d','El-Tahar Tahar','+213542604846','client','fr','2026-10-08 17:53:12.815641+00')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Restaurants
-- ---------------------------------------------------------------------------
insert into public.restaurants (id,name_fr,name_ar,type,category_fr,category_ar,phone,address,wilaya,commune,lat,lng,rating,is_open,avg_delivery_min,image,created_at) values
('3050afb5-08a4-4a35-a038-0bdbcc88900e','Restaurant El Baraka','مطعم البركة','restaurant','Cuisine algérienne','مطبخ جزائري','0550123456','Rue Didouche Mourad, Alger','Alger','Alger Centre',36.7538,3.0588,4.5,true,25,'https://images.unsplash.com/photo-1504674900247-0877df9cc836','2026-10-04 15:29:35.496136+00'),
('8c5202b9-444b-437c-a135-deaae566c163','Pizzeria Luigi','بيتزا لويجي','restaurant','Pizza','بيتزا','0551112233','Rue Larbi Ben Mhidi','Alger','Alger Centre',36.7693,3.0509,4.2,true,20,'https://images.unsplash.com/photo-1513104890138-7c749659a591','2026-10-04 15:29:35.496136+00'),
('0f691197-a15b-42c5-93ce-60d8641a82c8','Chez Momo Grillade','عند مومو شواء','restaurant','Grillades','مشويات','0551987654','Avenue Mohamed V, Oran','Oran','Oran Centre',35.6971,-0.6308,4.6,true,30,'https://images.unsplash.com/photo-1544025162-d76694265947','2026-10-04 15:29:35.496136+00'),
('ca824570-65e7-4d05-8ca5-a85c9c883e99','Snack Fasty','سناك فاستي','restaurant','Fast food','وجبات سريعة','0551223344','Boulevard de la Soummam, Sétif','Sétif','Sétif',36.1905,5.4108,4.0,true,15,'https://images.unsplash.com/photo-1550547660-d9450f859349','2026-10-04 15:29:35.496136+00'),
('c5afc5ff-41d3-43f5-843d-6d39a785c241','Épicerie Monoprix El Bahdja','بقالة باهجة','grocery','Superette','سوبريت','0551445566','Rue Hassiba Ben Bouali','Alger','Bab El Oued',36.7867,3.0503,4.3,true,20,'https://images.unsplash.com/photo-1578916171728-46686eac8d58','2026-10-04 15:29:35.496136+00'),
('5025fe09-2b74-4657-9aec-3f45f39c651f','Marché El Khedra','سوق الخضرة','grocery','Fruits et légumes','فواكه وخضر','0551778899','Place du 1er Novembre, Constantine','Constantine','Constantine',36.365,6.6147,4.4,true,25,'https://images.unsplash.com/photo-1542838132-92c53300491e','2026-10-04 15:29:35.496136+00'),
('1d14a461-1c8b-42bd-b05a-1636850e50f0','Boucherie El Warda','ملحمة الوردة','grocery','Boucherie','ملحمة','0551667788','Rue des Frères Bouadou','Alger','Belouizdad',36.7389,3.0934,4.1,true,15,'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f','2026-10-04 15:29:35.496136+00')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Menu items
-- ---------------------------------------------------------------------------
insert into public.menu_items (id,restaurant_id,name_fr,name_ar,price,category_fr,category_ar,image) values
('d99d02de-54a9-4e40-b927-de334e150e01','0f691197-a15b-42c5-93ce-60d8641a82c8','Brik aux œufs','بريك بالبيض',180,'Entrées','مقبلات','https://images.unsplash.com/photo-1606755962773-d324e0a13086'),
('2ee9a6f1-0768-414f-a92f-b42f2f8fb124','0f691197-a15b-42c5-93ce-60d8641a82c8','Méchoui d''agneau (portion)','مشوي خروف (حصة)',1200,'Grillades','مشويات','https://images.unsplash.com/photo-1544025162-d76694265947'),
('a86986ef-9736-41c8-98dd-d87994e47072','1d14a461-1c8b-42bd-b05a-1636850e50f0','Viande hachée (kg)','لحم مفروم (كغ)',2400,'Viandes','لحوم','https://images.unsplash.com/photo-1607623814075-e51df1bdc82f'),
('85172c38-0387-46ba-87db-fa18b5c17e94','3050afb5-08a4-4a35-a038-0bdbcc88900e','Chorba frik','شوربة فريك',450,'Soupes','شوربات','https://images.unsplash.com/photo-1603133872878-684f208fb84b'),
('bea935dd-a5e5-4ce0-8645-11a452e8ec43','3050afb5-08a4-4a35-a038-0bdbcc88900e','Couscous royal','كسكس ملكي',1400,'Plats','أطباق','https://images.unsplash.com/photo-1584273143981-41c073dfe8f8'),
('c37edc80-ec2f-4121-ad14-e23159e2fdb6','5025fe09-2b74-4657-9aec-3f45f39c651f','Pommes de terre (kg)','بطاطا (كغ)',90,'Légumes','خضر','https://images.unsplash.com/photo-1518977676601-b53f82aba655'),
('bdb85a1f-909d-4188-9b95-c1f5921b18f0','5025fe09-2b74-4657-9aec-3f45f39c651f','Tomates (kg)','طماطم (كغ)',120,'Légumes','خضر','https://images.unsplash.com/photo-1592841200221-a6898f307baa'),
('99d067c6-293e-4c70-9878-6520d2907b46','8c5202b9-444b-437c-a135-deaae566c163','Pizza 4 Fromages','بيتزا 4 أجبان',1100,'Pizzas','بيتزا','https://images.unsplash.com/photo-1593560708920-61dd98c46a4e'),
('7e00d362-c8fc-4567-b2f2-d1ff3eecc5f5','8c5202b9-444b-437c-a135-deaae566c163','Pizza Margherita','بيتزا مارغريتا',850,'Pizzas','بيتزا','https://images.unsplash.com/photo-1574071318508-1cdbab80d002'),
('57177284-9881-4342-b97d-3ed0a09ba5f7','c5afc5ff-41d3-43f5-843d-6d39a785c241','Lait 1L','حليب 1 لتر',150,'Épicerie','بقالة','https://images.unsplash.com/photo-1550583724-b2692b85b150'),
('e5f8538d-52a5-42d7-9150-17c64e91b714','c5afc5ff-41d3-43f5-843d-6d39a785c241','Pain (baguette)','خبز (باغايت)',20,'Épicerie','بقالة','https://images.unsplash.com/photo-1608198093002-ad4e005484ec'),
('8b4d8832-77b9-419d-9a2f-9ad53813ab01','ca824570-65e7-4d05-8ca5-a85c9c883e99','Sandwich poulet','سندويتش دجاج',350,'Fast food','وجبات سريعة','https://images.unsplash.com/photo-1606755962773-d324e0a13086'),
('e98d552b-c0ea-48b5-a03d-a1390bf52a9c','ca824570-65e7-4d05-8ca5-a85c9c883e99','Tacos algérien','تاكوس جزائري',500,'Fast food','وجبات سريعة','https://images.unsplash.com/photo-1550547660-d9450f859349')
on conflict (id) do nothing;