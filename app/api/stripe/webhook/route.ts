import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendRoutineEmail } from "@/lib/sendRoutineEmail";
import { sendAdminNotification } from "@/lib/adminNotify";
import { sendNotificationEmail } from "@/lib/notify";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const productType = session.metadata?.product_type;

        if (!userId || !productType) {
          console.error(
            "checkout.session.completed missing user_id/product_type metadata:",
            session.id
          );
          break;
        }

        const { data: purchaseRow, error } = await getSupabaseAdmin()
          .from("user_purchases")
          .insert({
            user_id: userId,
            product_type: productType,
            stripe_customer_id:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id ?? null,
            stripe_subscription_id:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id ?? null,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null,
            status: "active",
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to insert user_purchases row:", error);
        } else {
          await sendAdminNotification(
            `New Qoyl purchase — ${purchaseRow.product_type}`,
            `product_type: ${purchaseRow.product_type}\n` +
              `user_id: ${purchaseRow.user_id}\n` +
              `stripe_customer_id: ${purchaseRow.stripe_customer_id ?? "none"}\n` +
              `created_at: ${purchaseRow.created_at}`
          );
        }

        const stripeCustomerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? "none";
        const purchaseTimestamp = new Date().toISOString();

        if (productType === "travel_kit") {
          await sendNotificationEmail(
            "New travel kit purchase — $4.99",
            `Someone just purchased the Qoyl Travel Kit.

User ID: ${userId}
Stripe customer: ${stripeCustomerId}
Amount: $4.99
Purchased at: ${purchaseTimestamp}

No manual action needed — dashboard unlocks automatically.
Check Supabase user_purchases table for full details.`
          );
        }

        if (productType === "routine_subscription") {
          await sendNotificationEmail(
            "New routine subscriber — $7.99/month 🎉",
            `Someone just subscribed to the Qoyl Monthly Routine.

User ID: ${userId}
Stripe customer: ${stripeCustomerId}
Amount: $7.99/month recurring
Subscribed at: ${purchaseTimestamp}

ACTION NEEDED: Send their personalized routine email from support@qoyl.live within 24 hours.
Pull their hair profile from Supabase using the user_id above.
Check Supabase hair_profiles table for their curl type, porosity, and zip code.`
          );

          const recipientEmail =
            session.customer_email ?? session.customer_details?.email ?? null;

          if (!recipientEmail) {
            console.error(
              "checkout.session.completed missing customer email for routine email:",
              session.id
            );
          } else {
            // Never let an email failure fail the webhook -- the purchase
            // row above is already recorded, and Stripe would otherwise
            // retry this event and re-run everything.
            try {
              await sendRoutineEmail(userId, recipientEmail);
            } catch (emailError) {
              console.error(
                "Failed to send routine email:",
                userId,
                emailError
              );
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await getSupabaseAdmin()
          .from("user_purchases")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error(
            "Failed to mark subscription cancelled:",
            subscription.id,
            error
          );
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Error handling Stripe webhook event:", event.type, err);
    return NextResponse.json(
      { error: "Internal error handling webhook event." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
