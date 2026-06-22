import { z } from "zod";
import { createRouter, protectedProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import { staffTrainingTasks, staffTrainingCompletions, staffAccounts } from "@db/schema";
import { eq, and, asc } from "drizzle-orm";

export const trainingRouter = createRouter({
  // List all training tasks for a venue (owner view)
  listTasks: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    return db.select().from(staffTrainingTasks)
      .where(and(eq(staffTrainingTasks.venueId, venueId), eq(staffTrainingTasks.isActive, true)))
      .orderBy(asc(staffTrainingTasks.sortOrder), asc(staffTrainingTasks.id));
  }),

  createTask: protectedProcedure.input(z.object({
    token: z.string(),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    requiredRole: z.enum(["admin", "manager", "staff"]).optional(),
    sortOrder: z.number().default(0),
  })).mutation(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const [task] = await db.insert(staffTrainingTasks).values({
      venueId,
      title: input.title,
      description: input.description,
      requiredRole: input.requiredRole as any,
      sortOrder: input.sortOrder,
    }).returning();
    return task;
  }),

  updateTask: protectedProcedure.input(z.object({
    token: z.string(),
    id: z.number(),
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    sortOrder: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const updates: Record<string, any> = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
    await db.update(staffTrainingTasks).set(updates)
      .where(and(eq(staffTrainingTasks.id, input.id), eq(staffTrainingTasks.venueId, venueId)));
    return { ok: true };
  }),

  deleteTask: protectedProcedure.input(z.object({ token: z.string(), id: z.number() })).mutation(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    await db.update(staffTrainingTasks).set({ isActive: false })
      .where(and(eq(staffTrainingTasks.id, input.id), eq(staffTrainingTasks.venueId, venueId)));
    return { ok: true };
  }),

  // Staff marks a task as completed
  completeTask: protectedProcedure.input(z.object({
    token: z.string(),
    taskId: z.number(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const staffId = ctx.auth.staffId as number;
    const venueId = ctx.auth.venueId;
    const db = getDb();

    // Check not already completed
    const existing = await db.select().from(staffTrainingCompletions)
      .where(and(
        eq(staffTrainingCompletions.taskId, input.taskId),
        eq(staffTrainingCompletions.staffId, staffId)
      )).limit(1);
    if (existing.length > 0) return { id: existing[0].id, alreadyCompleted: true };

    const [completion] = await db.insert(staffTrainingCompletions).values({
      taskId: input.taskId,
      staffId,
      venueId,
      notes: input.notes,
    }).returning();
    return { id: completion.id, alreadyCompleted: false };
  }),

  // Manager/owner signs off on a completion
  signOff: protectedProcedure.input(z.object({
    token: z.string(),
    completionId: z.number(),
  })).mutation(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    // Could be a manager (staffId) or the owner (ownerId) — use whichever is present.
    const actorId = (ctx.auth.staffId ?? ctx.auth.ownerId) as number;
    const db = getDb();
    await db.update(staffTrainingCompletions).set({
      signedOffBy: actorId,
      signedOffAt: new Date(),
    }).where(and(
      eq(staffTrainingCompletions.id, input.completionId),
      eq(staffTrainingCompletions.venueId, venueId)
    ));
    return { ok: true };
  }),

  // Get my training progress (staff view)
  getMyProgress: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const staffId = ctx.auth.staffId as number;
    const venueId = ctx.auth.venueId;
    const db = getDb();

    const tasks = await db.select().from(staffTrainingTasks)
      .where(and(eq(staffTrainingTasks.venueId, venueId), eq(staffTrainingTasks.isActive, true)))
      .orderBy(asc(staffTrainingTasks.sortOrder));

    const completions = await db.select().from(staffTrainingCompletions)
      .where(eq(staffTrainingCompletions.staffId, staffId));

    const completedTaskIds = new Set(completions.map(c => c.taskId));
    const tasksWithStatus = tasks.map(t => ({
      ...t,
      completed: completedTaskIds.has(t.id),
      completion: completions.find(c => c.taskId === t.id) || null,
    }));

    return {
      tasks: tasksWithStatus,
      completedCount: completedTaskIds.size,
      totalCount: tasks.length,
      percentComplete: tasks.length > 0 ? Math.round((completedTaskIds.size / tasks.length) * 100) : 0,
    };
  }),

  // Get all staff training progress (manager/owner view)
  getTeamProgress: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();

    const tasks = await db.select().from(staffTrainingTasks)
      .where(and(eq(staffTrainingTasks.venueId, venueId), eq(staffTrainingTasks.isActive, true)));

    const staff = await db.select({ id: staffAccounts.id, name: staffAccounts.name, role: staffAccounts.role })
      .from(staffAccounts)
      .where(and(eq(staffAccounts.venueId, venueId), eq(staffAccounts.isActive, true)));

    const allCompletions = await db.select().from(staffTrainingCompletions)
      .where(eq(staffTrainingCompletions.venueId, venueId));

    const teamProgress = staff.map(s => {
      const completions = allCompletions.filter(c => c.staffId === s.id);
      const completedIds = new Set(completions.map(c => c.taskId));
      return {
        staffId: s.id,
        name: s.name,
        role: s.role,
        completedCount: completedIds.size,
        totalCount: tasks.length,
        percent: tasks.length > 0 ? Math.round((completedIds.size / tasks.length) * 100) : 0,
        pendingSignOff: completions.filter(c => !c.signedOffAt).length,
      };
    });

    return { staff: teamProgress, taskCount: tasks.length };
  }),
});
