// Static styling-tools catalog - unlike catalog_products, tools don't
// need ingredient scoring against a hair profile, just family-level
// applicability, so this lives as plain data rather than a Supabase
// table. See lib/getToolsForProfile.ts for the family-based filter.

export type ToolCategory =
  | "heat"
  | "detangling"
  | "drying"
  | "styling"
  | "protective"
  | "accessories"
  | "application";

export type ToolPriority = "essential" | "recommended" | "optional";

export type HairFamilyTag = "straight" | "wavy" | "curly" | "coily" | "extensions";

export interface HairTool {
  id: string;
  name: string;
  category: ToolCategory;
  priority: ToolPriority;
  hair_families: HairFamilyTag[];
  description: string;
  why_it_matters: string;
  what_to_look_for: string;
  price_range: string;
  amazon_search: string;
  // e.g. "low porosity hair — can cause protein buildup"
  avoid_if: string | null;
}

export const TOOLS_CATALOG: HairTool[] = [
  // ---- HEAT TOOLS -----------------------------------------------------
  {
    id: "blow-dryer",
    name: "Blow Dryer",
    category: "heat",
    priority: "essential",
    hair_families: ["straight", "wavy", "curly", "coily", "extensions"],
    description: "A high-wattage blow dryer with multiple heat and speed settings.",
    why_it_matters:
      "Reduces drying time significantly and reduces the frizz that comes from air drying disturbed hair. For straight hair it creates volume and smoothness. For curly and coily hair it is used with a diffuser or comb attachment.",
    what_to_look_for:
      "Minimum 1875 watts. Ionic technology reduces frizz. A cool shot button is essential — blasting cool air closes the cuticle and locks in your style. Look for at least 3 heat settings and 2 speed settings.",
    price_range: "$25-200",
    amazon_search: "ionic blow dryer 1875 watt professional",
    avoid_if: null,
  },
  {
    id: "diffuser",
    name: "Diffuser Attachment",
    category: "heat",
    priority: "essential",
    hair_families: ["wavy", "curly", "coily"],
    description:
      "A bowl-shaped blow dryer attachment that disperses airflow to dry curls without disturbing the pattern.",
    why_it_matters:
      "Direct blow dryer airflow destroys curl clumping and causes frizz. The diffuser disperses the air evenly so curls dry in their natural formation. This is the single most important tool for wavy and curly hair.",
    what_to_look_for:
      "Look for a deep bowl with long prongs — shallow diffusers don't work as well. Universal fit attachments work on most blow dryers. Some blow dryers come with a diffuser included.",
    price_range: "$10-40",
    amazon_search: "universal blow dryer diffuser attachment curly hair",
    avoid_if: null,
  },
  {
    id: "flat-iron",
    name: "Flat Iron",
    category: "heat",
    priority: "essential",
    hair_families: ["straight", "curly", "coily"],
    description: "A heat styling tool that straightens hair between two heated ceramic or titanium plates.",
    why_it_matters:
      "Essential for silk press styles on curly and coily hair. For straight hair it smooths and adds shine. Titanium plates heat more evenly and are better for thick coarse hair. Ceramic plates are gentler for fine hair.",
    what_to_look_for:
      "For 1a-2c hair: ceramic plates, max 400F, 1 inch plate. For 3a-3c hair: ceramic or titanium, max 430F, 1 inch plate. For 4a-4c hair: titanium plates, up to 450F capable, 1-1.5 inch plate. Always look for adjustable temperature.",
    price_range: "$30-250",
    amazon_search: "titanium flat iron adjustable temperature natural hair",
    avoid_if: null,
  },
  {
    id: "curling-iron",
    name: "Curling Iron or Wand",
    category: "heat",
    priority: "recommended",
    hair_families: ["straight", "wavy"],
    description: "A heated barrel tool that creates waves or curls in straight or wavy hair.",
    why_it_matters:
      "For 1a-2b hair that wants beach waves or defined curls, a curling iron creates texture that the hair cannot achieve naturally. The barrel size determines the wave size — larger barrel means looser waves.",
    what_to_look_for:
      "For loose beach waves: 1.5-2 inch barrel. For defined curls: 1-1.25 inch barrel. Wands (no clip) create more natural-looking waves. Look for ceramic coating and adjustable heat.",
    price_range: "$20-150",
    amazon_search: "curling wand 1.5 inch beach waves ceramic",
    avoid_if: "coily hair — a curling iron on natural 4c hair without straightening first is unlikely to hold the curl pattern",
  },
  {
    id: "hooded-dryer",
    name: "Hooded Dryer",
    category: "drying",
    priority: "essential",
    hair_families: ["coily", "extensions", "curly"],
    description: "A dome-shaped dryer that surrounds the head with consistent heat for even drying.",
    why_it_matters:
      "For 4a-4c coily hair a hooded dryer is the most important styling tool after a good conditioner. It dries hair evenly without the frizz-causing airflow of a hand dryer, and it is essential for maximizing deep conditioning — the consistent heat opens the cuticle and forces moisture into the shaft. For crochet and braided extension styles it dries the braid base completely to prevent mildew.",
    what_to_look_for:
      "At least 3 heat settings. A timer is very useful. Bonnet dryers (soft hood attached to a handheld dryer) are the most affordable and work well for most hair. Hard hood dryers are faster and more professional. Look for a low setting for finishing and a high setting for deep conditioning.",
    price_range: "$30-200",
    amazon_search: "hooded bonnet dryer natural hair deep conditioning",
    avoid_if: null,
  },
  {
    id: "heated-cap",
    name: "Heated Cap / Thermal Cap",
    category: "drying",
    priority: "recommended",
    hair_families: ["curly", "coily"],
    description: "An electric cap that provides consistent gentle heat during deep conditioning treatments.",
    why_it_matters:
      "A more portable and affordable alternative to a hooded dryer for deep conditioning. Provides the gentle consistent heat needed to open the cuticle during conditioning treatments. Works especially well for 4c hair that benefits from extended deep conditioning sessions.",
    what_to_look_for:
      "Rechargeable is more convenient than corded. Look for at least 2 heat settings. Should reach at least 140-160F for effective deep conditioning.",
    price_range: "$20-60",
    amazon_search: "heated cap deep conditioning natural hair rechargeable",
    avoid_if: null,
  },
  {
    id: "steamer",
    name: "Hair Steamer",
    category: "heat",
    priority: "recommended",
    hair_families: ["coily", "curly"],
    description: "A device that delivers continuous moist heat to the hair during treatments.",
    why_it_matters:
      "Steam penetrates the hair shaft more effectively than dry heat because the moisture softens the cuticle rather than just opening it. For 4b-4c hair with tightly closed cuticles, a steamer dramatically improves how well deep conditioners and treatments actually absorb. Many naturalistas consider this a game-changer for low porosity coily hair.",
    what_to_look_for:
      "Tabletop steamers are more effective than handheld. Look for a timer and an adjustable hood. Q-Redew handheld steamer is a popular affordable option for quick refreshes.",
    price_range: "$40-200",
    amazon_search: "hair steamer natural hair deep conditioning tabletop",
    avoid_if: null,
  },
  {
    id: "blow-dryer-comb",
    name: "Blow Dryer Comb Attachment",
    category: "heat",
    priority: "recommended",
    hair_families: ["coily"],
    description: "A comb-shaped attachment for a blow dryer that stretches coily hair while blow drying.",
    why_it_matters:
      "For 4a-4c hair that wants a stretched blowout before heat styling or braiding, a comb attachment stretches the hair while drying with much less tension than hand stretching. The Revlon One-Step or similar all-in-one tools make this process much faster.",
    what_to_look_for:
      "Wide tooth comb attachment for maximum stretch without breakage. The Revlon One-Step Hot Air Brush is a popular all-in-one option. Use on medium heat only — high heat with tension causes more damage.",
    price_range: "$15-60",
    amazon_search: "blow dryer comb attachment 4c natural hair blowout",
    avoid_if: "high porosity damaged hair — the combination of heat and tension increases breakage risk",
  },

  // ---- DETANGLING TOOLS -------------------------------------------------
  {
    id: "wide-tooth-comb",
    name: "Wide Tooth Comb",
    category: "detangling",
    priority: "essential",
    hair_families: ["wavy", "curly", "coily", "extensions"],
    description: "A comb with widely spaced teeth designed to detangle hair without breaking curl clumps.",
    why_it_matters:
      "The most important detangling tool for any textured hair. Fine tooth combs cause breakage on curly and coily hair. The wide teeth glide through the hair without disrupting curl formation. Always use on wet hair with conditioner or detangler — never on dry textured hair.",
    what_to_look_for:
      "Seamless teeth (no seam down the middle of each tooth) prevent snagging. Wide spacing between teeth — the wider the better for 4c hair. Longer handle for better leverage on thick hair.",
    price_range: "$3-15",
    amazon_search: "seamless wide tooth comb natural hair detangling",
    avoid_if: null,
  },
  {
    id: "detangling-brush",
    name: "Detangling Brush",
    category: "detangling",
    priority: "recommended",
    hair_families: ["curly", "coily"],
    description: "A flexible-bristle brush designed to detangle curly and coily hair with minimal breakage.",
    why_it_matters:
      "A good detangling brush (Denman, Felicia Leatherwood, or similar) detangles faster than a wide tooth comb on very dense or tightly coiled hair. The flexible bristles bend around knots rather than forcing through them. Some brushers also use it to define and clump curls during styling.",
    what_to_look_for:
      "Look for flexible or ball-tipped bristles. The Denman D3 or D4 is the most recommended for curl definition. The Felicia Leatherwood detangler brush is popular for 4c hair. Always use on wet hair with slip.",
    price_range: "$8-25",
    amazon_search: "denman brush natural hair curl definition detangling",
    avoid_if: "straight or fine hair — too aggressive for delicate straight strands",
  },
  {
    id: "rat-tail-comb",
    name: "Rat Tail Comb",
    category: "styling",
    priority: "recommended",
    hair_families: ["coily", "extensions", "curly"],
    description: "A fine-tooth comb with a long pointed handle for precise sectioning and parting.",
    why_it_matters:
      "Essential for creating clean parts for braiding, twisting, and cornrowing. The pointed tail allows precise section creation without disturbing neighboring sections. Also used to smooth edges and apply edge control.",
    what_to_look_for:
      "Metal tail is more durable than plastic. Fine teeth on the comb end for smooth parting. Pintail combs have a pin-thin handle for the most precise parts.",
    price_range: "$3-10",
    amazon_search: "rat tail comb metal pintail natural hair braiding",
    avoid_if: null,
  },

  // ---- APPLICATION TOOLS -------------------------------------------------
  {
    id: "spray-bottle",
    name: "Spray Bottle",
    category: "application",
    priority: "essential",
    hair_families: ["wavy", "curly", "coily", "extensions"],
    description: "A fine mist spray bottle for rewetting hair during styling and refreshing between wash days.",
    why_it_matters:
      "Textured hair must be styled wet and refreshed wet. A good spray bottle delivers a fine even mist that rewets the hair without drenching it. Used for morning refreshes, re-activating products, and applying diluted leave-in.",
    what_to_look_for:
      "Fine mist setting — avoid bottles that stream rather than mist. Some have a continuous spray option that is useful for styling large sections. Larger capacity (16oz+) means fewer refills.",
    price_range: "$5-15",
    amazon_search: "fine mist spray bottle hair 16oz",
    avoid_if: null,
  },
  {
    id: "applicator-bottle",
    name: "Applicator Bottle",
    category: "application",
    priority: "recommended",
    hair_families: ["coily", "extensions"],
    description: "A squeeze bottle with a nozzle tip for applying products directly to the scalp through dense hair.",
    why_it_matters:
      "Essential for applying shampoo, diluted leave-in, or scalp oil directly to the scalp when hair is in protective styles or is very dense. The nozzle tip allows precise product placement without disturbing the hair.",
    what_to_look_for:
      "Pointed nozzle tip for scalp access. Squeeze control for application rate. Multiple nozzle sizes useful — fine tip for scalp oil, wider tip for diluted shampoo.",
    price_range: "$5-15",
    amazon_search: "applicator bottle nozzle tip hair scalp natural hair",
    avoid_if: null,
  },

  // ---- DRYING AND PROTECTIVE -------------------------------------------
  {
    id: "microfiber-towel",
    name: "Microfiber Towel or T-Shirt",
    category: "drying",
    priority: "essential",
    hair_families: ["wavy", "curly", "coily"],
    description: "A smooth-weave towel that absorbs water without roughing up the hair cuticle.",
    why_it_matters:
      "Regular terrycloth towels have a rough texture that physically roughens the hair cuticle and causes frizz. Microfiber or a cotton t-shirt absorbs water with zero friction — this single swap dramatically reduces frizz for wavy and curly hair.",
    what_to_look_for:
      "Microfiber hair towels or turbans. Old cotton t-shirts work just as well at zero cost. Avoid terrycloth for any textured hair type.",
    price_range: "$8-20",
    amazon_search: "microfiber hair towel turban wavy curly hair",
    avoid_if: null,
  },
  {
    id: "satin-bonnet",
    name: "Satin Bonnet or Silk Pillowcase",
    category: "protective",
    priority: "essential",
    hair_families: ["curly", "coily", "extensions"],
    description: "Satin or silk nighttime protection that prevents moisture loss and friction while sleeping.",
    why_it_matters:
      "Cotton pillowcases absorb moisture from hair overnight and cause friction that leads to breakage and frizz. A satin bonnet keeps moisture in the hair shaft and protects the curl pattern. This is the highest-impact daily habit for length retention in coily hair.",
    what_to_look_for:
      "Double-layered satin. Large enough to fit all your hair. Adjustable elastic. A satin or silk pillowcase as backup if you move in your sleep.",
    price_range: "$8-25",
    amazon_search: "satin bonnet double layer natural hair large",
    avoid_if: null,
  },
  {
    id: "sectioning-clips",
    name: "Sectioning Clips",
    category: "accessories",
    priority: "recommended",
    hair_families: ["curly", "coily", "extensions"],
    description: "Large clips for dividing hair into manageable sections during washing and styling.",
    why_it_matters:
      "Working in sections is the foundation of a good wash day routine for curly and coily hair. Clips hold sections out of the way while you work on one section at a time — preventing tangles from reforming and making product application more thorough and even.",
    what_to_look_for:
      "Large jaw clips or duckbill clips. Need at least 6-8 for thick hair. Duck bill clips are better for holding flat sections during rollersetting.",
    price_range: "$5-12",
    amazon_search: "large sectioning clips duck bill natural hair styling",
    avoid_if: null,
  },
  {
    id: "wig-stand",
    name: "Wig Stand or Mannequin Head",
    category: "accessories",
    priority: "essential",
    hair_families: ["extensions"],
    description: "A stand for storing and styling wigs and weaves when not wearing them.",
    why_it_matters:
      "Storing a wig crumpled in a bag or drawer destroys the style, mats the hair, and shortens the lifespan dramatically. A wig stand maintains the shape of the cap and allows the hair to air dry properly after washing.",
    what_to_look_for:
      "Canvas mannequin heads allow styling and storing. Simple wig stands are sufficient for storage only. Get a mannequin head if you do your own wig styling.",
    price_range: "$10-30",
    amazon_search: "wig stand mannequin head canvas styling",
    avoid_if: null,
  },
];

export function findTool(id: string): HairTool | undefined {
  return TOOLS_CATALOG.find((tool) => tool.id === id);
}
