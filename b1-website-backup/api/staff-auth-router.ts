import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { staffAccounts } from "@db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.APP_SECRET || "b1-staff-secret-key";

export interface StaffTokenPayload {
  staffId: number;
  username: string;
  role: string;
  name: string;
}

export function verifyStaffToken(token: string): StaffTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as StaffTokenPayload;
  } catch {
    return null;
  }
}

export function signStaffToken(payload: StaffTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export const staffAuthRouter = createRouter({
  login: publicQuery
    .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select()
        .from(staffAccounts)
        .where(eq(staffAccounts.username, input.username))
        .limit(1);

      if (!account || !account.isActive) {
        throw new Error("Invalid username or password");
      }

      const valid = await bcrypt.compare(input.password, account.passwordHash);
      if (!valid) {
        throw new Error("Invalid username or password");
      }

      await db
        .update(staffAccounts)
        .set({ lastLoginAt: new Date() })
        .where(eq(staffAccounts.id, account.id));

      const token = signStaffToken({
        staffId: account.id,
        username: account.username,
        role: account.role,
        name: account.name,
      });

      return {
        token,
        staff: {
          id: account.id,
          name: account.name,
          username: account.username,
          role: account.role,
        },
      };
    }),

  me: publicQuery
    .input(z.object({ token: z.string() }).optional())
    .query(async ({ input }) => {
      if (!input?.token) return null;
      const payload = verifyStaffToken(input.token);
      if (!payload) return null;

      const db = getDb();
      const [account] = await db
        .select()
        .from(staffAccounts)
        .where(eq(staffAccounts.id, payload.staffId))
        .limit(1);

      if (!account || !account.isActive) return null;

      return {
        id: account.id,
        name: account.name,
        username: account.username,
        role: account.role,
      };
    }),

  create: publicQuery
    .input(z.object({
      name: z.string().min(1),
      username: z.string().min(3),
      password: z.string().min(6),
      role: z.enum(["admin", "manager", "staff"]),
      adminToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      const payload = verifyStaffToken(input.adminToken);
      if (!payload || payload.role !== "admin") {
        throw new Error("Admin access required");
      }

      const db = getDb();
      const hash = await bcrypt.hash(input.password, 10);
      await db.insert(staffAccounts).values({
        name: input.name,
        username: input.username,
        passwordHash: hash,
        role: input.role,
      });
      return { success: true };
    }),

  list: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = verifyStaffToken(input.token);
      if (!payload || payload.role !== "admin") {
        throw new Error("Admin access required");
      }

      const db = getDb();
      const accounts = await db.select().from(staffAccounts);
      return accounts.map((a) => ({
        id: a.id,
        name: a.name,
        username: a.username,
        role: a.role,
        isActive: a.isActive,
        lastLoginAt: a.lastLoginAt,
        createdAt: a.createdAt,
      }));
    }),

  updateRole: publicQuery
    .input(z.object({
      staffId: z.number(),
      role: z.enum(["admin", "manager", "staff"]),
      isActive: z.boolean().optional(),
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      const payload = verifyStaffToken(input.token);
      if (!payload || payload.role !== "admin") {
        throw new Error("Admin access required");
      }

      const db = getDb();
      const update: any = { role: input.role };
      if (input.isActive !== undefined) update.isActive = input.isActive;
      await db.update(staffAccounts).set(update).where(eq(staffAccounts.id, input.staffId));
      return { success: true };
    }),

  resetPassword: publicQuery
    .input(z.object({
      staffId: z.number(),
      newPassword: z.string().min(6),
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      const payload = verifyStaffToken(input.token);
      if (!payload || payload.role !== "admin") {
        throw new Error("Admin access required");
      }

      const db = getDb();
      const hash = await bcrypt.hash(input.newPassword, 10);
      await db.update(staffAccounts).set({ passwordHash: hash }).where(eq(staffAccounts.id, input.staffId));
      return { success: true };
    }),
});
