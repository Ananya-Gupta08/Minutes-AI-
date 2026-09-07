import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const apiUrl = process.env.E2E_API_URL || "http://127.0.0.1:8000/api";

async function temporaryMeeting(
  page: Page,
  raw: string,
  format = "txt",
  duration = 30,
) {
  const response = await page.request.post(`${apiUrl}/meetings`, {
    data: {
      title: `Audit ${Date.now()}`,
      meeting_date: "2026-09-07T09:00:00Z",
      duration_seconds: duration,
      participants: [],
      tags: ["Audit"],
      raw_transcript: raw,
      transcript_format: format,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as { id: number; title: string };
}

test("library repeated search, combined filters, sorting, invalid and empty results", async ({
  page,
}) => {
  await page.goto("/meetings");
  await expect(page.locator(".meeting-row")).toHaveCount(5);
  await page.getByRole("button", { name: "Search library" }).click();
  await expect(page.locator(".meeting-list")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.getByLabel("Search meetings", { exact: true }).fill("roadmap");
  await page.getByRole("button", { name: "Search library" }).click();
  await expect(page.locator(".meeting-list")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.getByRole("button", { name: "Search library" }).click();
  await expect(page.locator(".meeting-list")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.getByLabel("Filter by participant").selectOption("Maya Patel");
  await expect(page.locator(".meeting-row")).toHaveCount(2);
  await page.getByLabel("Filter by topic").selectOption("Design");
  await expect(page.locator(".meeting-row")).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel("Filter by participant")).toHaveValue(
    "Maya Patel",
  );
  await expect(page.locator(".meeting-title")).toHaveText(
    "Design System Handoff",
  );
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.getByLabel("Sort meetings").selectOption("title");
  await expect(page.locator(".meeting-title").first()).toHaveText(
    "Customer Onboarding Review",
  );
  await page.getByLabel("Sort meetings").selectOption("oldest");
  await expect(page.locator(".meeting-title").first()).toHaveText(
    "Design System Handoff",
  );
  await page.goto("/meetings?search=zero-match-999");
  await expect(
    page.getByRole("heading", { name: "No meetings match your search" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .last()
    .click();
  await expect(page.locator(".meeting-row")).toHaveCount(5);
  await page.goto("/meetings?offset=100");
  await expect(page.locator(".meeting-row")).toHaveCount(5);
  await expect(page).not.toHaveURL(/offset=/);
  await page.goto("/meetings?date_from=2026-10-01&date_to=2026-01-01");
  await expect(
    page.getByRole("button", { name: "Reset search and filters" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset search and filters" }).click();
  await expect(page.locator(".meeting-row")).toHaveCount(5);
});

test("loading, unavailable API, retry, and genuine empty library", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/meetings", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/meetings");
  await expect(
    page.getByRole("status", { name: "Loading meetings" }),
  ).toBeVisible();
  release();
  await expect(page.locator(".meeting-row")).toHaveCount(5);
  await page.unroute("**/api/meetings");
  await page.route("**/api/meetings", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Audit service unavailable" }),
    }),
  );
  await page.reload();
  await expect(page.getByText("Audit service unavailable")).toBeVisible();
  await page.unroute("**/api/meetings");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".meeting-row")).toHaveCount(5);
  await page.route("**/api/meetings", (route) =>
    route.fulfill({
      json: {
        meetings: [],
        total: 0,
        participants: [],
        topics: [],
        stats: {
          total_meetings: 0,
          total_hours: 0,
          open_action_items: 0,
          meetings_this_week: 0,
        },
      },
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Your next great idea starts with a conversation",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add a meeting", exact: true }),
  ).toBeVisible();
});

test("active transcript actually scrolls into view without moving the page", async ({
  page,
}) => {
  await page.goto("/meetings/1");
  const slider = page.getByRole("slider", { name: "Seek meeting playback" });
  await slider.fill("2025");
  await page.getByRole("button", { name: "Play meeting", exact: true }).click();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await expect
    .poll(async () =>
      page.locator(".active-segment").evaluate((el) => {
        const row = el.getBoundingClientRect();
        const box = el.closest(".transcript-scroll")!.getBoundingClientRect();
        return row.top >= box.top && row.bottom <= box.bottom;
      }),
    )
    .toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  await page.getByRole("button", { name: "Pause playback" }).click();
  await page.getByLabel("Search transcript").fill("will");
  await page.getByRole("button", { name: "Next search match" }).click();
  await expect
    .poll(async () =>
      page.locator(".selected-match").evaluate((el) => {
        const row = el.getBoundingClientRect(),
          box = el.closest(".transcript-scroll")!.getBoundingClientRect();
        return row.top >= box.top && row.bottom <= box.bottom;
      }),
    )
    .toBe(true);
});

test("safe literal highlights, gaps, speed, pause, and shorter edited duration", async ({
  page,
}) => {
  const raw = JSON.stringify([
    {
      speaker_name: "Ananya",
      start_seconds: 0,
      end_seconds: 5,
      text: "Review <img src=x onerror=alert(1)> and <img examples.",
    },
    {
      speaker_name: "Alex",
      start_seconds: 10,
      end_seconds: 15,
      text: "A second segment.",
    },
  ]);
  const meeting = await temporaryMeeting(page, raw, "json");
  try {
    await page.goto(`/meetings/${meeting.id}`);
    await expect(page.locator(".transcript-segment")).toHaveCount(2);
    await page.getByLabel("Search transcript").fill("<img");
    await expect(page.locator(".transcript-segment mark")).toHaveCount(2);
    await expect(page.locator(".transcript-segment img")).toHaveCount(0);
    await page.getByLabel("Filter transcript speaker").selectOption("Alex");
    await expect(page.locator(".transcript-segment")).toHaveCount(1);
    await expect(page.locator(".match-navigation")).toContainText(
      "0 matching segments",
    );
    await page.getByLabel("Filter transcript speaker").selectOption("");
    await page.getByRole("button", { name: "Clear transcript search" }).click();
    const frozen = new Date();
    await page.clock.install({ time: frozen });
    await page.clock.pauseAt(new Date(frozen.getTime() + 1000));
    await page.getByLabel("Playback speed").selectOption("2");
    await page
      .getByRole("button", { name: "Play meeting", exact: true })
      .click();
    await page.clock.runFor(1100);
    await expect(page.getByTestId("current-time")).toHaveText("00:02");
    await page.getByRole("button", { name: "Pause playback" }).click();
    await page.clock.runFor(2000);
    await expect(page.getByTestId("current-time")).toHaveText("00:02");
    await page.getByRole("slider", { name: "Seek meeting playback" }).fill("7");
    await expect(page.locator(".active-segment")).toHaveCount(0);
    await page
      .getByRole("slider", { name: "Seek meeting playback" })
      .fill("12");
    await expect(page.locator(".active-segment")).toHaveAttribute(
      "data-start",
      "10",
    );
    await page
      .getByRole("slider", { name: "Seek meeting playback" })
      .fill("25");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Duration (minutes)").fill("0.25");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByTestId("current-time")).toHaveText("00:15");
    await expect(
      page.getByRole("slider", { name: "Seek meeting playback" }),
    ).toHaveValue("15");
  } finally {
    await page.request.delete(`${apiUrl}/meetings/${meeting.id}`);
  }
});

test("TXT, VTT, JSON uploads create persisted meetings; invalid files are rejected", async ({
  page,
}) => {
  for (const [extension, raw] of [
    ["txt", "Ananya: We agreed to ship.\nAlex: I will send notes."],
    [
      "vtt",
      "WEBVTT\n\n00:00:00.000 --> 00:00:15.000\n<v Ananya>We agreed to ship.",
    ],
    [
      "json",
      JSON.stringify([
        {
          speaker_name: "Ananya",
          start_seconds: 0,
          end_seconds: 15,
          text: "We agreed to ship.",
        },
      ]),
    ],
  ]) {
    let id: string | undefined;
    try {
      await page.goto("/meetings/new");
      await page.getByLabel("Meeting title").fill(`Audit upload ${extension}`);
      await page.getByLabel("Duration (minutes)").fill("1");
      await page.getByRole("button", { name: "Upload a file" }).click();
      await page
        .getByLabel("Upload transcript file")
        .setInputFiles({
          name: `audit.${extension}`,
          mimeType: "text/plain",
          buffer: Buffer.from(raw),
        });
      await page
        .getByRole("button", { name: "Create meeting", exact: true })
        .click();
      await expect(page).toHaveURL(/\/meetings\/\d+$/);
      id = page.url().split("/").pop();
      await expect(page.locator(".segment-text").first()).toContainText(
        "We agreed to ship.",
      );
      await page.reload();
      await expect(
        page.getByRole("heading", { name: `Audit upload ${extension}` }),
      ).toBeVisible();
    } finally {
      if (id) await page.request.delete(`${apiUrl}/meetings/${id}`);
    }
  }
  await page.goto("/meetings/new");
  await page.getByRole("button", { name: "Upload a file" }).click();
  await page
    .getByLabel("Upload transcript file")
    .setInputFiles({
      name: "empty.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(""),
    });
  await expect(page.locator(".form-error")).toContainText("empty");
  await page
    .getByLabel("Upload transcript file")
    .setInputFiles({
      name: "large.txt",
      mimeType: "text/plain",
      buffer: Buffer.alloc(1000001, 65),
    });
  await expect(page.locator(".form-error")).toContainText("1 MB");
  await page
    .getByLabel("Upload transcript file")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{broken"),
    });
  await page.getByLabel("Meeting title").fill("Invalid upload");
  await page
    .getByRole("button", { name: "Create meeting", exact: true })
    .click();
  await expect(page.locator(".form-error")).toContainText("Invalid transcript");
});

test("keyboard dialogs and responsive layouts at narrow and tablet widths", async ({
  page,
}, info) => {
  await page.goto("/meetings/1");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeFocused();
  await page.getByRole("tab", { name: "Summary", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Action items/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    const box = await page.getByRole("dialog").boundingBox();
    expect(box?.x).toBe(0);
    await page.keyboard.press("Escape");
  }
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  }
});

test("accessibility and console audit of primary routes", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", request => errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  page.on("response", response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
  const violations: {
    route: string;
    id: string;
    targets: unknown;
    detail: unknown;
  }[] = [];
  for (const route of [
    "/meetings",
    "/meetings/1",
    "/meetings/new",
    "/settings",
  ]) {
    await page.goto(route);
    if (route === "/meetings")
      await expect(page.locator(".meeting-row")).toHaveCount(5);
    if (route === "/meetings/1")
      await expect(page.locator(".transcript-segment")).toHaveCount(20);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    violations.push(
      ...result.violations.map((v) => ({
        route,
        id: v.id,
        targets: v.nodes.map((n) => n.target),
        detail: v.nodes.map((n) => n.failureSummary),
      })),
    );
    await page.screenshot({
      path: `../docs/screenshots/audit-${info.project.name}-${route.replaceAll("/", "-")}.png`,
      fullPage: true,
    });
  }
  expect(violations).toEqual([]);
  expect(errors).toEqual([]);
});
