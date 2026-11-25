/* global document, window, innerWidth */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(resolve(process.env.HALLMARK_PUPPETEER || ".hallmark/runtime", "verify.cjs"));
const puppeteer = require("puppeteer-core");
const base = process.env.ORDENFI_TEST_URL || "http://localhost:3000";
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const results = [];
const capture = process.argv.includes("--capture");
mkdirSync(".hallmark/unified", { recursive: true });

try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.setViewport({ width: 1280, height: 900 });
  const landing = await page.goto(base, { waitUntil: "networkidle0", timeout: 60000 });
  assert.equal(landing.status(), 200);
  assert.match(await page.$eval("h1", heading => heading.textContent), /Stablecoins/);
  assert.equal(await page.$('[role="tablist"][aria-label="Money tools"]'), null);
  assert.deepEqual(await page.$$eval('a[href="/app"]', links => links.map(link => link.textContent.trim())), ["Go to App", "Go to App", "Go to App"]);
  assert.equal(await page.$('[data-transfer-preview], [aria-label="Workspace details"]'), null);
  assert.doesNotMatch(await page.$eval("main", element => element.innerText), /USDC bridge preview/);
  assert.equal(await page.$eval("[data-mobile-concept] figcaption", caption => caption.textContent), "Mobile app concept");
  assert.match(await page.$eval("[data-mobile-concept] img", image => image.alt), /USDC-to-EURC swap/);
  await page.waitForFunction(() => {
    const image = document.querySelector("[data-mobile-concept] img");
    return image?.complete && image.naturalWidth > 0;
  });
  const konaScenes = ["hello", "scout", "guide", "courier", "farewell"];
  assert.deepEqual(await page.$$eval("[data-landing-kona]", mascots => mascots.map(mascot => mascot.dataset.landingKona)), konaScenes);
  assert.ok(await page.$('#workflow figure:has(img[alt*="payment review"]) figcaption [data-landing-kona="guide"]'));
  const phone = "[data-phone-device]";
  const stillPose = await page.$eval(phone, device => {
    const style = window.getComputedStyle(device);
    return { transform: style.transform, animation: style.animationName };
  });
  assert.match(stillPose.transform, /^matrix3d/);
  assert.equal(stillPose.animation, "none");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.waitForFunction(selector => document.querySelector(selector).getAnimations().some(animation => animation.playState === "running"), {}, phone);
  await page.waitForFunction(selector => document.querySelector(selector).getAnimations().length === 0, {}, phone);
  await page.hover(`${phone} img`);
  await page.waitForFunction((selector, restingTransform) => window.getComputedStyle(document.querySelector(selector)).transform !== restingTransform, {}, phone, stillPose.transform);
  await page.mouse.move(0, 0);
  for (const scene of [...konaScenes.slice(1), "hello"]) {
    const mascot = `[data-landing-kona="${scene}"]`;
    await page.$eval(mascot, node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForFunction(selector => {
      const node = document.querySelector(selector);
      return node.hasAttribute("data-in-view") && node.getAnimations({ subtree: true }).some(animation => animation.playState === "running" && animation.effect.getTiming().iterations === Infinity);
    }, {}, mascot);
  }
  await page.click('button[aria-label="Pause Kona animation"]');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-landing-kona]')].every(node => node.getAnimations({ subtree: true }).every(animation => animation.playState === "paused")));
  await page.click('button[aria-label="Resume Kona animation"]');
  await page.waitForFunction(() => document.querySelector('[data-landing-kona="hello"]').getAnimations({ subtree: true }).some(animation => animation.playState === "running"));
  assert.ok(await page.$$eval('[data-landing-kona]:not([data-in-view])', nodes => nodes.every(node => node.getAnimations({ subtree: true }).every(animation => animation.playState === "paused"))));
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  assert.deepEqual(await page.$$eval("[data-landing-kona]", nodes => nodes.map(node => node.getAnimations({ subtree: true }).length)), konaScenes.map(() => 0));
  await page.evaluate(() => window.scrollTo(0, 0));
  results.push('Phone mockup tilts on arrival and hover, with a still pose for reduced motion');
  results.push('Kona loops in all five landing sections and pauses offscreen, on request, and with reduced motion');
  for (const width of [320, 390, 820, 1280]) {
    await page.setViewport({ width, height: 900 });
    const landingSize = await page.evaluate(() => {
      const [hero, ...sections] = document.querySelectorAll("#landing-main > section");
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        heroEnd: hero.getBoundingClientRect().bottom + window.scrollY,
        heights: sections.map(section => section.getBoundingClientRect().height),
        viewport: window.innerHeight,
      };
    });
    assert.equal(landingSize.overflow, false, `Landing overflow at ${width}px`);
    assert.ok(landingSize.heroEnd >= landingSize.viewport - 16, `Hero stops before the first screen ends at ${width}px`);
    assert.equal(landingSize.heights.length, 4);
    assert.ok(landingSize.heights.every(height => height >= landingSize.viewport - 1), `A landing section is shorter than the viewport at ${width}px`);
    if (capture && [390, 1280].includes(width)) await page.screenshot({ path: `.hallmark/unified/landing-${width}.png`, fullPage: true });
  }
  for (const section of ["features", "workflow", "use-cases"]) {
    await page.locator(`nav[aria-label="Primary"] a[href="#${section}"]`).click();
    await page.waitForFunction(id => window.location.hash === "#" + id, {}, section);
  }
  await page.locator('nav[aria-label="Primary"] a[href="#features"]').click();
  const featureTabs = '[role="tablist"][aria-label="Feature previews"]';
  await page.focus(`${featureTabs} [aria-selected="true"]`);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Send & Receive");
  assert.equal(await page.$eval(`${featureTabs} [aria-selected="true"]`, tab => tab.getAttribute("aria-label")), "Send & Receive");
  await page.locator(`${featureTabs} [aria-label="Kona"]`).click();
  await page.waitForFunction(() => {
    const image = document.querySelector("#features [role='tabpanel'] img");
    return image?.alt.includes("Kona") && image.complete && image.naturalWidth > 0;
  });
  await page.focus(`${featureTabs} [aria-selected="true"]`);
  await page.keyboard.press("Home");
  assert.equal(await page.$eval(`${featureTabs} [aria-selected="true"]`, tab => tab.getAttribute("aria-label")), "Swap & Bridge");
  results.push('Mobile swap preview renders and the feature previews switch by keyboard and pointer');
  await page.click('main a[href="/app"]');
  await page.waitForSelector('[role="tablist"][aria-label="Money tools"]', { timeout: 60000 });
  assert.equal(new URL(page.url()).pathname, "/app");
  results.push('Viewport-height landing sections, section links, and Go to App verified');
  assert.deepEqual(await page.$$eval('nav[aria-label^="Primary"]', nodes => nodes.map(nav => [...nav.querySelectorAll("a")].map(link => link.getAttribute("href")))), [
    ["/app", "/analytics"], ["/app", "/analytics"],
  ]);
  assert.equal(await page.$('.ordenfi-shell a:is([href="/docs"], [href^="/docs#"], [href*="x.com/"], [href*="twitter.com/"])'), null);
  results.push('Workspace navigation has only Workspace and Analytics, with no Docs or X links');
  assert.equal(await page.$eval('[role="tablist"][aria-label="Money tools"]', el => el.getAttribute('aria-orientation')), 'vertical', 'Desktop actions must be a vertical sidebar');
  const sidebar = await page.evaluate(() => {
    const menu = document.querySelector('[role="tablist"][aria-label="Money tools"]').getBoundingClientRect();
    const form = document.querySelector('#tools-panel-swap').getBoundingClientRect();
    const swap = document.querySelector('#tools-tab-swap').getBoundingClientRect();
    const send = document.querySelector('#tools-tab-send').getBoundingClientRect();
    return { beforeForm: menu.right <= form.left, vertical: send.top > swap.top && Math.abs(send.left - swap.left) < 2 };
  });
  assert.ok(sidebar.beforeForm && sidebar.vertical, 'Action items must stack in a sidebar before the selected form');
  await page.focus('#tools-tab-swap');
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => document.querySelector('#tools-tab-send')?.getAttribute('aria-selected') === 'true');
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => document.querySelector('#tools-tab-swap')?.getAttribute('aria-selected') === 'true');
  results.push('Clickable vertical action sidebar and keyboard navigation work');
  assert.equal(await page.$eval('#tools-tab-swap', el => el.getAttribute('aria-selected')), 'true');
  assert.equal(await page.$$eval('#agent-message', nodes => nodes.length), 1, 'Only one assistant may be mounted');
  assert.ok(await page.$('[aria-label="Recent activity"]'), 'Activity must be available on the unified page');
  const desktop = await page.evaluate(() => {
    const left = document.querySelector('[data-workspace-actions]').getBoundingClientRect();
    const right = document.querySelector('[data-workspace-assistant]').getBoundingClientRect();
    return { left: left.left, right: right.left, sameRow: Math.abs(left.top - right.top) < 8 };
  });
  assert.ok(desktop.left < desktop.right && desktop.sameRow, 'Actions must be left and assistant right on desktop');
  const links = await page.$$eval('nav[aria-label="Primary"] a', nodes => nodes.map(el => ({ href: el.getAttribute('href'), text: el.textContent.trim() })));
  assert.equal(links.filter(link => link.href === '/app').length, 1);
  assert.equal(links.some(link => link.href === '/dashboard'), false, 'Duplicate Dashboard navigation must be removed');
  results.push('Single workspace: complete action tools left, one assistant right, activity included');

  for (const tab of ['send', 'bridge', 'receive', 'batch', 'more', 'swap']) {
    await page.click('#tools-tab-' + tab);
    await page.waitForFunction(id => document.getElementById('tools-tab-' + id)?.getAttribute('aria-selected') === 'true', {}, tab);
    assert.equal(await page.$eval('#tools-panel-' + tab, el => el.hidden), false);
    if (tab === 'more') {
      for (const title of ['Buy USDC (Fiat Onramp)', 'Route Risk Analysis', 'Unified Balance']) {
        assert.ok(await page.$eval('#tools-panel-more', (el, title) => el.textContent.includes(title), title), title);
      }
    }
  }
  results.push('Swap, Send, Bridge, Receive, Batch Payments and More are reachable');

  const externalQrRequests = [];
  page.on('request', request => { if (request.url().includes('qrserver.com')) externalQrRequests.push(request.url()); });
  await page.click('#tools-tab-receive');
  await page.waitForSelector('#qr-recipient', { visible: true });
  assert.equal(await page.$('#tools-panel-receive textarea'), null, 'No request generated without a valid recipient');
  await page.type('#qr-recipient', '0x1111111111111111111111111111111111111111');
  await page.waitForSelector('textarea[aria-label="Payment link"]');
  const requestUrl = await page.$eval('textarea[aria-label="Payment link"]', el => el.value);
  const paymentDetails = new URLSearchParams(new URL(requestUrl).searchParams.get('pay'));
  assert.equal(paymentDetails.get('to'), '0x1111111111111111111111111111111111111111');
  assert.equal(paymentDetails.get('chain'), 'Arc_Mainnet');
  assert.ok(await page.$('#tools-panel-receive svg[role="img"]'), 'QR must render locally as SVG');
  assert.equal(await page.$('#tools-panel-receive img'), null);
  assert.deepEqual(externalQrRequests, []);
  await page.click('#tools-tab-batch');
  await page.type('input[aria-label="Batch label"]', ' check');
  await page.click('#tools-tab-send');
  await page.click('#tools-tab-batch');
  assert.ok((await page.$eval('input[aria-label="Batch label"]', el => el.value)).endsWith(' check'), 'Batch state must survive action navigation');
  await page.click('#tools-tab-more');
  await page.evaluate(() => [...document.querySelectorAll('#tools-panel-more button')].find(el => el.textContent.includes('Route Risk Analysis')).click());
  await page.waitForFunction(() => [...document.querySelectorAll('#tools-panel-more button')].some(el => el.textContent.includes('Paid unavailable') && el.disabled));
  await page.evaluate(() => [...document.querySelectorAll('#tools-panel-more button')].find(el => el.textContent.includes('Free assess')).click());
  await page.waitForFunction(() => document.querySelector('#tools-panel-more').textContent.includes('Score') || document.querySelector('#tools-panel-more .text-red-400'));
  assert.ok(await page.$eval('#tools-panel-more', el => el.textContent.includes('Score')), await page.$eval('#tools-panel-more', el => el.textContent));
  await page.click('#tools-tab-swap');
  results.push('Local QR binds recipient/network, batch drafts persist, paid risk is disabled, free estimate works');

  const connect = await page.$('#tools-panel-swap button[data-wallet-connect]');
  assert.ok(connect);
  await connect.click();
  await page.waitForSelector('dialog[open]', { visible: true });
  await page.keyboard.press('Escape');
  await page.waitForSelector('.assistant-surface', { hidden: true });
  await page.click('[data-assistant-restore]');
  await page.waitForSelector('.assistant-surface', { visible: true });
  await page.type('#agent-message', 'Keep this draft');
  await page.click('[aria-label="Hide assistant"]');
  await page.waitForSelector('.assistant-surface', { hidden: true });
  await page.click('[data-assistant-restore]');
  await page.waitForSelector('.assistant-surface', { visible: true });
  assert.equal(await page.$eval('#agent-message', el => el.value), 'Keep this draft');
  results.push('Wallet connection and assistant draft preservation still work');

  await page.click('#tools-tab-send');
  await page.evaluate(() => {
    const request = { amount: '2.75', tokenIn: 'USDC', tokenOut: 'EURC', autoQuote: false };
    window.sessionStorage.setItem('agfusion_swap_handoff_v1', JSON.stringify(request));
    window.dispatchEvent(new CustomEvent('agfusion:swap-handoff', { detail: request }));
  });
  await page.waitForFunction(() => document.querySelector('#tools-tab-swap')?.getAttribute('aria-selected') === 'true');
  await page.waitForFunction(() => document.querySelector('#tools-panel-swap input[aria-label="Amount to pay"]')?.value === '2.75');
  results.push('Assistant swap handoff selects Swap and preserves the requested amount');

  // Capture the clean entry state after exercising handoff and draft behavior.
  await page.goto(base + '/app', { waitUntil: 'networkidle0' });
  await page.mouse.move(0, 0);

  for (const width of [320, 375, 768, 1024, 1280, 1920]) {
    await page.setViewport({ width, height: 900 });
    await page.waitForFunction(expected => document.querySelector('[role="tablist"][aria-label="Money tools"]')?.getAttribute('aria-orientation') === expected, {}, width < 768 ? 'horizontal' : 'vertical');
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    const layout = await page.evaluate(() => {
      const actions = document.querySelector('[data-workspace-actions]').getBoundingClientRect();
      const assistant = document.querySelector('[data-workspace-assistant]').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth, actionsTop: actions.top, actionsBottom: actions.bottom, assistantTop: assistant.top, actionsRight: actions.right, assistantLeft: assistant.left };
    });
    assert.equal(layout.overflow, false, `Overflow at ${width}px`);
    if (width >= 1024) assert.ok(layout.actionsRight <= layout.assistantLeft, `Desktop column order at ${width}px`);
    else assert.ok(layout.assistantTop >= layout.actionsBottom, `Mobile must show actions before assistant at ${width}px`);
    if (capture && [375, 1280, 1920].includes(width)) await page.screenshot({ path: `.hallmark/unified/workspace-${width}.png`, fullPage: true });
  }
  results.push('Responsive action-first layout verified at 320–1920px');

  const payment = encodeURIComponent(new URLSearchParams({ amount: '1.23', memo: 'Payment link', to: '0x1111111111111111111111111111111111111111', chain: 'Arc_Mainnet' }).toString());
  for (const route of ['/', '/app', '/dashboard', '/welcome']) {
    await page.goto(base + route + '?pay=' + payment, { waitUntil: 'networkidle0' });
    assert.ok(await page.$('[role="tablist"][aria-label="Money tools"]'));
    assert.ok(await page.evaluate(() => document.body.innerText.includes('Payment Request:') && document.body.innerText.includes('1.23 USDC')));
  }
  await page.goto(base + '/dashboard#tools', { waitUntil: 'networkidle0' });
  assert.ok(await page.$('#tools'));
  results.push('Workspace and legacy routes preserve payment queries and tool deep links');
  const docs = await page.goto(base + '/docs', { waitUntil: 'domcontentloaded' });
  assert.equal(docs.status(), 200);
  await page.locator('main a[href="/app"]').click();
  await page.waitForSelector('#tools-tab-swap');
  assert.equal(new URL(page.url()).pathname, '/app');
  results.push('Docs link returns to the workspace');
  assert.deepEqual(errors, [], 'Client runtime errors');
  writeFileSync('.hallmark/unified/browser-checks.json', JSON.stringify({ results, errors }, null, 2));
  console.log(results.join('\n'));
} finally {
  await browser.close();
}
