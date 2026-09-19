import { existsSync } from "node:fs";
import axe from "axe-core";
import { chromium } from "playwright-core";
import { createServer } from "vite";

async function assertAccessible(page, label) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const result = await globalThis.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    });
    return result.violations.map(({ id, impact, help, nodes }) => ({
      id,
      impact,
      help,
      targets: nodes.map((node) => node.target.join(" ")),
    }));
  });

  if (violations.length) {
    throw new Error(`Accessibility (${label}): ${JSON.stringify(violations)}`);
  }
}

const browserCandidates = [
  process.env.ELDORIA_BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const executablePath = browserCandidates.find(existsSync);
if (!executablePath) {
  throw new Error("No Chromium browser was found for the end-to-end test.");
}

const server = await createServer({
  logLevel: "error",
  server: { host: "127.0.0.1", port: 0 },
});

let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  const url = `http://127.0.0.1:${address.port}/`;
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    bypassCSP: true,
  });
  const page = await context.newPage();
  const browserErrors = [];
  const unexpectedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== new URL(url).origin && requestUrl.protocol !== "data:") {
      unexpectedRequests.push(request.url());
    }
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator("#app[data-game-state='ready']").waitFor();
  await assertAccessible(page, "desktop ready");
  await page.getByRole("button", { name: "Open the chronicles" }).click();
  await page.locator("#app[data-game-state='playing']").waitFor();

  const scoreBefore = Number(await page.locator("#scoreValue").textContent());
  await page.waitForTimeout(350);
  const scoreAfter = Number(await page.locator("#scoreValue").textContent());
  if (scoreAfter <= scoreBefore) throw new Error("The survival score did not increase.");

  await page.keyboard.down("Space");
  await page.waitForTimeout(80);
  if ((await page.locator("#shotValue").textContent()) !== "RECHARGING") {
    throw new Error("The shot did not start its cooldown.");
  }
  await page.keyboard.up("Space");

  await page.keyboard.press("p");
  await page.locator("#app[data-game-state='paused']").waitFor();
  if ((await page.locator(":focus").getAttribute("id")) !== "resumeButton") {
    throw new Error("Pausing did not move focus to the resume button.");
  }
  await assertAccessible(page, "desktop paused");
  await page.getByRole("button", { name: "Resume journey" }).click();
  await page.locator("#app[data-game-state='playing']").waitFor();
  if ((await page.locator(":focus").getAttribute("id")) !== "gameCanvas") {
    throw new Error("Resuming the game did not return focus to the arena.");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#app[data-game-state='ready'][data-layout='portrait']").waitFor();
  await assertAccessible(page, "mobile ready");

  const canvasSize = await page.locator("#gameCanvas").evaluate((canvas) => ({
    width: canvas.width,
    height: canvas.height,
  }));
  if (canvasSize.width !== 540 || canvasSize.height !== 960) {
    throw new Error(`Invalid mobile arena: ${canvasSize.width}x${canvasSize.height}.`);
  }

  const canvasFrame = await page.locator(".canvas-frame").boundingBox();
  const renderedRatio = canvasFrame.width / canvasFrame.height;
  if (Math.abs(renderedRatio - 9 / 16) > 0.01) {
    throw new Error(`Invalid mobile aspect ratio: ${renderedRatio}.`);
  }

  const pageMetrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
  }));
  if (pageMetrics.documentWidth > pageMetrics.viewportWidth + 1) {
    throw new Error("The mobile interface requires horizontal scrolling.");
  }
  if (pageMetrics.documentHeight > pageMetrics.viewportHeight + 1) {
    throw new Error("The mobile interface requires vertical scrolling.");
  }

  await page.getByRole("button", { name: "Open the chronicles" }).click();
  await page.locator("#app[data-game-state='playing']").waitFor();
  const touchDisplay = await page.locator(".touch-controls").evaluate(
    (element) => getComputedStyle(element).display,
  );
  if (touchDisplay !== "flex") throw new Error("Touch controls were not displayed in the mobile viewport.");

  const canvas = page.locator("#gameCanvas");
  const canvasBox = await canvas.boundingBox();
  const touchOrigin = {
    x: canvasBox.x + canvasBox.width / 2,
    y: canvasBox.y + canvasBox.height / 2,
  };
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 11,
    pointerType: "touch",
    isPrimary: true,
    clientX: touchOrigin.x,
    clientY: touchOrigin.y,
  });
  await canvas.dispatchEvent("pointermove", {
    pointerId: 11,
    pointerType: "touch",
    isPrimary: true,
    clientX: touchOrigin.x + 60,
    clientY: touchOrigin.y - 35,
  });
  if (!(await page.locator("#touchStick").evaluate((element) => element.classList.contains("is-active")))) {
    throw new Error("The direct arena joystick was not activated.");
  }
  await canvas.dispatchEvent("pointerup", {
    pointerId: 11,
    pointerType: "touch",
    isPrimary: true,
    clientX: touchOrigin.x + 60,
    clientY: touchOrigin.y - 35,
  });

  const contextMenuPrevented = await canvas.evaluate(
    (element) =>
      !element.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
      ),
  );
  if (!contextMenuPrevented) {
    throw new Error("A long press can still open the browser context menu.");
  }

  const fireButton = page.getByRole("button", { name: "Fire arcane light" });
  await fireButton.dispatchEvent("pointerdown", { pointerId: 1 });
  await page.waitForTimeout(80);
  if ((await page.locator("#shotValue").textContent()) !== "RECHARGING") {
    throw new Error("The touch shot did not start its cooldown.");
  }
  await fireButton.dispatchEvent("pointerup", { pointerId: 1 });

  const upButton = page.getByRole("button", { name: "Move up" });
  await upButton.dispatchEvent("pointerdown", { pointerId: 5 });
  if (!(await upButton.evaluate((button) => button.classList.contains("is-active")))) {
    throw new Error("The touch directional pad did not reflect its pressed state.");
  }
  await upButton.dispatchEvent("pointercancel", { pointerId: 5 });
  if (await upButton.evaluate((button) => button.classList.contains("is-active"))) {
    throw new Error("The touch directional pad remained active after cancellation.");
  }

  await page.keyboard.press("Escape");
  await page.locator("#app[data-game-state='paused']").waitFor();
  await assertAccessible(page, "mobile paused");

  if (browserErrors.length) {
    throw new Error(`Browser errors: ${browserErrors.join(" | ")}`);
  }
  if (unexpectedRequests.length) {
    throw new Error(`Unexpected external requests: ${unexpectedRequests.join(" | ")}`);
  }

  console.log("E2E passed: desktop/mobile, keyboard, touch and WCAG A/AA without violations.");
} finally {
  await browser?.close();
  await server.close();
}
