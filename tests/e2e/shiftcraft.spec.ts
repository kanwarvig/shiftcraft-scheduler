import { expect, test } from "@playwright/test";

test("computes and compares a feasible café schedule", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /schedule that can/i })).toBeVisible();
  await page.getByTestId("solve-button").click();

  await expect(page.getByTestId("metric-strip")).toContainText("100%");
  await expect(page.getByTestId("schedule-board")).toBeVisible();
  await expect(page.getByTestId("algorithm-comparison")).toContainText("Greedy baseline");
  await expect(page.getByTestId("algorithm-comparison")).toContainText("Preference search");

  await page.getByTestId("schedule-board").getByRole("button").first().click();
  await expect(page.getByTestId("assignment-drawer")).toContainText("LIVE VALIDATION");
  await page.getByTestId("role-option-barista").click();

  const drawer = page.getByTestId("assignment-drawer");
  const eligible = drawer.getByRole("button").filter({ hasText: "Eligible" }).first();
  await eligible.click();
  await expect(page.locator("[aria-live='polite']")).toContainText("assigned to");

  const blocked = drawer.locator("button[aria-disabled='true']:not([disabled])").first();
  await blocked.click({ force: true });
  await expect(page.locator("[aria-live='polite']")).toContainText(/does not have|not available|maximum|overlapping|more than once/i);
});

test("sends an edited hard constraint through the typed API boundary", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Maximum weekly hours").fill("6");
  const sent = page.waitForRequest((request) => request.url().endsWith("/api/schedule") && request.method() === "POST");
  await page.getByTestId("solve-button").click();
  const request = await sent;
  const body = request.postDataJSON();
  expect(body.input.employees.find((employee: { id: string }) => employee.id === "avery").maxWeeklyHours).toBe(6);
});

test("explains an infeasible keyholder requirement", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("scenario-infeasible").click();
  await page.getByTestId("solve-button").click();

  await expect(page.getByTestId("infeasible-result")).toContainText("NO VALID SCHEDULE");
  await expect(page.getByTestId("infeasible-result")).toContainText(/keyholder/i);
  await expect(page.getByTestId("infeasible-result")).toContainText("MANAGER DECISION");
});

test("repairs an absence while reporting schedule disruption", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("scenario-absence").click();
  await page.getByTestId("solve-button").click();

  await expect(page.getByTestId("recovery-summary")).toContainText("removed");
  await expect(page.getByTestId("recovery-summary")).toContainText("unchanged");
  await expect(page.getByTestId("metric-strip")).toContainText("100%");
});
