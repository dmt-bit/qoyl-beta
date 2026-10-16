-- Boo Basket: tool selection changes from pick-1 to pick-N (3 for Boo,
-- 5 for Big Boo). boo_orders.tool is a single NOT NULL text column with
-- a CHECK constraint - replaced with a tools text[] column instead of
-- altering the type in place, so existing rows get a clean backfill
-- rather than a risky in-place array cast.
--
-- Same note as boo_orders_stripe_link.sql: the dropped constraint name
-- is Postgres' default auto-naming for an inline column check() with no
-- explicit name - if it's actually named differently, the DROP below
-- will error and name the real one to use instead.

alter table public.boo_orders
  add column if not exists tools text[] not null default '{}';

update public.boo_orders
set tools = array[tool]
where tool is not null and tools = '{}';

alter table public.boo_orders
  drop constraint if exists boo_orders_tool_check;

alter table public.boo_orders
  drop column if exists tool;

-- Keeps the same "only real tool values" guarantee the old single-value
-- CHECK gave, extended to every element of the array and to the new
-- tool options.
alter table public.boo_orders
  add constraint boo_orders_tools_check
  check (
    tools <@ array[
      'scalp_massager', 'detangling_comb', 'satin_headband',
      'mist_spray_bottle', 'microfiber_towel', 'heatless_curl_ribbon',
      'scalp_oil_applicator'
    ]
  );
