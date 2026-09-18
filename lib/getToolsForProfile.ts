import { TOOLS_CATALOG, type HairTool } from "@/lib/toolsData";
import { curlFamily } from "@/lib/compatibility";

export function getToolsForProfile(params: {
  curlType: string | null;
  routineFocus?: string | null;
  hasExtensions?: boolean;
}): {
  essential: HairTool[];
  recommended: HairTool[];
  optional: HairTool[];
} {
  const family = curlFamily(params.curlType);
  const families: string[] = family ? [family] : [];

  if (params.hasExtensions || params.routineFocus === "extensions") {
    families.push("extensions");
  }

  const relevant = TOOLS_CATALOG.filter((tool) =>
    tool.hair_families.some((f) => families.includes(f))
  );

  return {
    essential: relevant.filter((t) => t.priority === "essential"),
    recommended: relevant.filter((t) => t.priority === "recommended"),
    optional: relevant.filter((t) => t.priority === "optional"),
  };
}
