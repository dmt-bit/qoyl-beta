import { NextResponse } from "next/server";
import { activateTravelKit } from "@/lib/activateTravelKit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Travel kits are free: /travel calls this directly after the survey is
// saved (app/api/travel-kits/route.ts), and it generates, activates, and
// emails the kit in one request.
//
// The caller's user_id comes from the request body, the same trust model
// as app/api/travel-kits/route.ts. The row ownership check below stops a
// caller from generating someone else's kit by id, but it does not verify
// the caller's identity.
//
// maxDuration is the platform ceiling. Hobby plans are capped at a shorter
// limit regardless of this value (see app/api/style-match/analyze/route.ts),
// so the timeout below is what guarantees the client gets an answer.
export const maxDuration = 30;

// Our own limit, set a few seconds under maxDuration so a slow kit fails
// with a real error and a 'failed' row instead of the platform cutting the
// connection and leaving the client spinning.
const GENERATION_TIMEOUT_MS = 25_000;

const TIMEOUT_MESSAGE = "Kit generation timed out";

export async function POST(request: Request) {
  const body = await request.json();
  const { user_id, travel_kit_id }: { user_id?: string; travel_kit_id?: string } = body;

  if (!user_id || !travel_kit_id) {
    return NextResponse.json(
      { error: "user_id and travel_kit_id are required." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  const { data: kitRow, error: kitError } = await admin
    .from("travel_kits")
    .select("user_id, status")
    .eq("id", travel_kit_id)
    .maybeSingle();

  if (kitError || !kitRow || kitRow.user_id !== user_id) {
    return NextResponse.json({ error: "Travel kit not found." }, { status: 404 });
  }

  // Already generated (e.g. a retried submit) - don't regenerate or send
  // the confirmation email a second time.
  if (kitRow.status === "active") {
    return NextResponse.json({ ok: true, status: "active", alreadyActive: true });
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(user_id);
  const recipientEmail = userError ? null : userData.user?.email ?? null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(TIMEOUT_MESSAGE)), GENERATION_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      activateTravelKit({ travelKitId: travel_kit_id, userId: user_id, recipientEmail }),
      timeout,
    ]);

    if (!result.ok) {
      await markFailed(travel_kit_id, "We couldn't build this kit. Please try again.");
      return NextResponse.json(
        { error: "We couldn't build this kit. Please try again.", status: "failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, status: "active" });
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === TIMEOUT_MESSAGE;
    console.error("[travel-kit-generate] failed:", travel_kit_id, err);
    await markFailed(
      travel_kit_id,
      isTimeout ? "generation timed out - please try again" : "Something went wrong."
    );
    return NextResponse.json(
      {
        error: isTimeout
          ? "This is taking longer than expected. Please try again."
          : "Something went wrong.",
        status: "failed",
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(timer);
  }
}

// Never overwrites an active kit: if generation finished after the timeout
// fired, the kit is already usable and the failure note shouldn't hide it.
async function markFailed(travelKitId: string, message: string) {
  const { error } = await getSupabaseAdmin()
    .from("travel_kits")
    .update({ status: "failed", error_message: message })
    .eq("id", travelKitId)
    .neq("status", "active");
  if (error) console.error("[travel-kit-generate] couldn't mark failed:", travelKitId, error.message);
}
