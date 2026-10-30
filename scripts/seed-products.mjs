// Seeds 16 real hair-care products into the LIVE catalog
// (catalog_products / catalog_brands / catalog_product_ingredients) -
// not the products/brands/product_ingredients tables this task was
// originally described against. Checked live: those three tables exist
// with exactly the columns described, but nothing in qoyl-beta or
// qoyl-business ever queries them. catalog_products already holds 654
// real rows and is what search/style-match/the shopping list actually
// read from. Confirmed with the user before writing this.
//
// Known gaps vs. the original ask, confirmed live and worth knowing:
//
// - catalog_products has no amazon_asin or brand_partner column, so
//   neither is stored anywhere here. (Several of the ASINs given also
//   look like a placeholder sequence - B00KEOB9PI, QW, R6, S5, T4, U3,
//   V2 - rather than real Amazon ASINs, so even a place to put them
//   wouldn't be worth trusting blindly.)
// - catalog_product_ingredients has no raw_label_text/is_resolved
//   columns (just product_id/ingredient_id/position/created_at), so an
//   ingredient that doesn't match anything in `ingredients` is skipped
//   (no row inserted for it) rather than recorded as unresolved - it's
//   reported in this script's output instead. The full original
//   ingredient list still survives on the product itself either way,
//   via ingredient_list_raw / ingredient_list_normalized.
// - Ingredients are matched by an exact, case-insensitive match against
//   every ingredients.common_name/inci_name (trailing "*" and
//   surrounding whitespace stripped), loaded once up front - not a live
//   ILIKE substring query. A substring match on "glycerin" also matches
//   rows like "Ethylhexylglycerin", which would silently mislink the
//   wrong ingredient; an exact match on the cleaned string doesn't.
// - categories has no exact slug for "scalp oil" / "scalp serum" /
//   "edge control" - mapped to the closest real category (oil /
//   scalp-treatment / styler respectively, noted per-product below).
// - Brands already in catalog_brands (SheaMoisture, As I Am, Camille
//   Rose, Cantu, Eco Style, Aunt Jackie's, Not Your Mother's, Mielle
//   Organics) are reused by id rather than duplicated. The Ordinary,
//   Ebin New York, and Murray's don't exist yet and are created.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/seed-products.mjs            # dry run - prints the plan, writes nothing
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/seed-products.mjs --commit   # actually writes

import { createClient } from "@supabase/supabase-js";

const COMMIT = process.argv.includes("--commit");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// --- product data (from the request, with the one explicit swap: the
// Mielle Babassu & Mint Deep Conditioner "used as shampoo" entry
// replaced with As I Am Curl Clarity Shampoo - the real Mielle Babassu
// & Mint product still appears below, correctly, as a deep conditioner) --

