import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendRoutineEmail } from "@/lib/sendRoutineEmail";
import { sendAdminNotification } from "@/lib/adminNotify";
import { sendNotificationEmail } from "@/lib/notify";
import { generateTravelKitProducts } from "@/lib/travelKitGenerator";
import { sendTravelKitEmail } from "@/lib/sendTravelKitEmail";

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
          const travelKitId = session.metadata?.travel_kit_id;

          if (!travelKitId) {
            console.error(
              "checkout.session.completed travel_kit purchase missing travel_kit_id metadata:",
              session.id
            );
          } else {
            const { data: travelKitRow, error: fetchError } =
              await getSupabaseAdmin()
                .from("travel_kits")
                .select(
                  "destination, departure_date, return_date, climate, swimming, protective_style, hair_priority"
                )
                .eq("id", travelKitId)
                .single();

            if (fetchError || !travelKitRow) {
              console.error(
                "Couldn't load travel_kits row for generation:",
                travelKitId,
                fetchError
              );
            } else {
              const products = await generateTravelKitProducts({
                userId,
                climate: travelKitRow.climate,
                swimming: travelKitRow.swimming,
                protectiveStyle: travelKitRow.protective_style,
                hairPriority: travelKitRow.hair_priority,
              });

              const { error: updateError } = await getSupabaseAdmin()
                .from("travel_kits")
                .update({
                  status: "active",
                  products,
                  stripe_session_id: session.id,
                })
                .eq("id", travelKitId);

              if (updateError) {
                console.error(
                  "Failed to update travel_kits row after payment:",
                  travelKitId,
                  updateError
                );
              }

              const { data: travelProfile } = await getSupabaseAdmin()
                .from("hair_profiles")
                .select("curl_type, porosity, scalp_condition, zip_code")
                .eq("user_id", userId)
                .maybeSingle();

              const recipientEmail =
                session.customer_email ?? session.customer_details?.email ?? null;

              let travelEmailStatus = "Confirmation email sent to customer.";

              if (!recipientEmail) {
                console.error(
                  "checkout.session.completed missing customer email for travel kit email:",
                  session.id
                );
                travelEmailStatus =
                  "Confirmation email NOT sent — no customer email on the Stripe session.";
              } else {
                try {
                  await sendTravelKitEmail({
                    recipientEmail,
                    destination: travelKitRow.destination,
                    departureDate: travelKitRow.departure_date,
                    returnDate: travelKitRow.return_date,
                    climate: travelKitRow.climate,
                    swimming: travelKitRow.swimming,
                    protectiveStyle: travelKitRow.protective_style,
                    products,
                  });
                } catch (emailError) {
                  console.error(
                    "Failed to send travel kit email:",
                    travelKitId,
                    emailError
                  );
                  travelEmailStatus =
                    "Confirmation email FAILED to send — see server logs.";
                }
              }

              await sendNotificationEmail(
                `Travel kit purchased — ${travelKitRow.destination}`,
                `Travel kit purchased and generated — ${travelKitRow.destination} for ${userId}.

User ID: ${userId}
Customer email: ${recipientEmail ?? "Unknown"}
Destination: ${travelKitRow.destination}
Departure: ${travelKitRow.departure_date ?? "Not set"}
Return: ${travelKitRow.return_date ?? "Not set"}
Stripe customer: ${stripeCustomerId}
Amount: $4.99
Purchased at: ${purchaseTimestamp}

Curl type: ${travelProfile?.curl_type ?? "Not set"}
Porosity: ${travelProfile?.porosity ?? "Not set"}
Scalp condition: ${travelProfile?.scalp_condition ?? "Not set"}
Zip code: ${travelProfile?.zip_code ?? "Not set"}

Products generated: ${products.length}
${travelEmailStatus}

View this travel_kits row (id: ${travelKitId}) in Supabase:
https://app.supabase.com/project/cqpxiassldkmusngqorx/editor`
              );
            }
          }
        }

        if (productType === "routine_subscription") {
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
              "Automated routine email NOT sent — no customer email on the Stripe session. Send manually.";
          } else {
            // Never let an email failure fail the webhook -- the purchase
            // row above is already recorded, and Stripe would otherwise
            // retry this event and re-run everything. sendRoutineEmail
            // returns a result rather than only throwing, since Resend
            // doesn't throw on API-level rejections -- checking the
            // result (not just catching) is what actually catches those.
            try {
              const routineResult = await sendRoutineEmail(userId, recipientEmail);
              if (!routineResult.sent) {
                console.error(
                  "Routine email not sent:",
                  userId,
                  routineResult
                );
                routineEmailStatus = `Automated routine email FAILED to send (${routineResult.reason}) — see server logs. Send manually.`;
              }
            } catch (emailError) {
              console.error(
                "Failed to send routine email:",
                userId,
                emailError
              );
              routineEmailStatus =
                "Automated routine email FAILED to send — see server logs. Send manually.";
            }
          }

          await sendNotificationEmail(
            "New routine subscriber — action needed",
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
