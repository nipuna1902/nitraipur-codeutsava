import { test, expect } from "@playwright/test";
test("interactive topology, faults, pause, and snapshot publishing", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/telemetry/readings", async route => {
    const payload = route.request().postDataJSON();
    expect(payload.readings).toHaveLength(3);
    expect(payload.readings.every((r: { source: string }) => r.source === "SIMULATOR")).toBeTruthy();
    await route.fulfill({ json: { accepted: 3 } });
  });
  await page.goto("/simulator");
  await expect(page.getByRole("heading", { name: "Grid simulator" })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Select North residential", exact: true }).click();
  await expect(page.getByRole("heading", { name: "North residential", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Inject fault on F01", exact: true }).click();
  await expect(page.getByText("critical / Fault detected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear all injections" }).click();
  await expect(page.getByText("normal operation", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("PAUSED", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Publish snapshot to backend" }).click();
  await expect(page.getByRole("status")).toContainText("3 simulated readings saved");
  await page.screenshot({ path: "test-results/simulator-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Node Telemetry" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: "test-results/simulator-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("backend empty, stale and failure states do not substitute demo telemetry", async ({ page }) => {
  await page.route("**/api/telemetry/readings?*", route => route.fulfill({ json: [] }));
  await page.goto("/simulator");
  await page.getByLabel("Telemetry source").selectOption("live");
  await expect(page.getByText("NO READINGS YET", { exact: true })).toBeVisible();
  await expect(page.getByText("No recent telemetry", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Inject fault on F01", exact: true })).toHaveCount(0);
  await page.route("**/api/telemetry/readings?*", route => route.fulfill({ status: 503, json: {} }));
  await expect(page.getByText("BACKEND UNAVAILABLE - RETRYING", { exact: true })).toBeVisible({ timeout: 12000 });
});
test("real backend snapshot round trip", async ({ page }) => {
  test.skip(!process.env.TEST_REAL_BACKEND, "Set TEST_REAL_BACKEND=1 with an isolated backend and BACKEND_URL configured.");
  await page.goto("/simulator");
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Inject fault on F01", exact: true }).click();
  await page.getByRole("button", { name: "Publish snapshot to backend" }).click();
  await expect(page.getByRole("status")).toContainText("3 simulated readings saved");
  await page.getByLabel("Telemetry source").selectOption("live");
  await expect(page.getByText("CONNECTED", { exact: true })).toBeVisible();
  await expect(page.getByText("critical / Fault detected", { exact: true })).toBeVisible();
});

test("known injection comparison renders backend conclusion", async ({ page }) => {
  await page.route("**/simulation/compare", async route => {
    await route.fulfill({
      json: {
        run_id: "SIM-TEST",
        status: "COMPLETED",
        model_version: "deterministic_injection_comparator_v1",
        model_output: {
          predicted_cause: "THEFT_TAMPERING",
          risk_score: 91,
          confidence: 0.84,
          adjusted_priority: "CRITICAL",
          evidence: ["power dropped sharply", "communication stayed connected"],
          guardrail_notes: ["verify in field before attribution"]
        },
        comparison: {
          expected_cause: "THEFT_TAMPERING",
          predicted_cause: "THEFT_TAMPERING",
          matches_ground_truth: true,
          changed_fields_reviewed: ["power", "energy"],
          severity: 0.75,
          duration_ticks: 24
        },
        conclusion: "Simulated detection matches the injected ground truth: THEFT TAMPERING.",
        recommended_next_step: "Use this as a judge-safe simulated comparison."
      }
    });
  });

  await page.goto("/dual-injection");
  await expect(page.getByText("Injected Ground Truth", { exact: true })).toBeVisible();
  await expect(page.getByText("Actual Backend Model Output", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Run Detection/ }).click();
  await expect(page.getByText("SIM-TEST")).toBeVisible();
  await expect(page.getByText("Simulated detection matches the injected ground truth").first()).toBeVisible();
  await expect(page.getByText("Matched")).toBeVisible();
});
