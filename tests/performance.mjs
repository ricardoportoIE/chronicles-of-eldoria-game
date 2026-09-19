import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
import { preview } from "vite";

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
if (!executablePath) throw new Error("No Chromium browser was found.");

const budgets = {
  loadMs: 2500,
  averageFrameMs: 24,
  p95FrameMs: 34,
  longTasks: 2,
  transferBytes: 4_500_000,
  heapBytes: 128 * 1024 * 1024,
};

function percentile(values, fraction) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * fraction))];
}

async function measure(page, url, label) {
  const startedAt = performance.now();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator("#app[data-game-state='ready']").waitFor();
  const loadMs = performance.now() - startedAt;
  await page.getByRole("button", { name: "Open the chronicles" }).click();
  await page.locator("#app[data-game-state='playing']").waitFor();

  const result = await page.evaluate(async () => {
    const longTasks = [];
    const observer = new PerformanceObserver((list) => {
      longTasks.push(...list.getEntries().map((entry) => entry.duration));
    });
    try { observer.observe({ type: "longtask" }); } catch {}

    const frames = await new Promise((resolve) => {
      const deltas = [];
      let previous;
      function sample(timestamp) {
        if (previous !== undefined) deltas.push(timestamp - previous);
        previous = timestamp;
        if (deltas.length >= 120) resolve(deltas);
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    observer.disconnect();
    const resources = performance.getEntriesByType("resource");
    return {
      frames,
      longTasks,
      transferBytes: resources.reduce((total, entry) => total + entry.transferSize, 0),
      heapBytes: performance.memory?.usedJSHeapSize ?? 0,
    };
  });

  const averageFrameMs = result.frames.reduce((sum, value) => sum + value, 0) / result.frames.length;
  const p95FrameMs = percentile(result.frames, 0.95);
  const metrics = {
    label,
    loadMs: Math.round(loadMs),
    averageFrameMs: Number(averageFrameMs.toFixed(2)),
    p95FrameMs: Number(p95FrameMs.toFixed(2)),
    fps: Number((1000 / averageFrameMs).toFixed(1)),
    longTasks: result.longTasks.length,
    transferBytes: result.transferBytes,
    heapBytes: result.heapBytes,
  };

  const failures = [
    [metrics.loadMs > budgets.loadMs, `load time ${metrics.loadMs}ms`],
    [metrics.averageFrameMs > budgets.averageFrameMs, `average frame ${metrics.averageFrameMs}ms`],
    [metrics.p95FrameMs > budgets.p95FrameMs, `p95 ${metrics.p95FrameMs}ms`],
    [metrics.longTasks > budgets.longTasks, `${metrics.longTasks} long tasks`],
    [metrics.transferBytes > budgets.transferBytes, `${metrics.transferBytes} transferred bytes`],
    [metrics.heapBytes > budgets.heapBytes, `${metrics.heapBytes} heap bytes`],
  ].filter(([failed]) => failed).map(([, message]) => message);
  if (failures.length) throw new Error(`${label} exceeded its budget: ${failures.join(", ")}`);
  return metrics;
}

const server = await preview({
  logLevel: "error",
  preview: { host: "127.0.0.1", port: 0 },
});
let browser;
try {
  const address = server.httpServer.address();
  const url = `http://127.0.0.1:${address.port}/`;
  browser = await chromium.launch({ executablePath, headless: true });
  const profiles = [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile 9:16", { width: 390, height: 844 }],
  ];
  const results = [];
  for (const [label, viewport] of profiles) {
    const page = await browser.newPage({ viewport });
    results.push(await measure(page, url, label));
    await page.close();
  }
  console.table(results);
  console.log("Performance passed the desktop and mobile budgets.");
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => {
    server.httpServer.close((error) => error ? reject(error) : resolve());
  });
}
