import { isAdminUserId } from "@/lib/isAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type UserPurchase = {
  id: string;
  user_id: string;
  product_type: "routine_subscription" | "travel_kit";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  status: "active" | "cancelled" | "expired";
  created_at: string;
  expires_at: string | null;
};

export async function getUserPurchases(
  userId: string
): Promise<UserPurchase[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("user_purchases")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) {
      console.error("Failed to fetch user purchases:", error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("Failed to fetch user purchases:", err);
    return [];
  }
}

export async function hasRoutineSubscription(userId: string): Promise<boolean> {
  if (await isAdminUserId(userId)) return true;
  const purchases = await getUserPurchases(userId);
  return purchases.some((p) => p.product_type === "routine_subscription");
}

export async function hasTravelKit(userId: string): Promise<boolean> {
  const purchases = await getUserPurchases(userId);
  return purchases.some((p) => p.product_type === "travel_kit");
}
