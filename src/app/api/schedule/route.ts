import { NextResponse } from "next/server";
import { scheduleRequestSchema } from "@/lib/api/contracts";
import { createScenarioInput, chooseAbsentEmployee } from "@/lib/scenario";
import {
  buildGreedySchedule,
  rescheduleForAbsences,
  solveSchedule,
} from "@/lib/scheduling";

export async function POST(request: Request) {
  const parsed = scheduleRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Choose a known scenario and scheduling strategy.",
          details: parsed.error.flatten(),
        },
      },
      { status: 422 },
    );
  }

  try {
    const input = parsed.data.input ?? createScenarioInput(parsed.data.scenario ?? "feasible");
    let data;

    if (parsed.data.scenario === "absence") {
      const current =
        parsed.data.currentAssignments ?? solveSchedule(input).assignments;
      const absentEmployeeId = chooseAbsentEmployee(input, current);
      data = rescheduleForAbsences(input, current, [absentEmployeeId]);
    } else {
      data =
        parsed.data.strategy === "greedy"
          ? buildGreedySchedule(input)
          : solveSchedule(input);
    }

    return NextResponse.json({
      data,
      meta: {
        fixture: parsed.data.input ? "custom-input" : "harbour-pine-v1",
        persisted: false,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "The scheduler could not evaluate this fixture.",
        },
      },
      { status: 500 },
    );
  }
}
