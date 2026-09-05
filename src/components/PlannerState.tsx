"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Assignment, ScheduleInput, ScheduleResult } from "@/lib/scheduling";
import { validateManualAssignments } from "@/lib/scheduling";
import { isScheduleSuccess, type ScheduleResponse } from "@/lib/api/contracts";
import { createScenarioInput, type ScenarioId } from "@/lib/scenario";
import type { Strategy } from "@/lib/product";

export type ResultWithRecovery = ScheduleResult & {
  retainedAssignmentCount?: number;
  displacedAssignmentCount?: number;
  absentEmployeeIds?: string[];
};

interface StoredPlannerState {
  version: 1;
  scenario: ScenarioId;
  strategy: Strategy;
  customInput: ScheduleInput | null;
  result: ResultWithRecovery | null;
  comparison: Partial<Record<Strategy, ScheduleResult>>;
  generatedAt: string | null;
}

interface PlannerContextValue extends StoredPlannerState {
  input: ScheduleInput;
  hydrated: boolean;
  isSolving: boolean;
  error: string | null;
  announcement: string;
  selectScenario: (scenario: ScenarioId) => void;
  setStrategy: (strategy: Strategy) => void;
  setEmployeeHours: (employeeId: string, hours: number) => void;
  solve: () => Promise<boolean>;
  assign: (shiftId: string, skill: string, employeeId: string) => { ok: boolean; message: string };
  reset: () => void;
}

const STORAGE_KEY = "shiftcraft-session-v1";

const DEFAULT_STATE: StoredPlannerState = {
  version: 1,
  scenario: "feasible",
  strategy: "branch-and-bound",
  customInput: null,
  result: null,
  comparison: {},
  generatedAt: null,
};

const PlannerContext = createContext<PlannerContextValue | null>(null);

async function requestSchedule(
  scenario: ScenarioId,
  strategy: Strategy,
  input: ScheduleInput,
  currentAssignments?: Assignment[],
) {
  const response = await fetch("/api/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario, strategy, input, currentAssignments }),
  });
  const payload = (await response.json()) as ScheduleResponse;
  if (!response.ok || !isScheduleSuccess(payload)) {
    throw new Error("error" in payload ? payload.error.message : "Schedule request failed.");
  }
  return { result: payload.data as ResultWithRecovery, generatedAt: payload.meta.generatedAt };
}

function isStoredPlannerState(value: unknown): value is StoredPlannerState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredPlannerState>;
  return candidate.version === 1 && ["feasible", "infeasible", "absence"].includes(candidate.scenario ?? "") && ["greedy", "branch-and-bound"].includes(candidate.strategy ?? "");
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredPlannerState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("Choose a case to begin planning.");

  useEffect(() => {
    let restored = DEFAULT_STATE;
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isStoredPlannerState(parsed)) restored = parsed;
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
    const hydrationFrame = window.requestAnimationFrame(() => {
      setState(restored);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(hydrationFrame);
  }, []);

  useEffect(() => {
    if (hydrated) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const input = useMemo(
    () => state.customInput ?? createScenarioInput(state.scenario),
    [state.customInput, state.scenario],
  );

  const selectScenario = useCallback((scenario: ScenarioId) => {
    setState((current) => ({ ...current, scenario, customInput: null, result: null, comparison: {}, generatedAt: null }));
    setError(null);
    setAnnouncement(`${scenario === "feasible" ? "Rush week" : scenario === "infeasible" ? "Keyholder gap" : "Barista calls out"} loaded.`);
  }, []);

  const setStrategy = useCallback((strategy: Strategy) => {
    setState((current) => ({ ...current, strategy }));
    setAnnouncement(`${strategy === "greedy" ? "Greedy baseline" : "Preference search"} selected.`);
  }, []);

  const setEmployeeHours = useCallback((employeeId: string, hours: number) => {
    setState((current) => {
      const currentInput = current.customInput ?? createScenarioInput(current.scenario);
      return {
        ...current,
        customInput: { ...currentInput, employees: currentInput.employees.map((employee) => employee.id === employeeId ? { ...employee, maxWeeklyHours: hours } : employee) },
        result: null,
        comparison: {},
        generatedAt: null,
      };
    });
    setError(null);
    setAnnouncement("Weekly hour limit updated. Generate a new schedule to test it.");
  }, []);

  const solve = useCallback(async () => {
    setIsSolving(true);
    setError(null);
    setAnnouncement(state.scenario === "absence" ? "Repairing schedule…" : "Generating schedule…");
    try {
      const [greedy, search] = await Promise.all([
        requestSchedule(state.scenario, "greedy", input),
        requestSchedule(state.scenario, "branch-and-bound", input),
      ]);
      const selected = state.strategy === "greedy" ? greedy.result : search.result;
      setState((current) => ({
        ...current,
        result: selected,
        comparison: { greedy: greedy.result, "branch-and-bound": search.result },
        generatedAt: state.strategy === "greedy" ? greedy.generatedAt : search.generatedAt,
      }));
      setAnnouncement(selected.status === "feasible" ? `Schedule ready with ${selected.metrics.coveragePercent}% coverage.` : selected.status === "infeasible" ? `No valid schedule. ${selected.reasons[0]?.message ?? "Review the conflicts."}` : selected.message);
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to run scheduler.";
      setError(message);
      setAnnouncement(message);
      return false;
    } finally {
      setIsSolving(false);
    }
  }, [input, state.scenario, state.strategy]);

  const assign = useCallback((shiftId: string, skill: string, employeeId: string) => {
    if (!state.result || state.result.status !== "feasible") return { ok: false, message: "Generate a feasible schedule first." };
    const currentAssignments = state.result.assignments;
    const target = currentAssignments.find((item) => item.shiftId === shiftId && item.skill === skill);
    const next = target ? currentAssignments.map((item) => item === target ? { ...item, employeeId } : item) : [...currentAssignments, { employeeId, shiftId, skill }];
    const checked = validateManualAssignments(input, next);
    if (!checked.isValid) {
      const message = checked.violations.find((item) => item.employeeId === employeeId)?.message ?? "That edit breaks a hard constraint.";
      setAnnouncement(message);
      return { ok: false, message };
    }
    const name = input.employees.find((employee) => employee.id === employeeId)?.name ?? employeeId;
    const shiftName = input.shifts.find((shift) => shift.id === shiftId)?.name ?? shiftId;
    setState((current) => current.result ? { ...current, result: { ...current.result, status: "feasible", assignments: next, metrics: checked.metrics } } : current);
    const message = `${name} assigned to ${shiftName}.`;
    setAnnouncement(message);
    return { ok: true, message };
  }, [input, state.result]);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    setError(null);
    setAnnouncement("Session reset. Rush week is ready to configure.");
  }, []);

  const value = useMemo<PlannerContextValue>(() => ({
    ...state,
    input,
    hydrated,
    isSolving,
    error,
    announcement,
    selectScenario,
    setStrategy,
    setEmployeeHours,
    solve,
    assign,
    reset,
  }), [announcement, assign, error, hydrated, input, isSolving, reset, selectScenario, setEmployeeHours, setStrategy, solve, state]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("usePlanner must be used inside PlannerProvider.");
  return value;
}
