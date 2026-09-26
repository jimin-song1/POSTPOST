import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const preview = "http://127.0.0.1:3210/dev/lifetime-report?fixture=balanced";
const outputDir = new URL("../docs/qa-screenshots/m22-1/", import.meta.url);
const shots = [
  ["mobile-input", 390, 844, "http://127.0.0.1:3210/"], ["mobile-cover", 390, 844, preview],
  ["mobile-personality", 390, 844, `${preview}&chapter=02`], ["mobile-elements", 390, 844, `${preview}&chapter=03`],
  ["mobile-wealth", 390, 844, `${preview}&chapter=07`], ["mobile-relationship", 390, 844, `${preview}&chapter=08`],
  ["mobile-children", 390, 844, `${preview}&chapter=09`], ["mobile-wellness", 390, 844, `${preview}&chapter=10`],
  ["mobile-daeun", 390, 844, `${preview}&chapter=15`], ["mobile-professional", 390, 844, `${preview}&chapter=18`],
  ["mobile-375", 375, 667, `${preview}&chapter=03`], ["mobile-430", 430, 932, `${preview}&chapter=15`],
  ["desktop-cover", 1440, 1000, preview], ["desktop-narrative", 1440, 1000, `${preview}&chapter=02`],
  ["desktop-visualization", 1440, 1000, `${preview}&chapter=03`], ["desktop-children-health", 1440, 1000, `${preview}&chapter=09`],
  ["desktop-daeun", 1280, 900, `${preview}&chapter=15`], ["desktop-professional", 1440, 1000, `${preview}&chapter=18`],
];
const selectedShots = globalThis.process.argv[2] ? shots.filter(([name]) => name === globalThis.process.argv[2]) : shots;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture([name, width, height, url], index) {
  const port = 9400 + index;
  const browser = spawn(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/postpost-m22-cdp-${name}`, "about:blank"], { stdio: "ignore" });
  let pages;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch { await sleep(100); }
  }
  const page = pages?.find((item) => item.type === "page");
  if (!page) throw new Error(`Unable to open browser page for ${name}`);
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  let messageId = 0;
  const pending = new Map();
  socket.addEventListener("message", async ({ data }) => {
    const text = typeof data === "string" ? data : Buffer.from(await data.arrayBuffer()).toString();
    const message = JSON.parse(text);
    const resolve = pending.get(message.id);
    if (resolve) { pending.delete(message.id); resolve(message); }
  });
  const send = (method, params = {}) => new Promise((resolve) => { const id = ++messageId; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url });
  await sleep(3500);
  const layout = await send("Runtime.evaluate", { expression: "({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth})", returnByValue: true });
  const { scrollWidth, clientWidth } = layout.result.result.value;
  if (scrollWidth > clientWidth) throw new Error(`${name} has horizontal overflow: ${scrollWidth} > ${clientWidth}`);
  const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await writeFile(new URL(`${name}.png`, outputDir), Buffer.from(screenshot.result.data, "base64"));
  socket.close();
  browser.kill();
}

await mkdir(outputDir, { recursive: true });
for (const [index, shot] of selectedShots.entries()) await capture(shot, index);
globalThis.process.exit(0);
