// Travel survey answers, shared by the form (app/travel/page.tsx), the
// submit API (app/api/travel-kits), and the kit builder (lib/travelKitGenerator.ts).
// Values here are the stored travel_kits column values.

export type TripLength = "short" | "week" | "two_weeks" | "extended";
export type HairSituation = "natural" | "protective" | "wig" | "extensions" | "mix";
export type UnderWig = "full_hair" | "cornrows" | "minimal";
export type WigType = "human" | "synthetic";
export type WigAdhesive = "glue" | "got2b" | "grip";
export type ExtensionType = "clip_in" | "permanent" | "braiding_hair";
export type NaturalUnderExtensions = "full" | "minimal";
export type StyleAge = "fresh" | "recent" | "older";
export type WashPlan = "none" | "once" | "multiple";
export type WashAccess = "full" | "limited" | "minimal";
export type WashFrequency = "none" | "once" | "regular";
export type Concern = "humidity" | "dry_climate" | "color" | "scalp" | "activity";

export type TravelSurveyData = {
  trip_length: TripLength | null;
  hair_situation: HairSituation | null;
  // Wig path
  under_wig: UnderWig | null;
  wig_type: WigType | null;
  wig_adhesive: WigAdhesive | null;
  // Extensions path
  extension_type: ExtensionType | null;
  natural_under_extensions: NaturalUnderExtensions | null;
  // Protective style path
  style_age: StyleAge | null;
  wash_plan: WashPlan | null;
  // Natural / mix path
  wash_access: WashAccess | null;
  wash_frequency: WashFrequency | null;
  // Step 4
  swimming: string | null;
  concerns: Concern[];
};

export const EMPTY_SURVEY: TravelSurveyData = {
  trip_length: null,
  hair_situation: null,
  under_wig: null,
  wig_type: null,
  wig_adhesive: null,
  extension_type: null,
  natural_under_extensions: null,
  style_age: null,
  wash_plan: null,
  wash_access: null,
  wash_frequency: null,
  swimming: null,
  concerns: [],
};

// Email/summary labels for the hair situation (the trip summary in the kit email).
export const HAIR_SITUATION_LABEL: Record<HairSituation, string> = {
  natural: "natural hair",
  protective: "protective style",
  wig: "wig",
  extensions: "extensions",
  mix: "wig + natural mix",
};

// The legacy protective_style column is still written (KitView and the
// older email code read it), derived from the new hair situation.
export function legacyProtectiveStyle(survey: TravelSurveyData): string {
  switch (survey.hair_situation) {
    case "protective":
      return "braids_twists";
    case "wig":
    case "mix":
      return "wig";
    case "extensions":
      return "weave_sew_in";
    case "natural":
    default:
      return "none";
  }
}

// Whether every question the chosen hair situation needs has an answer.
export function hairSituationComplete(survey: TravelSurveyData): boolean {
  switch (survey.hair_situation) {
    case "wig":
      return Boolean(survey.under_wig && survey.wig_type && survey.wig_adhesive);
    case "extensions":
      return Boolean(survey.extension_type && survey.natural_under_extensions);
    case "protective":
      return Boolean(survey.style_age && survey.wash_plan);
    case "natural":
    case "mix":
      return Boolean(survey.wash_access && survey.wash_frequency);
    default:
      return false;
  }
}
