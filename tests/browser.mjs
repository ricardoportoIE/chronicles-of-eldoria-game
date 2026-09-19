import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
import { createServer } from "vite";

const browserCandidates = [
  process.env.ELDORIA_BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

const executablePath = browserCandidates.find(existsSync);
if (!executablePath) {
  throw new Error("Nenhum navegador Chromium foi encontrado para o teste E2E.");
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator("#app[data-game-state='ready']").waitFor();
  await page.getByRole("button", { name: "Abrir as crônicas" }).click();
  await page.locator("#app[data-game-state='playing']").waitFor();

  const scoreBefore = Number(await page.locator("#scoreValue").textContent());
  await page.waitForTimeout(350);
  const scoreAfter = Number(await page.locator("#scoreValue").textContent());
  if (scoreAfter <= scoreBefore) throw new Error("A pontuação de sobrevivência não avançou.");

  await page.keyboard.down("Space");
  await page.waitForTimeout(80);
  if ((await page.locator("#shotValue").textContent()) !== "RECARREGANDO") {
    throw new Error("O disparo não iniciou a recarga.");
  }
  await page.keyboard.up("Space");

  await page.keyboard.press("p");
  await page.locator("#app[data-game-state='paused']").waitFor();
  await page.getByRole("button", { name: "Retomar jornada" }).click();
  await page.locator("#app[data-game-state='playing']").waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#app[data-game-state='ready'][data-layout='portrait']").waitFor();

  const canvasSize = await page.locator("#gameCanvas").evaluate((canvas) => ({
    width: canvas.width,
    height: canvas.height,
  }));
  if (canvasSize.width !== 540 || canvasSize.height !== 960) {
    throw new Error(`Arena mobile inválida: ${canvasSize.width}x${canvasSize.height}.`);
  }

  const canvasFrame = await page.locator(".canvas-frame").boundingBox();
  const renderedRatio = canvasFrame.width / canvasFrame.height;
  if (Math.abs(renderedRatio - 9 / 16) > 0.01) {
    throw new Error(`Proporção mobile inválida: ${renderedRatio}.`);
  }

  const pageMetrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
  }));
  if (pageMetrics.documentWidth > pageMetrics.viewportWidth + 1) {
    throw new Error("A interface mobile exige rolagem horizontal.");
  }
  if (pageMetrics.documentHeight > pageMetrics.viewportHeight + 1) {
    throw new Error("A interface mobile exige rolagem vertical.");
  }

  await page.getByRole("button", { name: "Abrir as crônicas" }).click();
  await page.locator("#app[data-game-state='playing']").waitFor();
  const touchDisplay = await page.locator(".touch-controls").evaluate(
    (element) => getComputedStyle(element).display,
  );
  if (touchDisplay !== "flex") throw new Error("Os controles de toque não apareceram no viewport mobile.");

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
    throw new Error("O joystick direto na arena não foi ativado.");
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
    throw new Error("A pressão longa ainda pode abrir o menu do navegador.");
  }

  const fireButton = page.getByRole("button", { name: "Disparar luz arcana" });
  await fireButton.dispatchEvent("pointerdown", { pointerId: 1 });
  await page.waitForTimeout(80);
  if ((await page.locator("#shotValue").textContent()) !== "RECARREGANDO") {
    throw new Error("O disparo por toque não iniciou a recarga.");
  }
  await fireButton.dispatchEvent("pointerup", { pointerId: 1 });

  if (browserErrors.length) {
    throw new Error(`Erros no navegador: ${browserErrors.join(" | ")}`);
  }

  console.log("E2E aprovado: desktop completo e mobile 9:16 sem rolagem, com controles de toque.");
} finally {
  await browser?.close();
  await server.close();
}
