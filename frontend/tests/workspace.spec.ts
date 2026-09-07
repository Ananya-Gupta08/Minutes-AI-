import { test, expect } from "@playwright/test";

test("library, search, synchronized player, chapters and export", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/meetings");
  await expect(
    page.getByRole("heading", { name: "A clearer day starts here." }),
  ).toBeVisible();
  await expect(page.locator(".meeting-row")).toHaveCount(5);
  await page.screenshot({
    path: `../docs/screenshots/library-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: "Search meetings", exact: true })
    .fill("anonymized");
  await page.getByRole("button", { name: "Search library" }).click();
  await expect(page.locator(".meeting-row")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".meeting-row")).toHaveCount(1);
  await page.getByRole("link", { name: "Q3 Product Roadmap Planning" }).click();
  await expect(
    page.getByRole("heading", { name: "Q3 Product Roadmap Planning" }),
  ).toBeVisible();
  const segments = page.getByTestId("transcript-segment");
  await expect(segments).toHaveCount(20);
  await expect(segments.first()).toHaveAttribute("aria-current", "true");
  await page.getByRole("button", { name: "Play meeting", exact: true }).click();
  await expect(page.getByTestId("current-time")).not.toHaveText("00:00");
  await page.getByRole("button", { name: "Pause playback" }).click();
  await segments.nth(2).click();
  await expect(page.getByTestId("current-time")).toHaveText("04:30");
  await expect(segments.nth(2)).toHaveAttribute("aria-current", "true");
  const seek = page.getByRole("slider", { name: "Seek meeting playback" });
  await seek.fill("540");
  await expect(segments.nth(4)).toHaveAttribute("aria-current", "true");
  await page.getByRole("textbox", { name: "Search transcript" }).fill("will");
  await expect(page.locator(".match-navigation")).toContainText(
    "4 matching segments",
  );
  await page.getByRole("button", { name: "Next search match" }).click();
  await expect(page.locator(".selected-match mark")).toContainText("will");
  await expect(page.getByTestId("current-time")).toHaveText("09:00");
  await page.getByRole("button", { name: "Previous search match" }).click();
  await expect(page.getByTestId("current-time")).toHaveText("40:30");
  await page.getByRole("button", { name: "Clear transcript search" }).click();
  await expect(page.locator("mark")).toHaveCount(0);
  await page.getByRole("tab", { name: "Topics", exact: true }).click();
  await page.locator(".chapter").nth(1).click();
  await expect(page.getByTestId("current-time")).toHaveText("11:15");
  await expect(segments.nth(5)).toHaveAttribute("aria-current", "true");
  await seek.fill("2699.5");
  await page.getByRole("button", { name: "Play meeting", exact: true }).click();
  await expect(page.getByTestId("current-time")).toHaveText("45:00");
  await expect(
    page.getByRole("button", { name: "Play meeting", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Summary", exact: true }).click();
  await seek.fill("0");
  await page.locator(".transcript-scroll").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page
    .getByRole("heading", { name: "Q3 Product Roadmap Planning" })
    .click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `../docs/screenshots/detail-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.locator("summary").filter({ hasText: "Export" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Meeting notes (.md)" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
});

test("create, edit, action item CRUD, refresh and confirmed deletion", async ({
  page,
}, testInfo) => {
  const title = `Evaluator ${testInfo.project.name} ${Date.now()}`;
  await page.goto("/meetings/new");
  await page.getByLabel("Meeting title").fill(title);
  await page.getByLabel("Duration (minutes)").fill("1");
  await page
    .getByLabel("Participants", { exact: true })
    .fill("Ananya Gupta, Alex Morgan");
  await page.getByLabel("Topics", { exact: true }).fill("Evaluation");
  await page
    .getByRole("textbox", { name: "Transcript", exact: true })
    .fill(
      "Ananya Gupta: We agreed to ship the prototype.\nAlex Morgan: I will send the final checklist.",
    );
  await page
    .getByRole("button", { name: "Create meeting", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Meeting title").fill(`${title} updated`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: `${title} updated`, exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Action items/ }).click();
  await page
    .getByRole("button", { name: "Add action item", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Action item text" })
    .fill("Verify deployment checklist");
  await page.getByLabel("Assignee", { exact: true }).fill("Ananya Gupta");
  await page.getByLabel("Due date", { exact: true }).fill("2026-09-20");
  await page.getByRole("button", { name: "Save action item" }).click();
  const completion = page.getByRole("checkbox", {
    name: "Complete: Verify deployment checklist",
    exact: true,
  });
  await page.route("**/api/action-items/*", (route) => route.abort("failed"));
  await completion.click();
  await expect(completion).toBeEnabled();
  await expect(completion).not.toBeChecked();
  await page.unroute("**/api/action-items/*");
  await page
    .getByRole("checkbox", {
      name: "Complete: Verify deployment checklist",
      exact: true,
    })
    .check();
  await expect(
    page.getByRole("checkbox", {
      name: "Complete: Verify deployment checklist",
      exact: true,
    }),
  ).toBeChecked();
  await expect(completion).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: `${title} updated`, exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Action items/ }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "Complete: Verify deployment checklist",
      exact: true,
    }),
  ).toBeChecked();
  await page
    .getByRole("button", {
      name: "Edit action: Verify deployment checklist",
      exact: true,
    })
    .click();
  await page
    .getByRole("textbox", { name: "Action item text" })
    .fill("Verify release checklist");
  await page.getByRole("button", { name: "Save action item" }).click();
  await page
    .getByRole("button", {
      name: "Delete action: Verify release checklist",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(
    page.getByText("Verify release checklist", { exact: true }),
  ).toHaveCount(0);
  await page.locator('summary[aria-label="More meeting actions"]').click();
  await page
    .getByRole("button", { name: "Delete meeting", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `${title} updated`, exact: true }),
  ).toBeVisible();
  await page.locator('summary[aria-label="More meeting actions"]').click();
  await page
    .getByRole("button", { name: "Delete meeting", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(page).toHaveURL(/\/meetings$/);
  await expect(page.locator(".meeting-row")).toHaveCount(5);
});

test("upload validation, missing meeting and navigation", async ({
  page,
}, testInfo) => {
  await page.goto("/meetings/new");
  await page.getByRole("button", { name: "Upload a file" }).click();
  await page
    .getByLabel("Upload transcript file")
    .setInputFiles({
      name: "wrong.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("hello"),
    });
  await expect(page.locator(".form-error")).toContainText(
    "Choose a .txt, .vtt, or .json",
  );
  await page
    .getByLabel("Upload transcript file")
    .setInputFiles({
      name: "meeting.vtt",
      mimeType: "text/vtt",
      buffer: Buffer.from(
        "WEBVTT\n\n00:00:00.000 --> 00:00:10.000\n<v Ananya>Hello team.",
      ),
    });
  await expect(
    page.getByRole("textbox", { name: "Transcript", exact: true }),
  ).toContainText("Hello team.");
  await expect(page.getByLabel("Transcript format")).toHaveValue("vtt");
  await page.goto("/meetings/999999");
  await expect(
    page.getByRole("heading", { name: "Meeting not found" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to meetings" }).click();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: /^Integrations/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your favorite tools. One connected flow.",
    }),
  ).toBeVisible();
});
