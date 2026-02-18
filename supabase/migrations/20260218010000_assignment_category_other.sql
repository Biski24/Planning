alter table if exists public.assignments
  drop constraint if exists assignments_category_check;

alter table if exists public.assignments
  add constraint assignments_category_check
  check (category in ('VISIT','CALL','RDV','LEAD','ASYNC','MEETING','TRAINING','WFH','ABS','OTHER'));

alter table if exists public.need_slots
  drop constraint if exists need_slots_category_check;

alter table if exists public.need_slots
  add constraint need_slots_category_check
  check (category in ('VISIT','CALL','RDV','LEAD','ASYNC','MEETING','TRAINING','WFH','ABS','OTHER'));
