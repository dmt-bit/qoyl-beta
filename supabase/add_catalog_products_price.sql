-- Adds price data to Qoyl's real curated catalog table.
--
-- The task spec that prompted this said "ALTER TABLE products" - that's
-- the wrong table. `products` is empty (0 rows) and belongs to
-- qoyl-business's schema, which shares this Supabase project (see
-- app/search/page.tsx's QOYL_PRODUCT_SELECT comment). Qoyl's actual
-- curated catalog (305 rows) is `catalog_products`, so that's what this
-- adds the column to.
--
-- REQUIRED before /routine or /search will show any product
-- recommendations at all: lib/routineProducts.ts's candidate query now
-- selects price_usd unconditionally, so until this column exists every
-- category comes back empty (visible as
-- "[routineProducts] catalog_products query failed ..." in server logs).

alter table catalog_products add column if not exists price_usd decimal(10,2);
