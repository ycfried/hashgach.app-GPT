-- The jurisdiction policy includes principals, so the older principal-only insert
-- policy is redundant and would be evaluated on every insert.
drop policy if exists principal_offering_insert on public.class_offerings;
