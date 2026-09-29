import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const preview = "http://127.0.0.1:3210/dev/lifetime-report";
const outputDir = new URL("../docs/qa-screenshots/editorial-v3/", import.meta.url);
const mobile = [
  ["cover", null], ["personality", "02"], ["five-elements", "03"], ["strength", "04"], ["strengths", "05"], ["work", "06"],
  ["money", "07"], ["relationship", "08"], ["children", "09"], ["wellness", "10"], ["helpful-flow", "11"],
  ["daeun", "15"], ["lifetime-advice", "17"], ["professional", "18"],
];
const desktop = [["cover", null], ["personality", "02"], ["money", "07"], ["relationship", "08"], ["wellness", "10"], ["daeun", "15"], ["professional", "18"]];
const shots = [
  ...mobile.map(([name, chapter], index) => [`mobile-${name}`, [375, 390, 430][index % 3], index % 3 === 0 ? 812 : index % 3 === 1 ? 844 : 932, chapter]),
  ...desktop.map(([name, chapter], index) => [`desktop-${name}`, index % 2 ? 1280 : 1440, index % 2 ? 900 : 1000, chapter]),
];
const selectedShots = globalThis.process.argv[2] ? shots.filter(([name]) => name === globalThis.process.argv[2]) : shots;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture([name, width, height, chapter], index) {
  const port = 9500 + index;
  const profile = join(globalThis.process.cwd(), ".capture", `${name}-${Date.now()}`);
  const browser = spawn(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  try {
    let pages;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try { pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch { await sleep(100); }
    }
    const page = pages?.find((item) => item.type === "page");
    if (!page) throw new Error(`Unable to open browser page for ${name}`);
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
    let messageId = 0;
    const pending = new Map();
    socket.addEventListener("message", async ({ data }) => {
      const raw = typeof data === "string" ? data : Buffer.from(await data.arrayBuffer()).toString();
      const message = JSON.parse(raw);
      const resolve = pending.get(message.id);
      if (resolve) { pending.delete(message.id); resolve(message); }
    });
    const send = (method, params = {}) => new Promise((resolve) => { const id = ++messageId; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600, screenWidth: width, screenHeight: height });
    await send("Page.navigate", { url: chapter ? `${preview}?chapter=${chapter}` : preview });
    await sleep(2_800);
    const layout = await send("Runtime.evaluate", { expression: "({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth})", returnByValue: true });
    const { scrollWidth, clientWidth } = layout.result.result.value;
    if (scrollWidth > clientWidth) throw new Error(`${name} has horizontal overflow: ${scrollWidth} > ${clientWidth}`);
    const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    await writeFile(new URL(`${name}.png`, outputDir), Buffer.from(screenshot.result.data, "base64"));
    socket.close();
  } finally { browser.kill(); }
}

await mkdir(outputDir, { recursive: true });
for (const [index, shot] of selectedShots.entries()) await capture(shot, index);
globalThis.process.exit(0);
