import { NextResponse } from "next/server";
import { sendNotificationEmail } from "@/lib/notify";

// CommentSection is a client component, so it can't import lib/notify.ts
// (and RESEND_API_KEY) directly - this route is the server-side bridge,
// called fire-and-forget right after a successful post_comments insert.
// Note: this route only sends the admin email notification - it never
// inserts the comment itself, so it can't be the cause of a comment
// failing to post. See components/CommentSection.tsx, which inserts
// directly into post_comments via the Supabase client.
export async function POST(request: Request) {
  console.log("[notify/new-comment] route hit");

  const body = await request.json();
  console.log("[notify/new-comment] request body:", JSON.stringify(body));

  const {
    post_title,
    post_slug,
    display_name,
    email,
    comment_body,
  }: Record<string, string | null> = body;

  const notifyResult = await sendNotificationEmail(
    `New comment on '${post_title}'`,
    `New comment on your Qoyl post.

Post: ${post_title}
URL: https://qoyl-beta-alpha.vercel.app/posts/${post_slug}

From: ${display_name} (${email})
Comment: ${comment_body}
Posted at: ${new Date().toISOString()}

Reply directly to their email to respond.`
  );

  console.log("[notify/new-comment] sendNotificationEmail result:", notifyResult);

  return NextResponse.json({ ok: true });
}
