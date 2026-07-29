-- The other 7 posts from qoyl_posts_template (3).csv are already live and match
-- exactly (confirmed by comparing title/category/hair_type/content_type against
-- the current database) -- only these 2 'extensions'-tagged posts were missing,
-- presumably held back until the posts_hair_type_check constraint update in
-- add_posts_extensions_hair_type.sql allowed 'extensions' as a value.
--
-- Run add_posts_extensions_hair_type.sql first if it hasn't been applied yet --
-- these inserts will fail on the hair_type check constraint otherwise.

insert into posts (slug, title, category, hair_type, content_type, excerpt, body, hero_image_url, video_url, source_creator, source_creator_url, source_platform, published_at)
  values ('moisture-retention-under-braids-and-weaves', 'Your Natural Hair Still Needs Moisture — Even Under Braids', 'ingredient-evaluation', 'extensions', 'article', 'Protective styles protect your ends. They don''t protect your scalp or your new growth from drying out.', 'One of the most common misconceptions about protective styling is that your hair gets a break while it''s installed. Your ends do — they''re tucked away protected from friction and manipulation. But your scalp and new growth are still fully exposed to your environment and they still need moisture.

The problem with most extension-safe products is that they''re designed not to disturb the style rather than designed to actually moisturize your hair. Lightweight sprays that won''t cause frizz at the parting are useful but if they don''t contain real humectants and sealants they''re just water that evaporates in an hour.

What actually works under braids box braids and weaves: a diluted leave-in conditioner applied at the scalp with an applicator bottle — thin enough to reach the scalp through the parts without disrupting the style. Look for water as the first ingredient and a lightweight humectant like glycerin or panthenol in a humid climate or a water-binding agent like sodium PCA in a dry one.

A lightweight oil for scalp sealing — jojoba or grapeseed rather than heavy castor or coconut oil which can cause buildup at the roots and weaken the extension bond over time. Apply to the scalp only not the extension hair.

A sulfate-free cleansing routine every 2-3 weeks depending on your scalp — not skipping wash day entirely because your hair is installed. Buildup at the scalp during an 8-week install causes more damage than almost anything else.

The products that work best under extensions are often the same ones that work for low porosity hair — lightweight water-based and applied with intention rather than volume.', NULL, NULL, NULL, NULL, NULL, now());

insert into posts (slug, title, category, hair_type, content_type, excerpt, body, hero_image_url, video_url, source_creator, source_creator_url, source_platform, published_at)
  values ('wig-care-natural-and-synthetic', 'How to Actually Clean and Condition a Wig — Natural Hair and Synthetic', 'ingredient-evaluation', 'extensions', 'article', 'Most wig care advice treats human hair wigs and synthetic wigs identically. They''re completely different products.', 'Wigs need washing. This surprises people who assume that because a wig isn''t growing from your scalp it doesn''t accumulate the same buildup. It does — from styling products, environmental pollutants, sweat from wearing, and contact with your skin and scalp.

Human hair wigs and synthetic wigs need completely different care approaches and conflating them is how expensive human hair wigs get damaged or synthetic ones get destroyed.

Human hair wigs can handle most of what your natural hair can — a gentle sulfate-free shampoo, a conditioner with slip, a deep conditioning treatment every few washes. The difference is that human hair wigs have no sebaceous glands producing natural oils so they need more conditioning than your natural hair and more frequent sealing with a lightweight oil to stay looking healthy. Avoid protein treatments on human hair wigs unless the hair is visibly damaged — over-proteining wig hair causes the same stiffness and breakage it causes on natural hair.

Synthetic wigs cannot be treated like human hair. No heat, no protein treatments, no heavy conditioning masques. A gentle shampoo, light rinse-out conditioner, and air drying is the entire routine. The fibers are plastic — they don''t absorb product the way human hair does and they don''t need hydration in the same way. What they do need is a light silicone-based detangling spray to reduce friction and prevent frizz.

Your scalp under the wig matters as much as the wig itself. A breathable wig cap, a clean scalp before putting the wig on, and regular removal for cleansing are the habits that protect your natural hair during long-term wig wearing. The wig is protecting your natural hair — but your natural hair still needs care underneath it.', NULL, NULL, NULL, NULL, NULL, now());

