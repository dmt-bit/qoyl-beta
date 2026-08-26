// Item 4 of the extension-profiles spec - a completely different product
// list per extension type, dispatched with the exact same priority order
// as lib/extensionRoutineSteps.ts's generateExtensionCareBlocks so the
// routine tab and the product list a user sees always correspond to the
// same extension type.

export type ExtensionProductRec = {
  name: string;
  note?: string;
  accessory?: boolean;
};

const WIG_TYPES = new Set(["wig_lace_front", "wig_full_lace", "wig_360", "wig_glueless"]);

function wigProducts(usesAdhesive: boolean): ExtensionProductRec[] {
  const products: ExtensionProductRec[] = [
    { name: "Wig shampoo (sulfate-free, gentle)" },
    { name: "Wig conditioner", note: "Human hair only - never use on synthetic hair" },
    { name: "Wig detangling spray" },
  ];
  if (usesAdhesive) {
    products.push({ name: "Adhesive remover" });
  }
  products.push(
    { name: "Bold hold alternative / edge control" },
    { name: "Wig shine spray", note: "Human hair only" },
    { name: "Wig stand", accessory: true },
    { name: "Satin bonnet", accessory: true }
  );
  return products;
}

function tapeInAndKTipProducts(): ExtensionProductRec[] {
  return [
    { name: "Extension-safe sulfate-free shampoo" },
    { name: "Lightweight leave-in (oil-free)" },
    { name: "Loop brush", note: "Not a regular brush", accessory: true },
    { name: "Dry shampoo for between wash days" },
    { name: "Oil-free scalp serum" },
  ];
}

function crochetProducts(texture: string | null): ExtensionProductRec[] {
  return [
    { name: "Diluted shampoo (applicator bottle)" },
    { name: "Lightweight scalp oil" },
    {
      name: texture === "synthetic" ? "Synthetic hair spray" : "Human hair leave-in",
      note: "Match to your crochet hair type",
    },
    { name: "Large satin bonnet", accessory: true },
    { name: "Hooded dryer", accessory: true },
  ];
}

function clipInProducts(): ExtensionProductRec[] {
  return [
    { name: "Wig/extension shampoo" },
    { name: "Conditioner (human hair) or leave-in" },
    { name: "Wide tooth comb", accessory: true },
    { name: "Clip-in storage hanger", accessory: true },
  ];
}

function protectiveStyleProducts(): ExtensionProductRec[] {
  return [
    { name: "Lightweight scalp oil" },
    { name: "Leave-in conditioner or moisturizing spray" },
    { name: "Satin bonnet", accessory: true },
  ];
}

export function getExtensionProductRecommendations(profile: {
  extension_types: string[];
  extension_texture: string | null;
  uses_adhesive: boolean;
}): { avoidWarning: boolean; products: ExtensionProductRec[] } {
  const types = profile.extension_types ?? [];

  if (types.some((t) => WIG_TYPES.has(t))) {
    return { avoidWarning: false, products: wigProducts(profile.uses_adhesive) };
  }
  if (types.includes("tape_in") || types.includes("k_tip") || types.includes("i_tip")) {
    return { avoidWarning: types.includes("tape_in") || types.includes("k_tip"), products: tapeInAndKTipProducts() };
  }
  if (types.includes("crochet") || types.includes("sew_in_weave")) {
    return { avoidWarning: false, products: crochetProducts(profile.extension_texture) };
  }
  if (types.includes("clip_in") || types.includes("halo")) {
    return { avoidWarning: false, products: clipInProducts() };
  }
  return { avoidWarning: false, products: protectiveStyleProducts() };
}

export function getBlendingProductRecommendations(): ExtensionProductRec[] {
  return [
    { name: "Heat protectant (high heat rated)" },
    { name: "Edge control or smoothing serum" },
    { name: "Blow dry cream or serum for stretch" },
    { name: "Scalp oil for leave-out moisture" },
  ];
}
