// Uses Twilio REST API via fetch — no SDK required
import { env } from "./env";

export async function sendSms(to: string, body: string): Promise<void> {
  try {
    const sid = env.twilioAccountSid;
    const token = env.twilioAuthToken;
    const from = env.twilioFromNumber;

    // Silently skip if Twilio is not configured
    if (!sid || !token || !from) return;

    const credentials = Buffer.from(`${sid}:${token}`).toString("base64");
    const params = new URLSearchParams({ From: from, To: to, Body: body });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!res.ok) {
      console.warn("Twilio SMS failed:", res.status, await res.text());
    }
  } catch (err) {
    // Never throw — SMS is always non-blocking
    console.warn("Twilio SMS error:", err);
  }
}