const PRODUCTS = [
  {
    name: "SheaMoisture Manuka Honey & Mafura Oil Hydration Shampoo",
    brand: "SheaMoisture",
    categorySlug: "shampoo",
    ingredients: ["water", "cocamidopropyl betaine", "sodium lauroyl methyl isethionate", "glycerin", "manuka honey", "mafura oil", "baobab oil", "panthenol", "niacinamide"],
  },
  {
    name: "As I Am Curl Clarity Shampoo",
    brand: "As I Am",
    categorySlug: "shampoo",
    ingredients: ["water", "cocamidopropyl betaine", "sodium lauroyl sarcosinate", "glycerin", "aloe vera", "tea tree oil", "peppermint oil", "panthenol"],
  },
  {
    name: "SheaMoisture Manuka Honey & Yogurt Hydrate & Repair Conditioner",
    brand: "SheaMoisture",
    categorySlug: "conditioner",
    ingredients: ["water", "cetearyl alcohol", "behentrimonium chloride", "manuka honey", "yogurt protein", "mafura oil", "shea butter", "glycerin", "panthenol"],
  },
  {
    name: "Camille Rose Curl Love Moisture Milk",
    brand: "Camille Rose",
    // No exact "leave-in conditioner" slug - "leave-in" is the real category.
    categorySlug: "leave-in",
    ingredients: ["water", "aloe vera", "glycerin", "marshmallow root", "honey", "shea butter", "jojoba oil", "cetyl alcohol", "panthenol"],
  },
  {
    name: "SheaMoisture Coconut & Hibiscus Curl Enhancing Smoothie",
    brand: "SheaMoisture",
    categorySlug: "curl-cream",
    ingredients: ["water", "shea butter", "coconut oil", "hibiscus flower extract", "silk protein", "neem oil", "glycerin", "cetyl alcohol"],
  },
  {
    name: "Cantu Shea Butter for Natural Hair Moisturizing Curl Activator Cream",
    brand: "Cantu",
    categorySlug: "curl-cream",
    ingredients: ["water", "shea butter", "glycerin", "cetyl alcohol", "behentrimonium chloride", "panthenol", "aloe vera", "coconut oil"],
  },
  {
    name: "Eco Style Olive Oil Gel",
    brand: "Eco Style",
    categorySlug: "gel",
    ingredients: ["water", "carbomer", "glycerin", "olive oil", "triethanolamine", "polyquaternium-11", "panthenol"],
  },
  {
    name: "Aunt Jackie's Don't Shrink Flaxseed Elongating Curling Gel",
    brand: "Aunt Jackie's",
    categorySlug: "gel",
    ingredients: ["water", "flaxseed extract", "glycerin", "carbomer", "aloe vera", "castor oil", "panthenol", "triethanolamine"],
  },
  {
    name: "Cantu Wave Whip Curling Mousse",
    brand: "Cantu",
    categorySlug: "mousse",
    ingredients: ["water", "glycerin", "PVP", "dimethicone", "aloe vera", "shea butter", "coconut oil", "panthenol", "triethanolamine"],
  },
  {
    name: "Not Your Mother's Curl Talk Frizz Control Sculpting Gel-Cream",
    brand: "Not Your Mother's",
    categorySlug: "mousse",
    ingredients: ["water", "glycerin", "carbomer", "aloe vera", "argan oil", "keratin", "panthenol", "triethanolamine"],
  },
  {
    name: "Mielle Organics Babassu & Mint Deep Conditioner",
    brand: "Mielle Organics",
    categorySlug: "deep-conditioner",
    ingredients: ["water", "cetearyl alcohol", "babassu oil", "peppermint oil", "glycerin", "behentrimonium chloride", "biotin", "panthenol", "shea butter"],
  },
  {
    name: "SheaMoisture Jamaican Black Castor Oil Strengthen & Restore Treatment Masque",
    brand: "SheaMoisture",
    categorySlug: "deep-conditioner",
    ingredients: ["water", "jamaican black castor oil", "shea butter", "peppermint oil", "glycerin", "cetearyl alcohol", "behentrimonium chloride", "panthenol"],
  },
  {
    name: "Mielle Organics Rosemary Mint Scalp & Hair Strengthening Oil",
    brand: "Mielle Organics",
    // No exact "scalp oil" slug - "oil" is the real category.
    categorySlug: "oil",
    ingredients: ["safflower oil", "rosemary oil", "peppermint oil", "biotin", "jojoba oil", "coconut oil"],
  },
  {
    name: "The Ordinary Multi-Peptide Serum for Hair Density",
    brand: "The Ordinary",
    // No exact "scalp serum" slug - "scalp-treatment" is the closest real category.
    categorySlug: "scalp-treatment",
    ingredients: ["water", "glycerin", "acetyl tetrapeptide-3", "biotinoyl tripeptide-1", "panthenol", "niacinamide", "caffeine"],
  },
  {
    name: "Ebin New York 24 Hour Edge Tamer",
    brand: "Ebin New York",
    // No "edge control" category exists - "styler" is the closest real category.
    categorySlug: "styler",
    ingredients: ["water", "glycerin", "carbomer", "PVP", "aloe vera", "argan oil", "castor oil", "triethanolamine"],
  },
  {
    name: "Murray's Gel-loc Lock",
    brand: "Murray's",
    categorySlug: "styler",
    ingredients: ["water", "PVP", "glycerin", "carbomer", "panthenol", "triethanolamine"],
  },
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(s) {
  return s.trim().replace(/\*+$/, "").trim().toLowerCase();
}

async function main() {
  console.log(COMMIT ? "Running in COMMIT mode - this will write to Supabase.\n" : "Running in DRY RUN mode - no writes will happen. Pass --commit to write.\n");

  // Load everything needed for matching/resolution once, up front.
  const [ingredientsRes, categoriesRes, brandsRes] = await Promise.all([
    supabase.from("ingredients").select("id, common_name, inci_name"),
    supabase.from("categories").select("id, slug"),
    supabase.from("catalog_brands").select("id, name"),
  ]);

  if (ingredientsRes.error) throw ingredientsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (brandsRes.error) throw brandsRes.error;

  const ingredientByName = new Map();
  for (const row of ingredientsRes.data) {
    if (row.common_name) ingredientByName.set(normalize(row.common_name), row.id);
    if (row.inci_name) ingredientByName.set(normalize(row.inci_name), row.id);
  }

  const categoryBySlug = new Map(categoriesRes.data.map((c) => [c.slug, c.id]));
  const brandByName = new Map(brandsRes.data.map((b) => [b.name.toLowerCase(), b.id]));

  const unresolvedReport = [];
  const newBrandsCreated = [];
  let productsCreated = 0;
  let ingredientLinksCreated = 0;

  for (const product of PRODUCTS) {
    const categoryId = categoryBySlug.get(product.categorySlug);
    if (!categoryId) {
      console.error(`SKIPPING "${product.name}" - category slug "${product.categorySlug}" not found. This shouldn't happen; categories must have changed since this script was written.`);
      continue;
    }

    let brandId = brandByName.get(product.brand.toLowerCase());
    if (!brandId) {
      const brandSlug = slugify(product.brand);
      if (COMMIT) {
        const { data, error } = await supabase
          .from("catalog_brands")
          .insert({ name: product.brand, slug: brandSlug })
          .select("id")
          .single();
        if (error) throw error;
        brandId = data.id;
        brandByName.set(product.brand.toLowerCase(), brandId);
      }
      newBrandsCreated.push(product.brand);
      console.log(`${COMMIT ? "Created" : "Would create"} new brand: ${product.brand} (slug: ${brandSlug})`);
    }

    const matchedIngredientIds = product.ingredients.map((name) => ingredientByName.get(normalize(name)) ?? null);
    product.ingredients.forEach((name, i) => {
      if (!matchedIngredientIds[i]) {
        unresolvedReport.push({ product: product.name, ingredient: name });
      }
    });

    const matchedCount = matchedIngredientIds.filter(Boolean).length;
    console.log(
      `${COMMIT ? "Creating" : "Would create"} "${product.name}" [${product.categorySlug}] - ${matchedCount}/${product.ingredients.length} ingredients matched`
    );

    if (!COMMIT) continue;

    const { data: insertedProduct, error: productError } = await supabase
      .from("catalog_products")
      .insert({
        name: product.name,
        brand_id: brandId,
        category_id: categoryId,
        is_verified: true,
        is_active: true,
        // catalog_products has a check constraint on source - every one
        // of the existing 654 rows uses "manual" and nothing else, so
        // that's the only value confirmed to pass it.
        source: "manual",
        ingredient_list_raw: product.ingredients.join(", "),
        ingredient_list_normalized: product.ingredients.map(normalize),
      })
      .select("id")
      .single();

    if (productError) throw productError;
    productsCreated++;

    const links = [];
    matchedIngredientIds.forEach((ingredientId, i) => {
      if (ingredientId) {
        links.push({ product_id: insertedProduct.id, ingredient_id: ingredientId, position: i + 1 });
      }
    });

    if (links.length) {
      const { error: linkError } = await supabase.from("catalog_product_ingredients").insert(links);
      if (linkError) throw linkError;
      ingredientLinksCreated += links.length;
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Products: ${productsCreated}/${PRODUCTS.length} ${COMMIT ? "created" : "would be created"}`);
  console.log(`New brands: ${newBrandsCreated.length ? newBrandsCreated.join(", ") : "none"}`);
  console.log(`Ingredient links: ${ingredientLinksCreated} ${COMMIT ? "created" : "would be created"}`);
  if (unresolvedReport.length) {
    console.log(`\nUnresolved ingredients (no match in ingredients table - not linked, skipped):`);
    for (const { product, ingredient } of unresolvedReport) {
      console.log(`  - "${ingredient}" (${product})`);
    }
  }
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
