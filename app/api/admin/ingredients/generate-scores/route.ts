import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import {
  getIngredientCoverageStats,
  previewFunctionGeneration,
  runFunctionGeneration,
} from "@/lib/ingredientScoring";

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const mode = body.mode === "execute" ? "execute" : "preview";

  try {
    if (mode === "preview") {
      const preview = await previewFunctionGeneration(10);
      return NextResponse.json({ mode, ...preview });
    }

    const before = await getIngredientCoverageStats();
    const result = await runFunctionGeneration();
    const after = await getIngredientCoverageStats();

    return NextResponse.json({ mode, ...result, before, after });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Score generation failed." },
      { status: 500 }
    );
  }
}
