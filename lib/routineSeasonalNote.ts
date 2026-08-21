export type SeasonalNote = {
  title: string;
  items: string[];
};

type Season = "winter" | "spring" | "summer" | "fall";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function seasonForMonth(monthIndex: number): Season {
  // monthIndex: 0 = January
  if (monthIndex === 11 || monthIndex <= 1) return "winter";
  if (monthIndex <= 4) return "spring";
  if (monthIndex <= 7) return "summer";
  return "fall";
}

// Rough US region by zip code's leading digit - not a substitute for a
// real climate/weather API, just enough to make the note feel local.
type Region = "northeast" | "southeast" | "southcentral" | "southwest" | "west";

function regionForZip(zipCode: string | null): Region {
  const firstDigit = zipCode?.trim().charAt(0);
  switch (firstDigit) {
    case "0":
    case "1":
    case "4":
    case "5":
    case "6":
      return "northeast";
    case "2":
    case "3":
      return "southeast";
    case "7":
      return "southcentral";
    case "8":
      return "southwest";
    case "9":
      return "west";
    default:
      return "northeast";
  }
}

const REGION_LABEL: Record<Region, string> = {
  northeast: "the Northeast/Midwest",
  southeast: "the Southeast/Mid-Atlantic",
  southcentral: "the South",
  southwest: "the Southwest",
  west: "the West Coast",
};

const REGION_SEASON_NOTES: Record<Region, Record<Season, [string, string]>> = {
  northeast: {
    winter: [
      "Cold, dry indoor heat pulls moisture out of hair fast this time of year - expect to deep condition more often than usual.",
      "Reduce glycerin-heavy products when it's very cold outside; in low humidity, glycerin can pull moisture out of your hair instead of into it.",
    ],
    spring: [
      "Humidity starts climbing this month - watch for frizz creeping back into second and third-day styles.",
      "A lighter styler starts to make more sense as the air gets less dry.",
    ],
    summer: [
      "Humidity peaks this month - watch for hygral fatigue. If your hair feels mushy or over-stretches when wet, add a light protein treatment that week.",
      "Reduce protein treatments if you notice stiffness - summer humidity means your hair is absorbing more moisture than usual and may not need the extra protein.",
    ],
    fall: [
      "Humidity starts dropping this month - this is a good time to reintroduce richer sealing oils before winter dryness sets in.",
      "Keep an eye out for early static and flyaways as indoor heating starts to kick back on.",
    ],
  },
  southeast: {
    winter: [
      "Winters are mild here, but indoor heating still dries hair out - don't skip your deep conditioner just because it's not freezing outside.",
      "This is a good stretch to build up length with fewer humidity-related setbacks.",
    ],
    spring: [
      "Humidity climbs quickly this month - lean on anti-humectant stylers to hold definition through the day.",
      "Watch for frizz returning to twist-outs and braid-outs as the air gets heavier.",
    ],
    summer: [
      "Peak humidity and heat this month - protein balance matters, since over-moisturized hair can feel limp or mushy in this climate.",
      "Consider a lighter leave-in on the most humid days so hair doesn't feel weighed down.",
    ],
    fall: [
      "Humidity starts to ease this month - a good time to check whether your styler still holds through the day or needs adjusting.",
      "Keep sealing consistently as temperatures start to cool in the evenings.",
    ],
  },
  southcentral: {
    winter: [
      "Winters are mild and dry here - keep deep conditioning weekly even though it doesn't feel cold outside.",
      "Static and flyaways can show up even in mild winters when indoor heat runs - a light oil on dry ends helps.",
    ],
    spring: [
      "Humidity starts building this month - watch for frizz creeping into styles that held well over the winter.",
      "This is a good time to start easing off heavier sealing oils in favor of lighter ones.",
    ],
    summer: [
      "Hot and humid conditions peak this month - hygral fatigue is common; if hair feels mushy when wet, dial back moisture and add protein.",
      "Sweat and humidity both add up fast here - more frequent light rinses between full wash days can help scalp comfort.",
    ],
    fall: [
      "Humidity starts dropping this month - a good time to reintroduce richer creams and oils.",
      "Watch for the first signs of dryness returning as the air cools off.",
    ],
  },
  southwest: {
    winter: [
      "Dry air is a year-round reality here, and it's often worse in winter - deep condition consistently and don't skip sealing.",
      "Glycerin-based products can work against you in very low humidity - watch how your hair responds and adjust if it feels drier after using them.",
    ],
    spring: [
      "Dry conditions continue - keep leaning on richer creams and oils rather than lightweight, humidity-focused products.",
      "This is a good stretch to focus on protein-moisture balance since the climate itself won't be adding moisture back in.",
    ],
    summer: [
      "Heat intensifies this month on top of already-dry air - increase how often you deep condition and seal.",
      "UV exposure is strong here - a leave-in or oil with some UV protection helps prevent additional dryness and color fading.",
    ],
    fall: [
      "Dry conditions persist - no major shift needed, but keep sealing consistently as temperatures start to drop.",
      "A good time to reassess whether your current routine is giving your hair enough moisture for this climate.",
    ],
  },
  west: {
    winter: [
      "Cooler, often damper weather this month - a good stretch for retaining moisture with less effort than usual.",
      "Watch humidity swings if you're near the coast versus further inland - adjust styler strength accordingly.",
    ],
    spring: [
      "Mild and variable this month - a flexible routine works well since conditions can shift week to week.",
      "A good time to reassess product amounts as temperatures start to warm up.",
    ],
    summer: [
      "Dry heat inland, milder and more humid right along the coast - tune your sealing oil to your specific microclimate.",
      "Increase deep conditioning frequency if you're further from the coast, where the air runs drier.",
    ],
    fall: [
      "Conditions ease up this month in most of the region - a good stretch for maintaining rather than overhauling your routine.",
      "Keep an eye on any dryness left over from summer heat inland.",
    ],
  },
};

export function generateSeasonalNote(
  zipCode: string | null,
  date: Date
): SeasonalNote {
  const monthIndex = date.getMonth();
  const monthName = MONTH_NAMES[monthIndex];
  const season = seasonForMonth(monthIndex);
  const region = regionForZip(zipCode);
  const [primary, secondary] = REGION_SEASON_NOTES[region][season];

  const nextMonthName = MONTH_NAMES[(monthIndex + 1) % 12];

  return {
    title: `${monthName} notes for your area`,
    items: [
      primary,
      secondary,
      `Your next seasonal update arrives in ${nextMonthName} - we'll flag anything that changes for ${REGION_LABEL[region]}.`,
    ],
  };
}
