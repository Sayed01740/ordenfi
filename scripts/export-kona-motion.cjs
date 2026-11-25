/* global document, window */
const { copyFileSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const { join, resolve } = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const sharp = require("sharp");
const ts = require("typescript");

const root = resolve(__dirname, "..");
const source = join(root, "src/components/workspace");
const pack = join(root, ".hallmark/assistant/Kona-Motion-Kit");
const output = join(pack, "motion");
const identity = require(join(source, "kona-identity.json"));
const css = readFileSync(join(source, "assistant-robot.module.css"), "utf8");
const puppeteerRoot = resolve(process.env.ORDENFI_PUPPETEER_DIR || join(root, ".hallmark/runtime"));
const puppeteer = createRequire(join(puppeteerRoot, "export.cjs"))("puppeteer-core");
const exportSize = 320;

// Use the same component as the app with the plain CSS class names used offline.
function loadPreviewRobot() {
  const styleImport = 'import styles from "./assistant-robot.module.css";';
  const component = readFileSync(join(source, "assistant-robot.tsx"), "utf8");
  if (!component.includes(styleImport)) throw new Error("The Kona component's CSS module import changed");
  const classMap = Object.fromEntries([...css.matchAll(/\.([a-z][\w-]*)/gi)].map(([, name]) => [name, name]));
  const withPlainClasses = component.replace(styleImport, `const styles = ${JSON.stringify(classMap)};`);
  const compiled = ts.transpileModule(withPlainClasses, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const modulePath = join(root, ".hallmark/assistant/kona-render.cjs");
  mkdirSync(join(root, ".hallmark/assistant"), { recursive: true });
  writeFileSync(modulePath, compiled);
  return require(modulePath).AssistantRobot;
}
const PreviewRobot = loadPreviewRobot();

const theme = `:root {
  color-scheme: dark;
  --color-accent: ${identity.palette.signal};
  --color-warning: ${identity.palette.warning};
  --color-info: ${identity.palette.pending};
  --color-danger: ${identity.palette.error};
  --color-card: #191c1f;
  --color-border: #353b40;
  --color-muted-foreground: #a5adb4;
  --surface-raised: #202428;
} * { box-sizing: border-box; }`;

function robot(pose) {
  return renderToStaticMarkup(React.createElement(PreviewRobot, pose));
}

function offlinePreview() {
  const variants = identity.motions.map(motion => ({ ...motion, markup: robot(motion.pose) }));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Kona Motion Kit</title>
<style>${theme}\n${css}
body { margin: 0; background: ${identity.palette.stage}; color: #eeeef0; font: 15px/1.5 system-ui, sans-serif; }
main { max-width: 78rem; margin: 0 auto; padding: clamp(1rem, 4.5vw, 4rem); }
h1 { font-size: clamp(3rem, 9vw, 7rem); line-height: .95; letter-spacing: -.055em; margin: 0; }
header p { margin: .7rem 0 1.8rem; color: var(--color-muted-foreground); }
.studio { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(16rem, 1fr); gap: 20px; }
.stage.launcher { position: relative; display: grid; place-items: center; padding: 28px; width: 100%; aspect-ratio: 1.16; min-height: 240px; background: #171b1a; border-color: #343c38; }
.stage .robot { font-size: min(40vw, 228px); }
.stage-output { position: absolute; inset: auto 16px 16px; font-size: 13px; }
.studio aside { border-block: 1px solid var(--color-border); padding-block: 14px; }
.studio h2 { margin: 0 0 10px; font-size: 16px; }
.motions { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 6px; }
button { min-height: 44px; border: 1px solid #434b47; border-radius: 8px; background: #202522; color: #eeeef0; padding: 8px 10px; font: inherit; font-size: 13px; cursor: pointer; text-align: left; }
button[aria-pressed="true"] { color: var(--color-accent); border-color: var(--color-accent); }
button:focus-visible, .stage:focus-visible, input:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }
button:hover { background: #313832; }
.controls { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.controls label, #description { color: var(--color-muted-foreground); font-size: 13px; }
body.reduce-motion .robot, body.reduce-motion .robot *, body.reduce-motion .robot *::before { animation: none !important; transition: none !important; }
body.reduce-motion .robot .eyes { transform: none; }
@media(max-width: 660px) { .studio { grid-template-columns: 1fr; } .stage .robot { font-size: min(43vw, 208px); } }
</style></head><body><main>
<header><h1>Kona</h1><p>The Ordenfi assistant · Motion kit</p></header>
<div class="studio"><div id="stage" class="stage launcher" role="img" aria-label="Kona, animated Ordenfi robot">${variants[0].markup}<span class="stage-output" id="motion-label">Idle</span></div>
<aside><h2>Select a motion</h2><div class="motions" id="motions"></div><p id="description" aria-live="polite"></p>
<div class="controls"><button type="button" id="replay">Replay motion</button><label><input type="checkbox" id="reduce"> Reduce motion</label></div></aside></div>
</main><script>
const motions = ${JSON.stringify(variants).replace(/</g, "\\u003c")};
const stage = document.getElementById('stage');
const controls = document.getElementById('motions');
let active = 0;
function play(index) {
  active = index;
  const motion = motions[index];
  stage.toggleAttribute('data-preview-gaze', motion.id === 'gaze');
  const previous = stage.querySelector('[data-kona]');
  if (previous) previous.remove();
  stage.insertAdjacentHTML('afterbegin', motion.markup);
  document.getElementById('motion-label').textContent = motion.label;
  document.getElementById('description').textContent = motion.description;
  for (const [i, button] of [...controls.children].entries()) button.setAttribute('aria-pressed', String(i === active));
}
for (const [i, motion] of motions.entries()) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = motion.label;
  button.addEventListener('click', () => play(i));
  controls.append(button);
}
document.getElementById('replay').addEventListener('click', () => play(active));
document.getElementById('reduce').addEventListener('change', event => {
  document.body.classList.toggle('reduce-motion', event.target.checked);
  play(active);
});
stage.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  const bounds = stage.getBoundingClientRect();
  stage.style.setProperty('--gaze-x', (event.clientX - bounds.left - bounds.width / 2) / 25 + 'px');
  stage.style.setProperty('--gaze-y', (event.clientY - bounds.top - bounds.height / 2) / 25 + 'px');
});
stage.addEventListener('pointerleave', () => {
  stage.style.removeProperty('--gaze-x');
  stage.style.removeProperty('--gaze-y');
});
play(0);
</script></body></html>`;
}

async function setAvatar(page, motion, { size = exportSize, transparent = false } = {}) {
  await page.setViewport({ width: size, height: size });
  await page.setContent(`<!doctype html><style>${theme}\n${css}\n
body{margin:0;background:${transparent ? "transparent" : identity.palette.stage};}
.frame.launcher{width:100vw;height:100vh;display:grid;place-items:center;padding:0;border:0;background:transparent;}
.frame .robot{font-size:${Math.round(size * .69)}px;}
</style><div class="frame launcher" ${motion.id === "gaze" ? "data-preview-gaze" : ""}>${robot(motion.pose)}</div>`);
  await page.evaluate(() => {
    document.body.getBoundingClientRect();
    window.konaAnimations = document.getAnimations();
    for (const animation of window.konaAnimations) animation.pause();
  });
}

async function frame(page, time, transparent = false) {
  await page.evaluate(ms => {
    for (const animation of window.konaAnimations) animation.currentTime = ms;
  }, time);
  return Buffer.from(await page.screenshot({ omitBackground: transparent }));
}

async function main() {
  for (const folder of [output, join(pack, "static"), join(pack, "source")]) mkdirSync(folder, { recursive: true });
  for (const name of ["assistant-robot.tsx", "assistant-robot.module.css", "kona-identity.json"]) copyFileSync(join(source, name), join(pack, "source", name));
  copyFileSync(join(root, "docs/KONA.md"), join(pack, "CHARACTER.md"));
  writeFileSync(join(pack, "index.html"), offlinePreview());
  writeFileSync(join(pack, "README.md"), `# Kona Motion Kit\n\nOpen **index.html** in a browser for the offline motion preview.\n\n- **motion/** contains ${identity.motions.length} looping 320 × 320 animated WebP clips and a GIF reel.\n- **static/** contains 512 px and 128 px transparent PNGs, plus a preview screenshot.\n- **source/** contains the React component, its CSS module, and the identity and motion manifest.\n- **CHARACTER.md** describes the character, palette and behavior.\n\nTo embed the live component, copy the TSX and CSS module into a React project with CSS module support. Set the mood and state props from your UI. The preview includes a plain HTML version that does not require React or an internet connection.\n`);

  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1050, height: 760, deviceScaleFactor: 1 });
    await page.setContent(offlinePreview());
    await page.waitForSelector('#motions button:last-child');
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.screenshot({ path: join(pack, "static", "motion-preview.png"), fullPage: true });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

    const reel = [];
    const reelDelay = [];
    for (const motion of identity.motions) {
      await setAvatar(page, motion);
      const frames = [];
      const delays = [];
      for (let time = 0; time <= motion.ms; time += 85) {
        frames.push(await frame(page, time));
        delays.push(85);
      }
      delays[delays.length - 1] = 550;
      const clip = join(output, `kona-${motion.id}.webp`);
      await sharp(frames, { join: { animated: true } }).webp({ quality: 84, delay: delays, loop: 0 }).toFile(clip);
      const metadata = await sharp(clip, { animated: true }).metadata();
      if (!metadata.pages || metadata.pages < 2) throw new Error(`${motion.id} did not export as an animation`);
      for (let index = 0; index < frames.length; index += 2) {
        reel.push(frames[index]);
        reelDelay.push(index >= frames.length - 2 ? 430 : 170);
      }
      process.stdout.write(`${motion.id}: ${metadata.pages} frames\n`);
    }
    await sharp(reel, { join: { animated: true } }).gif({ colours: 128, effort: 2, delay: reelDelay, loop: 0 }).toFile(join(output, "kona-motion-reel.gif"));

    for (const size of [512, 128]) {
      await setAvatar(page, identity.motions[0], { size, transparent: true });
      writeFileSync(join(pack, "static", `kona-${size}.png`), await frame(page, 0, true));
    }
  } finally {
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  }
  process.stdout.write(`Kona pack exported to ${pack}\n`);
}

main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
