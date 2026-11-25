/* global document, window, innerWidth, getComputedStyle */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const runtime = process.env.HALLMARK_PUPPETEER || resolve(".hallmark/runtime");
const require = createRequire(resolve(runtime, "verify.cjs"));
const puppeteer = require("puppeteer-core");
const base = process.env.ORDENFI_TEST_URL || "http://localhost:3000";
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const results = [];
const capture = process.argv.includes("--capture");
mkdirSync(".hallmark/ordenfi", { recursive: true });

async function clickText(page, selector, text) {
  const handles = await page.$$(selector);
  for (const handle of handles) {
    if ((await handle.evaluate(el => el.textContent || "")).trim().includes(text)) {
      await handle.click();
      return;
    }
  }
  assert.fail(`Missing ${selector}: ${text}`);
}

try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const response = await page.goto(base + "/app", { waitUntil: "networkidle0", timeout: 60000 });
  assert.equal(response.status(), 200);
  assert.match(await page.title(), /Ordenfi/);
  await page.waitForSelector(".trade-surface");
  const primary = await page.$(".trade-body button[data-wallet-connect]");
  assert.ok(primary, "Disconnected swap must expose an actionable wallet-connect button");
  assert.equal(await primary.evaluate(el => el.disabled), false);
  await primary.click();
  await page.waitForSelector('dialog[open]', { visible: true, timeout: 5000 });
  await page.keyboard.press("Escape");
  results.push("Disconnected swap opens the wallet picker");

  const labels = await page.$$eval('.trade-body select', nodes => nodes.map(el => el.getAttribute('aria-label')));
  assert.ok(labels.length >= 2 && labels.every(Boolean), "Both swap token selectors need accessible names");
  results.push("Swap token selectors have accessible names");

  await page.type('#agent-message', 'Plan a transfer');
  await page.click('[aria-label="Hide assistant"]');
  await page.waitForSelector(".assistant-surface", { hidden: true });
  assert.ok(await page.evaluate(() => document.activeElement?.textContent.includes('Open assistant')), 'Focus must follow the collapsed assistant');
  await clickText(page, "button", "Open assistant");
  await page.waitForSelector(".assistant-surface", { visible: true });
  assert.equal(await page.$eval('#agent-message', el => el.value), 'Plan a transfer');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Hide assistant');
  await page.click('#agent-message');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  results.push("Assistant preserves draft text and keyboard focus when hidden and restored");

  await page.click('[aria-label="Settings"]');
  await page.keyboard.press("Escape");
  assert.equal(await page.$eval('[aria-label="Settings"]', el => el.getAttribute("aria-expanded")), "false");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Settings");
  results.push("Settings closes with Escape and restores focus");

  for (const width of [320, 375, 768, 820, 1024, 1280, 1920]) {
    await page.setViewport({ width, height: 900 });
    const sizes = await page.evaluate(() => {
      const input = document.querySelector('.trade-body input[aria-label="Amount to pay"]') || document.querySelector('.trade-body input[inputmode="decimal"]');
      const nav = document.querySelector('[aria-label="Primary"]');
      return { scroll: document.documentElement.scrollWidth, viewport: innerWidth, navDisplay: getComputedStyle(nav).display, amount: input ? parseFloat(getComputedStyle(input).fontSize) : null };
    });
    assert.ok(sizes.scroll <= sizes.viewport, `Horizontal overflow at ${width}px`);
    assert.ok(sizes.amount >= 28, `Swap amount shrank to ${sizes.amount}px at ${width}px`);
    assert.equal(sizes.navDisplay === 'none', width < 1024, `Navigation uses the wrong layout at ${width}px`);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    if (capture && [375, 1280, 1920].includes(width)) await page.screenshot({ path: `.hallmark/ordenfi/swap-${width}.png`, fullPage: true });
  }
  await page.setViewport({ width: 375, height: 900 });
  await page.goto(base + '/app', { waitUntil: 'networkidle0' });
  assert.equal(await page.evaluate(() => window.scrollY), 0, 'Initial assistant must not scroll the mobile page away from the swap');
  results.push('Mobile homepage stays at the top on initial load');
  results.push("No horizontal overflow and readable amounts at 320–1920px");

  for (const route of ["/dashboard", "/analytics", "/docs", "/bridge-diagnostics", "/welcome"]) {
    await page.setViewport({ width: 1280, height: 900 });
    const response = await page.goto(base + route, { waitUntil: "networkidle0", timeout: 60000 });
    assert.equal(response.status(), 200, route);
    const oldBrand = await page.evaluate(() => [...document.querySelectorAll('h1,h2,header,footer')].some(el => /\bAGFusion\b/.test(el.innerText)));
    assert.equal(oldBrand, false, `Stale public brand in ${route}`);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    if (capture && ["/dashboard", "/analytics", "/docs"].includes(route)) {
      await page.screenshot({ path: `.hallmark/ordenfi/${route.slice(1)}-1280.png`, fullPage: true });
      await page.setViewport({ width: 375, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Mobile overflow on ${route}`);
      await page.screenshot({ path: `.hallmark/ordenfi/${route.slice(1)}-375.png`, fullPage: true });
    }
    results.push(`${route}: HTTP 200 and Ordenfi identity`);
  }
  assert.deepEqual(errors, [], "Client runtime errors");
  writeFileSync(".hallmark/ordenfi/browser-checks.json", JSON.stringify({ results, errors }, null, 2));
  console.log(results.join("\n"));
} finally {
  await browser.close();
}
