import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: process.env.JWT_SECRET || "b1-platform-jwt-secret-dev-only",
  platformAdminSecret: process.env.PLATFORM_ADMIN_SECRET || "b1-platform-admin-secret-dev-only",
  port: parseInt(process.env.PORT || "3001"),
  resendApiKey: process.env.RESEND_API_KEY || "",
  appUrl: process.env.APP_URL || "https://b1platform.com",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || "",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "BPpmlYOB1TcR2ipSZiGyr-cyaq2KHXPcZnzT8K_ubb6Z6PSCsppjyPM-Zb7AZg0ol6qS1yqzTLB8dPx-G5edN_M",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidEmail: process.env.VAPID_EMAIL ?? "mailto:admin@example.com",
  stripePriceIdStarter: process.env.STRIPE_PRICE_STARTER ?? "",
  stripePriceIdGrowth: process.env.STRIPE_PRICE_GROWTH ?? "",
  stripePriceIdPro: process.env.STRIPE_PRICE_PRO ?? "",
  xeroClientId: process.env.XERO_CLIENT_ID ?? "",
  xeroClientSecret: process.env.XERO_CLIENT_SECRET ?? "",
  lightspeedClientId: process.env.LIGHTSPEED_CLIENT_ID ?? "",
  lightspeedClientSecret: process.env.LIGHTSPEED_CLIENT_SECRET ?? "",
};
