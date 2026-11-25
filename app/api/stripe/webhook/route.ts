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
            `New Qoyl purchase - ${purchaseRow.product_type}`,
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

        // Travel kits are free now (generated from /api/travel-kits/generate
        // on form submit), so there is no travel_kit payment branch here.

        // ── Qoyl Store order ─────────────────────────────────────────────────
        if (productType === "store_order") {
          const orderId = session.metadata?.order_id;
          if (!orderId) {
            console.error("store_order webhook missing order_id metadata:", session.id);
            break;
          }

          // Mark the order as paid
          const { data: order, error: orderErr } = await getSupabaseAdmin()
            .from("store_orders")
            .update({ status: "paid" })
            .eq("id", orderId)
            .select()
            .single();

          if (orderErr) {
            console.error("Failed to mark store_order paid:", orderId, orderErr);
            break;
          }

          // Build a plain-text item list for the fulfillment email
          type OrderItem = {
            product_name?: string;
            price_estimate?: number;
            quantity?: number;
            affiliate_url?: string;
            seller_url?: string;
          };
          const itemLines = (order.items as OrderItem[])
            .map((item, idx) => {
              const qty   = item.quantity ?? 1;
              const price = item.price_estimate != null
                ? `$${(item.price_estimate * qty).toFixed(2)}`
                : "price unknown";
              const link  = item.affiliate_url ?? item.seller_url ?? "no link";
              return `${idx + 1}. ${item.product_name ?? "Unknown"} — ${price} ×${qty}\n   ${link}`;
            })
            .join("\n\n");

          const addr = order.shipping_address
            ? `${order.shipping_address.name}\n${order.shipping_address.line1}${order.shipping_address.line2 ? "\n" + order.shipping_address.line2 : ""}\n${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}\n${order.shipping_address.country}`
            : "Address will be in Stripe Dashboard (collected during Checkout)";

          await sendAdminNotification(
            `🛒 New Qoyl Store order — ${order.items.length} items — $${order.total_usd}`,
            `Order ID: ${orderId}\nUser ID:  ${userId}\n\nShip to:\n${addr}\n\nItems to purchase:\n\n${itemLines}\n\nSubtotal: $${order.subtotal_usd}\nFee: $${order.service_fee_usd}\nTotal paid: $${order.total_usd}\n\nStripe session: ${session.id}`
          );

          await sendNotificationEmail(
            `🛒 ACTION NEEDED: New Qoyl Store order — ${order.items.length} items`,
            `A customer just placed a Qoyl Store order. Please purchase each item below and ship to the address provided.\n\nOrder ID: ${orderId}\nUser ID:  ${userId}\n\nShip to:\n${addr}\n\nItems to purchase:\n\n${itemLines}\n\nSubtotal: $${order.subtotal_usd}\nFulfillment fee: $${order.service_fee_usd}\nTotal charged to customer: $${order.total_usd}\n\nStripe session: ${session.id}\n\nMark order as "fulfilling" in /admin/orders once you have started purchasing.`
          );

          break;
        }

        // ── Routine subscription ──────────────────────────────────────────────
        if (productType === "routine_subscription") {
          // Anchors the wash-day cycle (see lib/routineCalendar.ts) to
          // the date the subscription actually went live, not whenever
          // the hair_profiles row happened to be created (could be
          // months earlier, during free-tier profile setup). Always set
          // on checkout.session.completed rather than only-if-null -
          // this event is the real "first activation" moment for this
          // subscription.
          const { error: routineStartDateError } = await getSupabaseAdmin()
            .from("hair_profiles")
            .update({ routine_start_date: new Date().toISOString().slice(0, 10) })
            .eq("user_id", userId);
          if (routineStartDateError) {
            console.error("Failed to set routine_start_date:", userId, routineStartDateError);
          }

          const { data: routineProfile } = await getSupabaseAdmin()
            .from("hair_profiles")
            .select("curl_type, porosity, zip_code, climate")
            .eq("user_id", userId)
            .maybeSingle();

          const recipientEmail =
            session.customer_email ?? session.customer_details?.email ?? null;

          let routineEmailStatus =
            "Automated routine email sent to subscriber.";

          if (!recipientEmail) {
            console.error(
              "checkout.session.completed missing customer email for routine email:",
              session.id
            );
            routineEmailStatus =
              "Automated routine email NOT sent - no customer email on the Stripe session. Send manually.";
          } else {
            // Never let an email failure fail the webhook - the purchase
            // row above is already recorded, and Stripe would otherwise
            // retry this event and re-run everything. sendRoutineEmail
            // returns a result rather than only throwing, since Resend
            // doesn't throw on API-level rejections - checking the
            // result (not just catching) is what actually catches those.
            try {
              const routineResult = await sendRoutineEmail(userId, recipientEmail);
              if (!routineResult.sent) {
                console.error(
                  "Routine email not sent:",
                  userId,
                  routineResult
                );
                routineEmailStatus = `Automated routine email FAILED to send (${routineResult.reason}) - see server logs. Send manually.`;
              }
            } catch (emailError) {
              console.error(
                "Failed to send routine email:",
                userId,
                emailError
              );
              routineEmailStatus =
                "Automated routine email FAILED to send - see server logs. Send manually.";
            }
          }

          await sendNotificationEmail(
            "New routine subscriber - action needed",
            `Someone just subscribed to the Qoyl Monthly Routine.

User ID: ${userId}
Stripe customer: ${stripeCustomerId}
Amount: $7.99/month recurring
Subscribed at: ${purchaseTimestamp}

Curl type: ${routineProfile?.curl_type ?? "Not set"}
Porosity: ${routineProfile?.porosity ?? "Not set"}
Zip code: ${routineProfile?.zip_code ?? "Not set"}
Climate: ${routineProfile?.climate ?? "Not set"}

${routineEmailStatus} Review their /routine page to confirm it looks correct.`
          );
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
