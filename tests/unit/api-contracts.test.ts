import { describe, expect, it } from "vitest";
import { scheduleRequestSchema } from "../../src/lib/api/contracts";
import { createHarbourPineScenario } from "../../src/lib/data";

describe("schedule API boundary", () => {
  it("accepts a complete caller-supplied scheduling model", () => {
    const parsed = scheduleRequestSchema.safeParse({
      strategy: "branch-and-bound",
      input: createHarbourPineScenario(),
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects malformed caller-supplied constraints", () => {
    const input = createHarbourPineScenario();
    input.employees[0].maxWeeklyHours = -1;

    const parsed = scheduleRequestSchema.safeParse({
      strategy: "branch-and-bound",
      input,
    });

    expect(parsed.success).toBe(false);
  });

  it("requires either a full model or an explicit demo scenario", () => {
    expect(scheduleRequestSchema.safeParse({ strategy: "greedy" }).success).toBe(false);
  });
});
