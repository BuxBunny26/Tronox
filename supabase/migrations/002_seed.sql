-- ============================================================
-- Seed Data: Delay Codes & Initial Plant
-- ============================================================

-- Delay codes (exact from Tronox job cards)
insert into delay_codes (code, category, description) values
  ('M01', 'delay', 'Delay: Abnormal Travel Time'),
  ('M02', 'delay', 'Delay: No Transport'),
  ('M03', 'delay', 'Delay: Spares Issuing - Stores'),
  ('M04', 'delay', 'Delay: No Personnel to Assist'),
  ('M05', 'delay', 'Delay: No Support Equipment'),
  ('M06', 'delay', 'Delay: PTO / Training'),
  ('M07', 'delay', 'Delay: Equipment Handed Over Late'),
  ('M08', 'delay', 'Delay: Waiting for Permit'),
  ('M09', 'delay', 'Delay: Waiting for Lockout'),
  ('M10', 'delay', 'Delay: Return Stock to Stores'),
  ('N00', 'not_done', 'Not Done: Supervisor Decision'),
  ('N01', 'not_done', 'Not Done: No Personnel'),
  ('N02', 'not_done', 'Not Done: No Support Equipment'),
  ('N03', 'not_done', 'Not Done: Attend to Breakdown'),
  ('N04', 'not_done', 'Not Done: Spares Not in Stock'),
  ('N05', 'not_done', 'Not Done: Equipment Not in Use'),
  ('N06', 'not_done', 'Not Done: Activity Postponed'),
  ('N07', 'not_done', 'Not Done: Equipment Unavailable');

-- Tronox KZN Sands plants
insert into plants (name, code, description) values
  ('Mineral Separation Plant', 'MSP', 'THK-MPP - Mineral Processing Plant'),
  ('Slag Processing Plant', 'SPP', 'THK-SPP - Slag Processing Plant');

-- Planner groups (from job cards)
insert into planner_groups (code, name, plant_id)
select 'K05-MSP-Wet', 'K05-MSP Wet', id from plants where code = 'MSP';

insert into planner_groups (code, name, plant_id)
select 'K10-Slag', 'K10-Slag', id from plants where code = 'SPP';

-- Work centres (from job cards)
insert into work_centres (code, name, plant_id)
select 'KE1A-SUP-MSP-WET', 'KE1A SUPERVISOR - MSP WET', id from plants where code = 'MSP';

insert into work_centres (code, name, plant_id)
select 'KE1CF-ARTISAN-SLAG', 'KE1CF ARTISAN FITTER - SLAG PLANT', id from plants where code = 'SPP';

-- Common Functional Locations - MSP
insert into functional_locations (code, description, plant_id)
select code, description, (select id from plants where code = 'MSP') from (values
  ('THK-MPP-402-SRP-CNV', 'CONVEYORS - HMC STORAGE & FEED SYSTEM'),
  ('THK-MPP-402-SRP-FDR', 'FEEDERS-BULK STORAGE & FEED SYSTEM'),
  ('THK-MPP-412-SRP-ATT', 'ATTRITIONERS-NON-MAGS FEED PREPARAT'),
  ('THK-MPP-412-SRP-FLR-020', 'BELT FILTER-NON-MAGS'),
  ('THK-MPP-414-SRP-CNV', 'CONVEYORS-PRIMARY DRY CIRCUIT'),
  ('THK-MPP-414-SRP-FDR', 'FEEDERS-PRIMARY DRY CIRCUIT'),
  ('THK-MPP-415-SRP-ATT', 'ATTRITIONERS'),
  ('THK-MPP-415-SRP-CNV', 'CONVEYORS-RUTILE ATTRITIONING CIRCUIT'),
  ('THK-MPP-415-SRP-FAN', 'FANS-RUTILE ATTRITIONING CIRCUIT'),
  ('THK-MPP-415-SRP-FAN-042', 'FAN'),
  ('THK-MPP-415-SRP-FAN-050', 'FAN FOR RE-HEATER'),
  ('THK-MPP-415-SRP-FDR', 'FEEDERS-RUTILE ATTRITIONING CIRCUIT'),
  ('THK-MPP-415-SRP-FLR', 'BELT FILTERS-RUTILE ATTRITIONING CIRCUIT'),
  ('THK-MPP-415-SRP-FLR-040', 'BELT FILTER-DEWATERING'),
  ('THK-MPP-415-SRP-PMP', 'PUMPS-RUTILE ATTRITIONING CIRCUIT'),
  ('THK-MPP-415-SRP-PMP-035', 'PUMP ASSEMBLY-TO BELT FILTER'),
  ('THK-MPP-415-SRP-PMP-036', 'SUMP 33 OVERFLOW PUMP PU36'),
  ('THK-MPP-416-SRP-CNV', 'CONVEYORS-RUTILE / LEUCOXENE DRY CIRCUIT'),
  ('THK-MPP-416-SRP-CNV-051', 'TUBULAR FEEDER FROM BIN 51'),
  ('THK-MPP-416-SRP-CNV-052', 'TUBULAR FEEDER FROM BIN 52'),
  ('THK-MPP-416-SRP-CNV-053', 'TUBULAR FEEDER FROM FEEDER 52'),
  ('THK-MPP-418-SRP-BLO', 'BLOWERS-HOT ACID LEACH CIRCUIT'),
  ('THK-MPP-418-SRP-BLO-014', 'BLOWER-FOR SULPHUR STRIPPING'),
  ('THK-MPP-418-SRP-ATT', 'ATTRITIONERS-HOT ACID LEACH CIRCUIT'),
  ('THK-MPP-418-SRP-FAN', 'FANS-HOT ACID LEACH CIRCUIT'),
  ('THK-MPP-418-SRP-FDR', 'FEEDERS-HOT ACID LEACH CIRCUIT'),
  ('THK-MPP-418-SRP-FDR-070', 'FEEDER-SCREW LIME'),
  ('THK-MPP-418-SRP-FDR-071', 'FEEDER-SCREW LIME'),
  ('THK-MPP-418-SRP-PMP', 'PUMPS-HOT ACID LEACH CIRCUIT'),
  ('THK-MPP-418-SRP-PMP-043', 'PUMP ASSY-TO ATTRITION CELLS'),
  ('THK-MPP-418-SRP-PMP-044', 'PUMP ASSY-TO ATTRITION ZIRCON SUMP'),
  ('THK-MPP-418-SRP-PMP-046', 'PUMP ASSY-TO FILTER PRESS FEED TANK'),
  ('THK-MPP-418-SRP-PMP-055', 'PUMP ASSY-TO HOT ACID LEACH REACTOR'),
  ('THK-MPP-418-SRP-PMP-056', 'PUMP ASSY-TO HOT ACID LEACH REACTOR'),
  ('THK-MPP-418-SRP-PMP-057', 'PUMP ASSY-HYDRATED LIME MIXER TANK'),
  ('THK-MPP-418-SRP-PMP-058', 'PUMP ASSY-HYDRATED LIME MIXER TANK'),
  ('THK-MPP-418-SRP-PMP-061', 'PUMP SUMP-CRUSHED LIME MIXER TANK')
) as t(code, description);

-- Common Functional Locations - Slag Processing Plant
insert into functional_locations (code, description, plant_id)
select code, description, (select id from plants where code = 'SPP') from (values
  ('THK-SPP-CBP', '602 - SLAG COOLING'),
  ('THK-SPP-CBP-001', 'SLAG COOLING BELT CONVEYOR 1'),
  ('THK-SPP-CBP-002', 'SLAG COOLING BELT CONVEYOR 2')
) as t(code, description);
