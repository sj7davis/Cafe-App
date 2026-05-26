import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { npsResponses } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const npsRouter = createRouter({
  // Public: submit an NPS response
  submit: publicQuery
    .input(
      z.object({
        venueId: z.number().int().positive(),
        orderId: z.number().int().positive().optional(),
        phone: z.string().optional(),
        score: z.number().int().min(1).max(10),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [response] = await db
        .insert(npsResponses)
        .values({
          venueId: input.venueId,
          orderId: input.orderId ?? null,
          phone: input.phone ?? null,
          score: input.score,
          comment: input.comment ?? null,
        })
        .returning();
      return response;
    }),

  // Owner: get NPS statistics
  getStats: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();

      const responses = await db
        .select()
        .from(npsResponses)
        .where(eq(npsResponses.venueId, venueId));

      const totalResponses = responses.length;

      if (totalResponses === 0) {
        return {
          totalResponses: 0,
          averageScore: null,
          distribution: {} as Record<string, number>,
          npsScore: null,
          recentResponses: [],
        };
      }

      const sum = responses.reduce((acc, r) => acc + r.score, 0);
      const averageScore = Math.round((sum / totalResponses) * 10) / 10;

      // Distribution
      const distribution: Record<string, number> = {};
      for (let i = 1; i <= 10; i++) {
        distribution[String(i)] = 0;
      }
      for (const r of responses) {
        distribution[String(r.score)] = (distribution[String(r.score)] ?? 0) + 1;
      }

      // NPS: promoters = 9-10, detractors = 1-6
      const promoters = responses.filter((r) => r.score >= 9).length;
      const detractors = responses.filter((r) => r.score <= 6).length;
      const npsScore = Math.round(((promoters - detractors) / totalResponses) * 100);

      // Recent responses
      const recentResponses = await db
        .select()
        .from(npsResponses)
        .where(eq(npsResponses.venueId, venueId))
        .orderBy(desc(npsResponses.createdAt))
        .limit(20);

      return { totalResponses, averageScore, distribution, npsScore, recentResponses };
    }),

  // Owner: list recent responses
  list: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();
      return db
        .select()
        .from(npsResponses)
        .where(eq(npsResponses.venueId, venueId))
        .orderBy(desc(npsResponses.createdAt))
        .limit(50);
    }),
});
