import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const FROM_ADDRESS = "Qoyl <support@qoyl.live>";
const NOTIFY_ADDRESS = "support@qoyl.live";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    productName,
    brandName,
    wherePurchased,
    ingredientList,
    email,
    userId,
  }: {
    productName?: string;
    brandName?: string;
    wherePurchased?: string;
    ingredientList?: string;
    email?: string;
    userId?: string;
  } = body;

  if (!productName || !brandName || !email) {
    return NextResponse.json(
      { error: "Product name, brand name, and email are required." },
      { status: 400 }
    );
  }

  const { error: insertError } = await supabase.from("product_requests").insert({
    user_id: userId ?? null,
    product_name: productName,
    brand_name: brandName,
    where_purchased: wherePurchased || null,
    ingredient_list: ingredientList || null,
    email,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: email,
        subject: `We got your request — ${productName} is on our list`,
        text: `Hi,

Thanks for sending over ${productName}${
          brandName ? ` by ${brandName}` : ""
        } — it's officially on our list.

I'll personally evaluate it against your hair profile within the next 48 hours and email you the full personalized score as soon as it's ready.

Appreciate you taking the time to send it our way.

D, founder of Qoyl`,
      });

      await resend.emails.send({
        from: FROM_ADDRESS,
        to: NOTIFY_ADDRESS,
        replyTo: email,
        subject: `New product evaluation request — ${productName}`,
        text: `New product evaluation request:

Product: ${productName}
Brand: ${brandName}
Where purchased: ${wherePurchased || "Not provided"}
Requester email: ${email}

Ingredient list:
${ingredientList || "Not provided"}`,
      });
    } catch (emailError) {
      console.error("Failed to send product request emails:", emailError);
    }
  } else {
    console.warn(
      "RESEND_API_KEY is not set; skipping product request emails."
    );
  }

  return NextResponse.json({ ok: true });
}
