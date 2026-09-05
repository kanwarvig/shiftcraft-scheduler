import type { ScenarioId } from "@/lib/scenario";

export type Strategy = "greedy" | "branch-and-bound";

export const CASES = [
  { id: "feasible", number: "01", verb: "PLAN", title: "Rush week", summary: "Cover every café role with a tight mix of baristas and keyholders.", question: "Can every role be covered?", outcome: "A valid roster plus a preference-quality comparison.", tone: "forest" },
  { id: "infeasible", number: "02", verb: "EXPLAIN", title: "Keyholder gap", summary: "Trace a required opening role with no qualified, available person.", question: "Why is this plan impossible?", outcome: "A concrete conflict with manager-owned repair choices.", tone: "ochre" },
  { id: "absence", number: "03", verb: "REPAIR", title: "Barista calls out", summary: "Keep valid work in place and move only what the absence breaks.", question: "How little needs to move?", outcome: "A repaired roster with retained and disrupted assignment counts.", tone: "cobalt" },
] satisfies Array<{ id: ScenarioId; number: string; verb: string; title: string; summary: string; question: string; outcome: string; tone: string }>;

export const STRATEGY_COPY: Record<Strategy, { label: string; detail: string }> = {
  greedy: { label: "Greedy baseline", detail: "Best local option, slot by slot." },
  "branch-and-bound": { label: "Preference search", detail: "Whole-week search with pruning." },
};

export function getCase(id: ScenarioId) {
  return CASES.find((item) => item.id === id) ?? CASES[0];
}
