import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.json();
  const { subscriptionId }: { subscriptionId?: string } = body;

  if (!subscriptionId) {
    return NextResponse.json(
      { error: "subscriptionId is required." },
      { status: 400 }
    );
  }

  try {
    await getStripe().subscriptions.cancel(subscriptionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to cancel Stripe subscription:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
