insert into sites (id,name,category) values
('00000000-0000-4000-8000-000000000001','Harbour Kitchen','1'),
('00000000-0000-4000-8000-000000000002','Market Counter','2')
on conflict(id) do nothing;
insert into staff (id,site_id,name,role,trained_on,training_ref,supervisor,certificate_date,certificate_ref,available) values
('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','Alex Chen','Kitchen manager',current_date-365,'archive/training/alex.pdf',true,current_date-interval '2 years','archive/fss/alex.pdf',true),
('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','Alex Patel','Counter supervisor',null,null,true,current_date-interval '6 years','archive/fss/alex-patel.pdf',true),
('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000001','Mia Singh','Cook',null,null,false,null,null,false)
on conflict(id) do nothing;
insert into suppliers (id,name,contact,approval_due,evidence_ref) values
('00000000-0000-4000-8000-000000000021','Coastal Dairy','orders@example.test',current_date-10,'archive/suppliers/dairy.pdf'),
('00000000-0000-4000-8000-000000000022','Valley Produce','sales@example.test',current_date+60,'archive/suppliers/produce.pdf')
on conflict(id) do nothing;
insert into equipment (id,site_id,name,kind,calibration_due) values
('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000001','Walk-in chiller','chiller',current_date+90),
('00000000-0000-4000-8000-000000000032','00000000-0000-4000-8000-000000000002','Counter chiller','chiller',current_date-5),
('00000000-0000-4000-8000-000000000033','00000000-0000-4000-8000-000000000001','Soup bain-marie','hot-hold',current_date+90)
on conflict(id) do nothing;
insert into checks (id,site_id,equipment_id,name,kind,observed_at,operator,temperature_c,cooled_21_at,cooled_5_at,retain_until) values
('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000031','Milk sample','cold',now()-interval '1 hour','Alex Chen',8,null,null,current_date+120),
('00000000-0000-4000-8000-000000000042','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000033','Pumpkin soup','hot',now()-interval '1 hour','Mia Singh',63,null,null,current_date+120),
('00000000-0000-4000-8000-000000000043','00000000-0000-4000-8000-000000000001',null,'Chicken stock batch C19','cooling',now()-interval '1 day','Mia Singh',60,now()-interval '21 hours',now()-interval '16 hours',current_date+120),
('00000000-0000-4000-8000-000000000044','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000032','Sandwich filling','cold',now()-interval '3 days','Alex Patel',4,null,null,current_date+120)
on conflict(id) do nothing;
insert into cleaning (id,site_id,name,due_at,operator) values
('00000000-0000-4000-8000-000000000051','00000000-0000-4000-8000-000000000001','Sanitise preparation bench',now()-interval '2 hours','Mia Singh'),
('00000000-0000-4000-8000-000000000052','00000000-0000-4000-8000-000000000002','Clean slicer',now()+interval '5 hours','Alex Patel')
on conflict(id) do nothing;
insert into deliveries (id,site_id,supplier_id,name,batch,received_at,temperature_c,state,operator,evidence_ref) values
('00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000021','Milk crates','MILK-628',now()-interval '1 day',9,'held','Alex Chen','archive/deliveries/628.pdf'),
('00000000-0000-4000-8000-000000000062','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000022','Lettuce','VEG-124',now()-interval '2 hours',4,'accepted','Mia Singh','archive/deliveries/124.pdf')
on conflict(id) do nothing;
insert into actions (id,site_id,check_id,name,owner,due_at) values
('00000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000041','Review warm milk and chiller','Alex Chen',now()-interval '30 minutes'),
('00000000-0000-4000-8000-000000000072','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000043','Review stock cooling process','Mia Singh',now()-interval '8 hours')
on conflict(id) do nothing;
