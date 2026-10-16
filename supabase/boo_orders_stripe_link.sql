-- Boo Basket: switch the reservation deposit to a hosted Stripe Payment
-- Link instead of auto_charge/tap_to_pay. payment_method is NOT NULL
-- with a CHECK constraint from the original create_boo_orders.sql -
-- widened here to also allow 'stripe_link' rather than dropped
-- entirely, so the column still carries a meaningful value.
--
-- Constraint name assumed from Postgres' default auto-naming for an
-- inline column `check (...)` with no explicit name
-- (<table>_<column>_check) - if this errors because the name differs,
-- check the real name under Database > Tables > boo_orders >
-- Constraints in the Supabase dashboard and drop that one instead.

alter table public.boo_orders
  drop constraint boo_orders_payment_method_check;

alter table public.boo_orders
  add constraint boo_orders_payment_method_check
  check (payment_method in ('auto_charge', 'tap_to_pay', 'stripe_link'));
