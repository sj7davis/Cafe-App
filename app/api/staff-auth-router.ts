import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { staffAccounts, venues, staffTwoFaTokens } from "@db/schema";
import { eq, and, gt } from "drizzle-orm";
import { compare, hash } from "bcrypt-ts";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./lib/env";
import { sendEmail } from "./lib/email";
import { checkRateLimit } from "./lib/rate-limit";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateToken(length = 32): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export const staffAuthRouter = createRouter({
  // ─── Login (step 1 — may require 2FA) ───
  login: publicQuery.input(z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    venueId: z.number().int().positive(),
  })).mutation(async ({ input }) => {
    const allowed = checkRateLimit(`login:${input.venueId}:${input.username.toLowerCase()}`, 5, 15 * 60 * 1000);
    if (!allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many login attempts. Please try again in 15 minutes." });
    const db = getDb();
    const venueResults = await db.select().from(venues).where(eq(venues.id, input.venueId)).limit(1);
    const venue = venueResults[0];
    if (!venue || !venue.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });

    const staffResults = await db.select().from(staffAccounts)
      .where(and(eq(staffAccounts.username, input.username), eq(staffAccounts.venueId, input.venueId)))
      .limit(1);
    const staff = staffResults[0];
    if (!staff || !staff.isActive) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

    const valid = await compare(input.password, staff.passwordHash);
    if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

    await db.update(staffAccounts).set({ lastLoginAt: new Date() }).where(eq(staffAccounts.id, staff.id));

    // If 2FA enabled, issue a short-lived pending token and send OTP
    if (staff.twoFaEnabled && staff.email) {
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await db.insert(staffTwoFaTokens).values({ staffId: staff.id, code: otp, purpose: "login", expiresAt });

      await sendEmail({
        to: staff.email,
        subject: "B1 Platform — Your login verification code",
        html: `<p>Hi ${staff.name},</p><p>Your verification code is: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      }).catch(() => {});

      const pendingToken = await new SignJWT({ pendingStaffId: staff.id, venueId: staff.venueId, pending2FA: true })
        .setProtectedHeader({ alg: "HS256" }).setExpirationTime("10m").sign(JWT_SECRET);

      return { requiresTwoFa: true, pendingToken, venue: { id: venue.id, name: venue.name, slug: venue.slug } };
    }

    const token = await new SignJWT({ staffId: staff.id, venueId: staff.venueId, role: staff.role })
      .setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(JWT_SECRET);

    return {
      requiresTwoFa: false,
      token,
      staff: { id: staff.id, name: staff.name, username: staff.username, role: staff.role },
      venue: { id: venue.id, name: venue.name, slug: venue.slug },
    };
  }),

  // ─── Verify 2FA code ───
  verifyTwoFa: publicQuery.input(z.object({
    pendingToken: z.string(),
    code: z.string().length(6),
  })).mutation(async ({ input }) => {
    const db = getDb();
    let pendingPayload: any;
    try {
      const result = await jwtVerify(input.pendingToken, JWT_SECRET, { clockTolerance: 60 });
      pendingPayload = result.payload;
    } catch {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired session" });
    }
    if (!pendingPayload.pending2FA) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid session" });

    const staffId = pendingPayload.pendingStaffId as number;
    const now = new Date();

    // Find valid unused code
    const tokenRows = await db.select().from(staffTwoFaTokens)
      .where(and(
        eq(staffTwoFaTokens.staffId, staffId),
        eq(staffTwoFaTokens.code, input.code),
        eq(staffTwoFaTokens.purpose, "login"),
        gt(staffTwoFaTokens.expiresAt, now),
      )).limit(1);
    if (!tokenRows[0] || tokenRows[0].usedAt) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired code" });

    // Mark used
    await db.update(staffTwoFaTokens).set({ usedAt: now }).where(eq(staffTwoFaTokens.id, tokenRows[0].id));

    const staffResults = await db.select().from(staffAccounts).where(eq(staffAccounts.id, staffId)).limit(1);
    const staff = staffResults[0];
    if (!staff || !staff.isActive) throw new TRPCError({ code: "UNAUTHORIZED", message: "Account not found" });

    const venueResults = await db.select().from(venues).where(eq(venues.id, staff.venueId)).limit(1);
    const venue = venueResults[0];

    const token = await new SignJWT({ staffId: staff.id, venueId: staff.venueId, role: staff.role })
      .setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(JWT_SECRET);

    return {
      token,
      staff: { id: staff.id, name: staff.name, username: staff.username, role: staff.role },
      venue: venue ? { id: venue.id, name: venue.name, slug: venue.slug } : null,
    };
  }),

  // ─── Enable / Disable 2FA ───
  enable2FA: publicQuery.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    const db = getDb();
    const [staff] = await db.select().from(staffAccounts).where(eq(staffAccounts.id, staffId)).limit(1);
    if (!staff?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Add an email address before enabling 2FA" });
    await db.update(staffAccounts).set({ twoFaEnabled: true }).where(eq(staffAccounts.id, staffId));
    return { ok: true };
  }),

  disable2FA: publicQuery.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    const db = getDb();
    await db.update(staffAccounts).set({ twoFaEnabled: false }).where(eq(staffAccounts.id, staffId));
    return { ok: true };
  }),

  // ─── Forgot Password ───
  forgotPassword: publicQuery.input(z.object({
    email: z.string().email(),
    venueId: z.number().int().positive(),
  })).mutation(async ({ input }) => {
    const allowed = checkRateLimit(`reset:${input.email.toLowerCase()}`, 3, 60 * 60 * 1000);
    if (!allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many reset attempts. Please try again in 1 hour." });
    const db = getDb();
    const [staff] = await db.select().from(staffAccounts)
      .where(and(eq(staffAccounts.email, input.email), eq(staffAccounts.venueId, input.venueId)))
      .limit(1);
    // Always return success to avoid email enumeration
    if (!staff) return { ok: true };

    const resetToken = generateToken(32);
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.update(staffAccounts).set({ resetToken, resetTokenExpiry }).where(eq(staffAccounts.id, staff.id));

    const resetUrl = `${env.appUrl}/staff-login?reset=${resetToken}&venue=${input.venueId}`;
    await sendEmail({
      to: staff.email!,
      subject: "B1 Platform — Password reset",
      html: `<p>Hi ${staff.name},</p><p>Click the link below to reset your password (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, ignore this email.</p>`,
    }).catch(() => {});

    return { ok: true };
  }),

  // ─── Reset Password by Token ───
  resetPasswordByToken: publicQuery.input(z.object({
    resetToken: z.string(),
    venueId: z.number().int().positive(),
    newPassword: z.string().min(6),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const now = new Date();
    const [staff] = await db.select().from(staffAccounts)
      .where(and(
        eq(staffAccounts.resetToken, input.resetToken),
        eq(staffAccounts.venueId, input.venueId),
        gt(staffAccounts.resetTokenExpiry as any, now),
      )).limit(1);
    if (!staff) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset link" });

    const passwordHash = await hash(input.newPassword, 10);
    await db.update(staffAccounts).set({ passwordHash, resetToken: null, resetTokenExpiry: null })
      .where(eq(staffAccounts.id, staff.id));
    return { ok: true };
  }),

  // ─── Verify Email ───
  verifyEmail: publicQuery.input(z.object({
    token: z.string(),
    venueId: z.number().int().positive(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const now = new Date();
    const [staff] = await db.select().from(staffAccounts)
      .where(and(
        eq(staffAccounts.emailVerifyToken, input.token),
        eq(staffAccounts.venueId, input.venueId),
        gt(staffAccounts.emailVerifyExpiry as any, now),
      )).limit(1);
    if (!staff) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired verification link" });
    await db.update(staffAccounts).set({ emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null })
      .where(eq(staffAccounts.id, staff.id));
    return { ok: true };
  }),

  // ─── Get current staff from token ───
  me: publicQuery.input(z.object({ token: z.string() }).optional()).query(async ({ input }) => {
    if (!input?.token) return null;
    try {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const db = getDb();
      const [staff] = await db.select().from(staffAccounts)
        .where(eq(staffAccounts.id, payload.payload.staffId as number)).limit(1);
      if (!staff || !staff.isActive) return null;
      const [venue] = await db.select().from(venues).where(eq(venues.id, staff.venueId)).limit(1);
      return {
        staff: { id: staff.id, name: staff.name, username: staff.username, role: staff.role, email: staff.email, phone: staff.phone, twoFaEnabled: staff.twoFaEnabled, employmentType: staff.employmentType },
        venue: venue ? { id: venue.id, name: venue.name, slug: venue.slug } : null,
      };
    } catch { return null; }
  }),

  // ─── Update my profile ───
  updateMyProfile: publicQuery.input(z.object({
    token: z.string(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    emergencyContact: z.string().optional(),
    emergencyPhone: z.string().optional(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    const db = getDb();
    const [staff] = await db.select().from(staffAccounts).where(eq(staffAccounts.id, staffId)).limit(1);
    if (!staff) throw new TRPCError({ code: "NOT_FOUND", message: "Staff not found" });

    const updates: Record<string, any> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.emergencyContact !== undefined) updates.emergencyContact = input.emergencyContact;
    if (input.emergencyPhone !== undefined) updates.emergencyPhone = input.emergencyPhone;
    if (input.email !== undefined && input.email !== staff.email) {
      // New email — send verify email
      const verifyToken = generateToken(32);
      const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      updates.email = input.email;
      updates.emailVerified = false;
      updates.emailVerifyToken = verifyToken;
      updates.emailVerifyExpiry = verifyExpiry;
      const verifyUrl = `${env.appUrl}/staff-login?verify=${verifyToken}&venue=${staff.venueId}`;
      await sendEmail({
        to: input.email,
        subject: "B1 Platform — Verify your email",
        html: `<p>Hi ${staff.name},</p><p>Please verify your email: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
      }).catch(() => {});
    }
    if (Object.keys(updates).length > 0) {
      await db.update(staffAccounts).set(updates).where(eq(staffAccounts.id, staffId));
    }
    return { ok: true };
  }),

  // ─── Change my password ───
  changePassword: publicQuery.input(z.object({
    token: z.string(),
    currentPassword: z.string(),
    newPassword: z.string().min(6),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    const db = getDb();
    const [staff] = await db.select().from(staffAccounts).where(eq(staffAccounts.id, staffId)).limit(1);
    if (!staff) throw new TRPCError({ code: "NOT_FOUND", message: "Staff not found" });
    const valid = await compare(input.currentPassword, staff.passwordHash);
    if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
    const passwordHash = await hash(input.newPassword, 10);
    await db.update(staffAccounts).set({ passwordHash }).where(eq(staffAccounts.id, staffId));
    return { ok: true };
  }),

  // ─── List staff (admin/manager) ───
  list: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    const callerRole = payload.payload.role as string;
    if (callerRole === "staff") throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
    const allStaff = await db.select().from(staffAccounts).where(eq(staffAccounts.venueId, venueId));
    return allStaff.map(s => ({
      id: s.id, name: s.name, username: s.username, role: s.role, isActive: s.isActive,
      email: s.email, phone: s.phone, employmentType: s.employmentType, hourlyRate: s.hourlyRate,
      twoFaEnabled: s.twoFaEnabled, emailVerified: s.emailVerified,
      lastLoginAt: s.lastLoginAt, createdAt: s.createdAt,
    }));
  }),

  // ─── Create staff (admin only) ───
  create: publicQuery.input(z.object({
    token: z.string(),
    name: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(6),
    role: z.enum(["admin", "manager", "staff"]),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    employmentType: z.enum(["full_time", "part_time", "casual"]).default("casual"),
    hourlyRate: z.number().optional(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const callerRole = payload.payload.role as string;
    if (callerRole !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    const db = getDb();

    const existing = await db.select().from(staffAccounts)
      .where(and(eq(staffAccounts.username, input.username), eq(staffAccounts.venueId, venueId))).limit(1);
    if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Username already taken" });

    const passwordHash = await hash(input.password, 10);
    let emailVerifyToken: string | undefined;
    let emailVerifyExpiry: Date | undefined;
    if (input.email) {
      emailVerifyToken = generateToken(32);
      emailVerifyExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h
    }

    const [newStaff] = await db.insert(staffAccounts).values({
      venueId, name: input.name, username: input.username, passwordHash, role: input.role,
      email: input.email, phone: input.phone, employmentType: input.employmentType as any,
      hourlyRate: input.hourlyRate ? String(input.hourlyRate) : null,
      emailVerifyToken, emailVerifyExpiry,
    }).returning({ id: staffAccounts.id });

    // Send welcome email — set-password link instead of plaintext password
    if (input.email) {
      const setPasswordToken = generateToken(32);
      const setPasswordExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000);
      await db.update(staffAccounts).set({ resetToken: setPasswordToken, resetTokenExpiry: setPasswordExpiry })
        .where(eq(staffAccounts.id, newStaff.id));

      const setPasswordUrl = `${env.appUrl}/staff-login?reset=${setPasswordToken}&venue=${venueId}`;
      await sendEmail({
        to: input.email,
        subject: "Welcome to B1 Platform — Set your password",
        html: `<p>Hi ${input.name},</p><p>Your staff account has been created at <strong>${env.appUrl}</strong>.</p>
<ul><li><strong>Username:</strong> ${input.username}</li><li><strong>Venue ID:</strong> ${venueId}</li></ul>
<p><a href="${setPasswordUrl}" style="background:#1c1917;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Set Your Password</a></p>
<p>This link expires in 72 hours.</p>`,
      }).catch(() => {});
    }

    return { success: true, id: newStaff.id };
  }),

  // ─── Update staff (admin only) ───
  update: publicQuery.input(z.object({
    token: z.string(),
    staffId: z.number().int().positive(),
    name: z.string().optional(),
    role: z.enum(["admin", "manager", "staff"]).optional(),
    isActive: z.boolean().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    employmentType: z.enum(["full_time", "part_time", "casual"]).optional(),
    hourlyRate: z.number().optional(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const callerRole = payload.payload.role as string;
    if (callerRole !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    const db = getDb();
    const updates: Record<string, any> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.role !== undefined) updates.role = input.role;
    if (input.isActive !== undefined) updates.isActive = input.isActive;
    if (input.email !== undefined) updates.email = input.email;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.employmentType !== undefined) updates.employmentType = input.employmentType;
    if (input.hourlyRate !== undefined) updates.hourlyRate = String(input.hourlyRate);
    if (Object.keys(updates).length > 0) {
      await db.update(staffAccounts).set(updates).where(eq(staffAccounts.id, input.staffId));
    }
    return { success: true };
  }),

  // ─── Set clock PIN ───
  setClockPin: publicQuery.input(z.object({
    token: z.string(),
    pin: z.string().regex(/^\d{4,8}$/, "PIN must be 4–8 digits"),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    if (!staffId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = getDb();
    await db.update(staffAccounts).set({ clockPin: input.pin }).where(eq(staffAccounts.id, staffId));
    return { ok: true };
  }),

  // ─── Clear clock PIN ───
  clearClockPin: publicQuery.input(z.object({
    token: z.string(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    if (!staffId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = getDb();
    await db.update(staffAccounts).set({ clockPin: null }).where(eq(staffAccounts.id, staffId));
    return { ok: true };
  }),

  // ─── Reset staff password (admin only) ───
  resetPassword: publicQuery.input(z.object({
    token: z.string(),
    staffId: z.number().int().positive(),
    newPassword: z.string().min(6),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const callerRole = payload.payload.role as string;
    if (callerRole !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    const db = getDb();
    const passwordHash = await hash(input.newPassword, 10);
    await db.update(staffAccounts).set({ passwordHash }).where(eq(staffAccounts.id, input.staffId));
    return { success: true };
  }),

  // ─── Set clock PIN (staff sets their own 4–8 digit tablet PIN) ───
  setClockPin: publicQuery.input(z.object({
    token: z.string(),
    pin: z.string().regex(/^\d{4,8}$/, 'PIN must be 4–8 digits'),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    if (!staffId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = getDb();
    await db.update(staffAccounts).set({ clockPin: input.pin }).where(eq(staffAccounts.id, staffId));
    return { ok: true };
  }),

  // ─── Clear clock PIN ───
  clearClockPin: publicQuery.input(z.object({
    token: z.string(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    if (!staffId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = getDb();
    await db.update(staffAccounts).set({ clockPin: null }).where(eq(staffAccounts.id, staffId));
    return { ok: true };
  }),
});
