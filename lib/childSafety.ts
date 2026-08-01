// Shared by lib/routine.ts (dashboard's free routine preview) and
// lib/routineSteps.ts (the paid /routine page), plus the /routine API
// route and page, so the "this profile is for a child/baby" treatment
// stays consistent everywhere a routine is shown. Additive, like
// lib/extensionCare.ts -- appends a clearly-flagged step/note rather than
// rewriting the underlying curl-type/porosity routine content, since the
// base routines aren't age-specific and a full age-aware rewrite of every
// curl-family's copy is a much larger content project than this hook.

export type ProfileFor = "myself" | "child" | "baby";

export function getChildSafetyNote(profileFor: string | null): string | null {
  if (profileFor === "baby") {
    return "All recommendations prioritize ingredients safe for infant scalps.";
  }
  if (profileFor === "child") {
    return "Recommendations are tailored for children's hair -- gentle formulas and age-appropriate techniques.";
  }
  return null;
}

export function getChildSafetyStep(
  profileFor: string | null
): { title: string; body: string; why: string } | null {
  if (profileFor === "baby") {
    return {
      title: "Infant-Safe Ingredient Check",
      body: "Choose tear-free, fragrance-light formulas made for infants. Avoid sulfates, essential oils, and added fragrance -- a baby's scalp is thinner and more reactive than an adult's. Patch-test any new product on a small area before using it on your baby's full scalp.",
      why: "Why: infant skin absorbs more and reacts faster than adult skin, so gentler formulas and fewer active ingredients matter more here than anywhere else in the routine.",
    };
  }
  if (profileFor === "child") {
    return {
      title: "Kid-Friendly Detangling & Ingredient Care",
      body: "Detangle in small sections with a wide-tooth comb or your fingers, starting at the ends and working up, using a slippery leave-in or detangling spray to ease knots. Watch labels for harsh sulfates and essential oils -- both can irritate a child's more sensitive scalp and eyes during wash time.",
      why: "Why: children's scalp and hair are more sensitive than an adult's, and painless detangling is what actually keeps wash day from becoming a fight.",
    };
  }
  return null;
}

// A caution/avoid-rated ingredient matters more for a baby profile than
// a typical adult one -- used to lower the "ingredients to avoid" surfacing
// threshold and add extra visual emphasis on /routine.
export function isChildSafetyProfile(profileFor: string | null): boolean {
  return profileFor === "child" || profileFor === "baby";
}

// Placeholder for future multi-profile support: right now a hair_profiles
// row belongs to exactly one user_id and profile_for describes who THAT
// single profile is for (self/child/baby). A real multi-profile feature
// (e.g. one account managing several children's profiles) would need a
// separate profiles-per-user join table and a profile switcher in the
// UI -- this file is where the child/baby-specific guidance would branch
// per selected profile once that exists.
