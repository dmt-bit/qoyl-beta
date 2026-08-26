import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { curlFamily } from "@/lib/compatibility";
import { sendNotificationEmail } from "@/lib/notify";
import { getWashFrequencyDays, toIsoDate } from "@/lib/routineCalendar";
import { calculateStreak, fetchCompletedDays, hasAnyCompletion } from "@/lib/routineCompletions";

// TODO: Beehiiv/Resend wash day reminder email
// Fire the night before each scheduled wash day based on
// completed_routine_days and wash interval. This will be built in the
// email sequence session.

type CheckOffRequestBody = {
  user_id?: string;
  completed_date?: string;
  wash_type?: string;
  notes?: string | null;
};

// Streak/first-completion notifications to hey@qoyl.live - best-effort,
// never allowed to fail or delay the check-off response itself.
async function notifyOnMilestones(userId: string, isFirstEver: boolean) {
  const admin = getSupabaseAdmin();

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const email = userData?.user?.email ?? userId;

  if (isFirstEver) {
    await sendNotificationEmail(
      "First routine completion",
      `First routine completion — ${email}`
    );
  }

  const { data: profile } = await admin
    .from("hair_profiles")
    .select("curl_type, porosity, scalp_condition, routine_start_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) return;

  const family = curlFamily(profile.curl_type);
  const { recommended: interval } = getWashFrequencyDays(
    profile.curl_type,
    profile.porosity,
    profile.scalp_condition
  );
  const routineStartDate = profile.routine_start_date
    ? new Date(`${profile.routine_start_date}T00:00:00`)
    : new Date();
  const today = new Date();

  const completedDays = await fetchCompletedDays(userId, toIsoDate(routineStartDate));
  const streak = calculateStreak(today, routineStartDate, family, interval, new Set(completedDays.keys()));

  if (streak === 7) {
    await sendNotificationEmail("7-day streak", `7-day streak — ${email}`);
  } else if (streak === 30) {
    await sendNotificationEmail(
      "30-day streak",
      `30-day streak — ${email} — consider reaching out personally`
    );
  }
}

export async function POST(request: Request) {
  const body: CheckOffRequestBody = await request.json();
  const { user_id, completed_date, wash_type, notes } = body;

  if (!user_id || !completed_date || !wash_type) {
    return NextResponse.json(
      { error: "user_id, completed_date, and wash_type are required." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  // Checked before the insert, not after - once the row exists,
  // hasAnyCompletion would obviously return true for every check-off,
  // including this very first one.
  const isFirstEver = !(await hasAnyCompletion(user_id));

  const { data: row, error } = await admin
    .from("completed_routine_days")
    .insert({
      user_id,
      completed_date,
      wash_type,
      notes: notes ?? null,
    })
    .select("completed_date, created_at")
    .single();

  if (error) {
    // Unique violation (user_id, completed_date) - already checked off
    // today from another tab/request. Not a real failure from the
    // client's perspective.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Already checked off for this date." },
        { status: 409 }
      );
    }
    console.error("[routine/check-off] Failed to insert:", error);
    return NextResponse.json(
      { error: "Couldn't save this. Please try again." },
      { status: 500 }
    );
  }

  notifyOnMilestones(user_id, isFirstEver).catch((err) =>
    console.error("[routine/check-off] Milestone notification failed:", err)
  );

  return NextResponse.json({ completedAt: row.created_at });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  const completedDate = searchParams.get("completed_date");

  if (!userId || !completedDate) {
    return NextResponse.json(
      { error: "user_id and completed_date are required." },
      { status: 400 }
    );
  }

  const { error } = await getSupabaseAdmin()
    .from("completed_routine_days")
    .delete()
    .eq("user_id", userId)
    .eq("completed_date", completedDate);

  if (error) {
    console.error("[routine/check-off] Failed to delete:", error);
    return NextResponse.json(
      { error: "Couldn't undo. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
