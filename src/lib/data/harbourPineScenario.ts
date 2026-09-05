import type { ScheduleInput } from "../scheduling";

export const HARBOUR_PINE_CAFE_NAME = "Harbour & Pine Café";

/** A fixed, synthetic scenario suitable for demos, tests, and screenshots. */
export function createHarbourPineScenario(): ScheduleInput {
  const allWindows = [
    { date: "2026-09-07", start: "07:00", end: "15:00" },
    { date: "2026-09-08", start: "07:00", end: "15:00" },
  ];

  return {
    cafeName: HARBOUR_PINE_CAFE_NAME,
    weekStart: "2026-09-07",
    shifts: [
      {
        id: "mon-breakfast",
        name: "Monday breakfast",
        date: "2026-09-07",
        start: "07:00",
        end: "11:00",
        coverage: [
          { skill: "barista", count: 1 },
          { skill: "register", count: 1 },
          { skill: "keyholder", count: 1 },
        ],
      },
      {
        id: "mon-lunch",
        name: "Monday lunch",
        date: "2026-09-07",
        start: "11:00",
        end: "15:00",
        coverage: [
          { skill: "barista", count: 1 },
          { skill: "kitchen", count: 1 },
        ],
      },
      {
        id: "tue-breakfast",
        name: "Tuesday breakfast",
        date: "2026-09-08",
        start: "07:00",
        end: "11:00",
        coverage: [
          { skill: "barista", count: 1 },
          { skill: "register", count: 1 },
        ],
      },
      {
        id: "tue-lunch",
        name: "Tuesday lunch",
        date: "2026-09-08",
        start: "11:00",
        end: "15:00",
        coverage: [
          { skill: "barista", count: 1 },
          { skill: "kitchen", count: 1 },
        ],
      },
    ],
    employees: [
      {
        id: "avery",
        name: "Avery Chen",
        skills: ["barista", "register", "keyholder"],
        availability: allWindows.map((window) => ({ ...window })),
        maxWeeklyHours: 8,
        shiftPreferences: { "mon-breakfast": 10, "tue-breakfast": 8 },
      },
      {
        id: "maya",
        name: "Maya Singh",
        skills: ["barista"],
        availability: allWindows.map((window) => ({ ...window })),
        maxWeeklyHours: 12,
        shiftPreferences: {
          "mon-breakfast": 9,
          "mon-lunch": 6,
          "tue-breakfast": 7,
          "tue-lunch": 3,
        },
      },
      {
        id: "leo",
        name: "Leo Martin",
        skills: ["register"],
        availability: allWindows.map((window) => ({ ...window })),
        maxWeeklyHours: 8,
        shiftPreferences: { "mon-breakfast": 1, "tue-breakfast": 2 },
      },
      {
        id: "noor",
        name: "Noor Ahmed",
        skills: ["kitchen"],
        availability: allWindows.map((window) => ({ ...window })),
        maxWeeklyHours: 8,
        shiftPreferences: { "mon-lunch": 7, "tue-lunch": 4 },
      },
      {
        id: "eli",
        name: "Eli Brooks",
        skills: ["barista", "register"],
        availability: allWindows.map((window) => ({ ...window })),
        maxWeeklyHours: 12,
        shiftPreferences: { "mon-breakfast": 0, "tue-breakfast": 6 },
      },
      {
        id: "sam",
        name: "Sam Rivera",
        skills: ["barista", "kitchen", "keyholder"],
        availability: allWindows.map((window) => ({ ...window })),
        maxWeeklyHours: 12,
        shiftPreferences: { "mon-lunch": 2, "tue-lunch": 8 },
      },
    ],
  };
}
