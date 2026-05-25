import { Resend } from "resend";
import { env } from "./env";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!env.resendApiKey) return; // EMAIL-04: skip gracefully when RESEND_API_KEY not configured
  try {
    const resend = new Resend(env.resendApiKey);
    await resend.emails.send({
      from: "B1 Platform <noreply@b1platform.com>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (err) {
    console.error("[email] send failed:", err);
    // Never rethrow — callers (createOrder, updateOrderStatus) must not fail due to email errors
  }
}
