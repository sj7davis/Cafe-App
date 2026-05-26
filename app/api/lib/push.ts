import webpush from "web-push";
import { env } from "./env";

let configured = false;

function ensureConfigured() {
  if (!configured && env.vapidPublicKey && env.vapidPrivateKey) {
    webpush.setVapidDetails(env.vapidEmail, env.vapidPublicKey, env.vapidPrivateKey);
    configured = true;
  }
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPush(
  subscription: PushSubscriptionData,
  payload: { title: string; body: string; icon?: string; tag?: string }
): Promise<void> {
  ensureConfigured();
  if (!env.vapidPublicKey || !env.vapidPrivateKey) return; // silent no-op if not configured
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    );
  } catch (err: any) {
    // 410 Gone = subscription expired/revoked, caller should clean up
    if (err?.statusCode === 410) throw err;
    console.error("Push send error:", err?.message ?? err);
  }
}
