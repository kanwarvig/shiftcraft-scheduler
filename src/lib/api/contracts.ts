import { z } from "zod";
import type { ScheduleResult } from "@/lib/scheduling";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const assignmentSchema = z.object({
  employeeId: z.string().min(1),
  shiftId: z.string().min(1),
  skill: z.string().min(1),
});

export const scheduleInputSchema = z.object({
  cafeName: z.string().min(1).max(100),
  weekStart: dateSchema,
  employees: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    skills: z.array(z.string().min(1)).min(1),
    availability: z.array(z.object({ date: dateSchema, start: timeSchema, end: timeSchema })),
    maxWeeklyHours: z.number().positive().max(168),
    shiftPreferences: z.record(z.string(), z.number().finite()).optional(),
  })).min(1).max(100),
  shifts: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    date: dateSchema,
    start: timeSchema,
    end: timeSchema,
    coverage: z.array(z.object({ skill: z.string().min(1), count: z.number().int().positive().max(20) })).min(1),
  })).min(1).max(100),
});

export const scheduleRequestSchema = z.object({
  scenario: z.enum(["feasible", "infeasible", "absence"]).optional(),
  input: scheduleInputSchema.optional(),
  strategy: z.enum(["greedy", "branch-and-bound"]),
  currentAssignments: z.array(assignmentSchema).optional(),
}).refine((value) => Boolean(value.input || value.scenario), {
  message: "Provide a schedule input or a named demo scenario.",
});

export type ScheduleRequest = z.infer<typeof scheduleRequestSchema>;

export interface ScheduleSuccessResponse {
  data: ScheduleResult;
  meta: {
    fixture: "harbour-pine-v1" | "custom-input";
    persisted: false;
    generatedAt: string;
  };
}

export interface ScheduleErrorResponse {
  error: {
    code: "VALIDATION_ERROR" | "INTERNAL_ERROR";
    message: string;
    details?: unknown;
  };
}

export type ScheduleResponse = ScheduleSuccessResponse | ScheduleErrorResponse;

export function isScheduleSuccess(
  response: ScheduleResponse,
): response is ScheduleSuccessResponse {
  return "data" in response;
}
