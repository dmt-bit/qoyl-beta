import { NextResponse } from "next/server";
import { sendNotificationEmail } from "@/lib/notify";

// CommentSection is a client component, so it can't import lib/notify.ts
// (and RESEND_API_KEY) directly -- this route is the server-side bridge,
// called fire-and-forget right after a successful post_comments insert.
export async function POST(request: Request) {
  const body = await request.json();
  const {
    post_title,
    post_slug,
    display_name,
    email,
    comment_body,
  }: Record<string, string | null> = body;

  await sendNotificationEmail(
    `New comment on '${post_title}'`,
    `New comment on your Qoyl post.

Post: ${post_title}
URL: https://qoyl-beta-alpha.vercel.app/posts/${post_slug}

From: ${display_name} (${email})
Comment: ${comment_body}
Posted at: ${new Date().toISOString()}

Reply directly to their email to respond.`
  );

  return NextResponse.json({ ok: true });
}
