import { z } from "zod";
import { idSchema } from "./common";

export const queuePhaseSchema = z.enum(["waiting", "in_line", "your_turn"]);
export type QueuePhase = z.infer<typeof queuePhaseSchema>;

export const queueStatusSchema = z.object({
  id: idSchema,
  eventId: idSchema,
  phase: queuePhaseSchema,
  opensInSeconds: z.number().int().nonnegative(),
  ahead: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  etaMinutes: z.number().int().nonnegative(),
  progress: z.number().min(0).max(100),
  smsOptIn: z.boolean(),
  /** Minutes the buyer has to finish after their turn starts. */
  turnWindowMinutes: z.number().int().positive(),
});
export type QueueStatus = z.infer<typeof queueStatusSchema>;

export const joinQueueRequestSchema = z.object({ eventId: idSchema });
export const queueSmsRequestSchema = z.object({ smsOptIn: z.boolean() });
