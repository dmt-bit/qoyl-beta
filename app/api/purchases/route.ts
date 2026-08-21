import { NextResponse } from "next/server";
import { isAdminUserId } from "@/lib/isAdmin";
import { getUserPurchases } from "@/lib/purchases";

// getUserPurchases (and hasRoutineSubscription/hasTravelKit) use the
// Supabase service-role client, which must never reach client code.
// This route is the bridge: client components fetch entitlement/
// purchase state through here instead of importing lib/purchases.ts
// directly.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json(
      { error: "user_id is required." },
      { status: 400 }
    );
  }

  const [purchases, admin] = await Promise.all([
    getUserPurchases(userId),
    isAdminUserId(userId),
  ]);

  return NextResponse.json({
    // Admin bypass folds straight into these two flags - every caller
    // that already gates a feature on hasRoutineSubscription/hasTravelKit
    // gets the bypass for free, no separate admin-only branch needed.
    hasRoutineSubscription:
      admin || purchases.some((p) => p.product_type === "routine_subscription"),
    hasTravelKit:
      admin || purchases.some((p) => p.product_type === "travel_kit"),
    isAdmin: admin,
    purchases,
  });
}
