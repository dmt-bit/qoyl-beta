import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

  return NextResponse.json({ ok: true });
}
