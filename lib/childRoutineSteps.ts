import {
  generateRoutineStepsByWashType,
  type RoutineStepDetail,
  type WashDaySteps,
} from "@/lib/routineSteps";

// Reuses the same curl-family wash-day content adults get (item 4 of the
// family-profiles spec: "same curl-type-based routine logic as adult
// profiles"), then layers child-specific adjustments on top rather than
// forking the underlying step copy.

export type ChildRoutineStepDetail = RoutineStepDetail & {
  sensoryNote: string | null;
};

export type ChildWashDaySteps = {
  key: WashDaySteps["key"];
  label: string;
  steps: ChildRoutineStepDetail[];
};

const SENSORY_NOTE =
  "Sensory note: go slowly and narrate each step before you do it. Let them hold or squeeze something textured if it helps, and pause if they seem overwhelmed.";

const DIFFICULT_WASH_DAY_TIPS = [
  "wash during bath time",
  "use a detangling spray before washing",
  "put on a favorite show",
  "use a handheld showerhead",
  "section hair before starting",
  "reward cooperation after",
];

type ChildRoutineProfile = {
  curl_type: string | null;
  cooperative_level: string | null;
  heat_tools_used: boolean;
  sensory_sensitive: boolean;
};

export function generateChildRoutineSteps(profile: ChildRoutineProfile): {
  washDays: ChildWashDaySteps[];
  easierWashDayTips: string[] | null;
} {
  const baseWashDays = generateRoutineStepsByWashType(profile.curl_type);

  const washDays: ChildWashDaySteps[] = baseWashDays.map((day) => ({
    key: day.key,
    label: day.label,
    steps: day.steps
      .filter((s) => profile.heat_tools_used || s.productCategory !== "heat-protectant")
      .map((s) => ({
        ...s,
        sensoryNote: profile.sensory_sensitive ? SENSORY_NOTE : null,
      })),
  }));

  const easierWashDayTips = profile.cooperative_level === "parent_difficult" ? DIFFICULT_WASH_DAY_TIPS : null;

  return { washDays, easierWashDayTips };
}
