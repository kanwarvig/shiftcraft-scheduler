import { expect, test } from "@playwright/test";

test("guides a newcomer from overview to a computed schedule", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /build the week/i })).toBeVisible();
  await page.getByTestId("start-planning").click();
  await expect(page).toHaveURL(/\/planner\?case=feasible/);
  await expect(page.getByRole("heading", { name: /set the rules/i })).toBeVisible();

  await page.getByTestId("solve-button").click();
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByTestId("metric-strip")).toContainText("100%");
  await expect(page.getByTestId("schedule-board")).toBeVisible();
  await expect(page.getByTestId("algorithm-comparison")).toContainText("Greedy baseline");
  await expect(page.getByTestId("algorithm-comparison")).toContainText("Preference search");
});

test("supports direct routes, refresh, and browser back", async ({ page }) => {
  await page.goto("/scenarios");
  await expect(page.getByRole("heading", { name: /learn the model/i })).toBeVisible();
  await page.getByRole("link", { name: "Open case" }).first().click();
  await expect(page).toHaveURL(/\/planner\?case=feasible/);
  await page.reload();
  await expect(page.getByTestId("scenario-feasible")).toHaveAttribute("aria-checked", "true");
  await page.goBack();
  await expect(page).toHaveURL(/\/scenarios$/);

  await page.goto("/evidence");
  await expect(page.getByRole("heading", { name: /what the demo proves/i })).toBeVisible();
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: /no computed schedule yet/i })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNav.getByRole("link", { name: /evidence/i })).toBeVisible();
  const mainBox = await page.locator("main").boundingBox();
  const navBox = await mobileNav.boundingBox();
  expect(mainBox && navBox && mainBox.y + mainBox.height <= navBox.y + 1).toBeTruthy();
  await mobileNav.getByRole("link", { name: /evidence/i }).click();
  await expect(page).toHaveURL(/\/evidence$/);
});

test("sends an edited hard constraint through the typed API boundary", async ({ page }) => {
  await page.goto("/planner?case=feasible");
  await page.getByLabel("Maximum weekly hours").fill("6");
  const sent = page.waitForRequest((request) => request.url().endsWith("/api/schedule") && request.method() === "POST" && request.postDataJSON().strategy === "greedy");
  await page.getByTestId("solve-button").click();
  const request = await sent;
  const body = request.postDataJSON();
  expect(body.input.employees.find((employee: { id: string }) => employee.id === "avery").maxWeeklyHours).toBe(6);
  await expect(page).toHaveURL(/\/schedule$/);
});

test("shows role-specific eligibility and validates manual edits", async ({ page }) => {
  await page.goto("/planner?case=feasible");
  await page.getByTestId("solve-button").click();
  await expect(page).toHaveURL(/\/schedule$/);
  await page.getByTestId("schedule-board").getByRole("button").first().click();
  const inspector = page.getByTestId("assignment-drawer");
  await expect(inspector).toContainText("SHIFT INSPECTOR");
  await page.getByTestId("role-option-barista").click();

  const eligible = inspector.getByRole("button").filter({ hasText: "Eligible" }).first();
  await eligible.click();
  await expect(page.locator("[aria-live='polite']").first()).toContainText("assigned to");

  const blocked = inspector.locator("button[aria-disabled='true']:not([disabled])").first();
  await blocked.click({ force: true });
  await expect(page.locator("[aria-live='polite']").first()).toContainText(/does not have|not available|maximum|overlapping|more than once/i);
});

test("explains an infeasible keyholder requirement without relaxing rules", async ({ page }) => {
  await page.goto("/planner?case=infeasible");
  await expect(page.getByTestId("scenario-infeasible")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("solve-button").click();
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByTestId("infeasible-result")).toContainText("NO VALID SCHEDULE");
  await expect(page.getByTestId("infeasible-result")).toContainText(/keyholder/i);
  await expect(page.getByTestId("infeasible-result")).toContainText("MANAGER-OWNED REPAIR");
});

test("repairs an absence and preserves the result across a same-tab refresh", async ({ page }) => {
  await page.goto("/planner?case=absence");
  await expect(page.getByTestId("scenario-absence")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("solve-button").click();
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByTestId("recovery-summary")).toContainText("removed");
  await expect(page.getByTestId("recovery-summary")).toContainText("Unchanged");
  await expect(page.getByTestId("metric-strip")).toContainText("100%");
  await page.reload();
  await expect(page.getByTestId("recovery-summary")).toBeVisible();
});
