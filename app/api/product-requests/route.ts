import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendNotificationEmail } from "@/lib/notify";
import { getResend } from "@/lib/resend";

export async function POST(request: Request) {
  console.log("[product-requests] route hit");

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

  console.log(
    "[product-requests] RESEND_API_KEY present:",
    Boolean(process.env.RESEND_API_KEY)
  );
  console.log(
    "[product-requests] getResend() returned:",
    getResend() ? "client" : "null"
  );

  const hasIngredientList = Boolean(ingredientList && ingredientList.trim());

  const notifyResult = await sendNotificationEmail(
    `Product evaluation request - ${productName}`,
    `Someone requested a product evaluation on Qoyl.

Product: ${productName}
Brand: ${brandName}
Where purchased: ${wherePurchased || "Not provided"}
Requester email: ${email}
Ingredient list provided: ${hasIngredientList ? "Yes - see below" : "No"}

${hasIngredientList ? ingredientList : ""}

Submitted at: ${new Date().toISOString()}

ACTION NEEDED: Evaluate this product and reply to ${email} within 48 hours with their compatibility score.`
  );

  console.log("[product-requests] sendNotificationEmail result:", notifyResult);

  return NextResponse.json({ ok: true });
}
