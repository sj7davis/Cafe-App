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
};
