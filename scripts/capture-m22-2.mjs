import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const base = "http://127.0.0.1:3210/";
const preview = `${base}dev/lifetime-report?fixture=balanced`;
const outputDir = new URL("../docs/qa-screenshots/m22-2/", import.meta.url);
const inputShots = [
  ["mobile-input-full", 390, 844, "full", ""],
  ["mobile-date-typed", 390, 844, "viewport", "dateTyped"],
  ["mobile-date-picker", 390, 844, "viewport", "datePicker"],
  ["mobile-time-typed", 390, 844, "viewport", "timeTyped"],
  ["mobile-time-picker", 390, 844, "viewport", "timePicker"],
  ["mobile-country-dropdown", 390, 844, "viewport", "country"],
  ["mobile-city-dropdown", 390, 844, "viewport", "city"],
  ["mobile-completed-form", 390, 844, "full", "complete"],
  ["mobile-375-date-picker", 375, 667, "viewport", "datePicker"],
  ["mobile-430-time-picker", 430, 932, "viewport", "timePicker"],
  ["desktop-input", 1440, 1000, "viewport", "complete"],
];
const reportShots = [
  ["mobile-report-cover", 390, 844, "viewport", preview],
  ["mobile-report-wellness", 390, 844, "viewport", `${preview}&chapter=10`],
  ["mobile-report-daeun", 430, 932, "viewport", `${preview}&chapter=15`],
  ["desktop-report-cover", 1440, 1000, "viewport", preview],
  ["desktop-report-professional", 1440, 1000, "viewport", `${preview}&chapter=18`],
];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect(name, index, width, height, url) {
  const port = 9600 + index;
  const browser = spawn(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/postpost-m22-2-${name}`, "about:blank"], { stdio: "ignore" });
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
    const message = JSON.parse(typeof data === "string" ? data : Buffer.from(await data.arrayBuffer()).toString());
    const resolve = pending.get(message.id);
    if (resolve) { pending.delete(message.id); resolve(message); }
  });
  const send = (method, params = {}) => new Promise((resolve) => { const id = ++messageId; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url });
  await sleep(2200);
  return { browser, socket, send };
}

const setValue = (selector, value) => `(() => { const el=document.querySelector(${JSON.stringify(selector)}); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(el,${JSON.stringify(value)}); el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:${JSON.stringify(value)}})); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value; })()`;

async function evaluate(send, expression) {
  const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.text);
  return response.result.result.value;
}

async function prepareInput(send, mode) {
  const before = await evaluate(send, "document.documentElement.scrollHeight");
  if (["dateTyped", "datePicker", "complete"].includes(mode)) await evaluate(send, setValue('[data-testid="birth-date-input"]', "19950930"));
  if (["timeTyped", "timePicker", "complete"].includes(mode)) await evaluate(send, setValue('[data-testid="birth-time-input"]', "0829"));
  if (mode === "complete") {
    await evaluate(send, setValue("#customer-name", "가나다라마바사아자차카타파하"));
    await evaluate(send, `document.querySelectorAll('.searchSelect .selectTrigger')[1].click()`);
    await sleep(100);
    await evaluate(send, `Array.from(document.querySelectorAll('[role=option]')).find(el=>el.textContent.includes('서울특별시')).click()`);
    await evaluate(send, "window.scrollTo(0,0)");
  }
  const target = mode.startsWith("date") ? `document.querySelector('[data-testid="birth-date-input"]')` : mode.startsWith("time") ? `document.querySelector('[data-testid="birth-time-input"]')` : mode === "country" ? `document.querySelectorAll('.searchSelect .selectTrigger')[0]` : mode === "city" ? `document.querySelectorAll('.searchSelect .selectTrigger')[1]` : `document.querySelector('.inputBook')`;
  if (mode === "datePicker") await evaluate(send, `document.querySelector('[aria-label="생년월일 선택 열기"]').click()`);
  if (mode === "timePicker") await evaluate(send, `document.querySelector('[aria-label="태어난 시각 선택 열기"]').click()`);
  if (mode === "country") await evaluate(send, `document.querySelectorAll('.searchSelect .selectTrigger')[0].click()`);
  if (mode === "city") await evaluate(send, `document.querySelectorAll('.searchSelect .selectTrigger')[1].click()`);
  await sleep(250);
  if (mode && mode !== "complete") await evaluate(send, `${target}.scrollIntoView({block:'center'})`);
  if (["datePicker", "timePicker", "country", "city"].includes(mode)) {
    const after = await evaluate(send, "document.documentElement.scrollHeight");
    if (after !== before) throw new Error(`${mode} changed document height: ${before} -> ${after}`);
    const contained = await evaluate(send, `(() => { const el=document.querySelector('.pickerMenu,.selectMenu'); const r=el.getBoundingClientRect(); return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight; })()`);
    if (!contained) throw new Error(`${mode} popover escaped viewport`);
  }
  if (mode === "datePicker") {
    const synced = await evaluate(send, `Array.from(document.querySelectorAll('.datePickerGrid select')).map(el=>el.value).join('-')`);
    if (synced !== "1995-09-30") throw new Error(`date picker did not sync: ${synced}`);
    const selected = await evaluate(send, `(() => { const el=document.querySelectorAll('.datePickerGrid select')[2]; el.value='12'; el.dispatchEvent(new Event('change',{bubbles:true})); return document.querySelector('[data-testid="birth-date-input"]').value; })()`);
    if (selected !== "1995-09-12") throw new Error(`date input did not sync from picker: ${selected}`);
  }
  if (mode === "timePicker") {
    const synced = await evaluate(send, `Array.from(document.querySelectorAll('.timePickerGrid select')).map(el=>el.value).join(':')`);
    if (synced !== "08:29") throw new Error(`time picker did not sync: ${synced}`);
    const selected = await evaluate(send, `(() => { const el=document.querySelectorAll('.timePickerGrid select')[1]; el.value='47'; el.dispatchEvent(new Event('change',{bubbles:true})); return document.querySelector('[data-testid="birth-time-input"]').value; })()`);
    if (selected !== "08:47") throw new Error(`time input did not sync from picker: ${selected}`);
  }
}

async function capture(shot, index, report = false) {
  const [name, width, height, mode, target] = shot;
  const url = report ? target : base;
  const { browser, socket, send } = await connect(name, index, width, height, url);
  if (!report) await prepareInput(send, target);
  const layout = await evaluate(send, "({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,devIndicator:Boolean(document.querySelector('[data-next-badge-root]'))})");
  if (layout.scrollWidth > layout.clientWidth) throw new Error(`${name} has horizontal overflow: ${layout.scrollWidth} > ${layout.clientWidth}`);
  if (layout.devIndicator) throw new Error(`${name} contains a Next.js dev indicator`);
  let params = { format: "png", fromSurface: true, captureBeyondViewport: mode === "full" };
  if (mode === "full") {
    const metrics = await send("Page.getLayoutMetrics");
    const size = metrics.result.cssContentSize;
    params = { ...params, clip: { x: 0, y: 0, width, height: Math.ceil(size.height), scale: 1 } };
  }
  const screenshot = await send("Page.captureScreenshot", params);
  await writeFile(new URL(`${name}.png`, outputDir), Buffer.from(screenshot.result.data, "base64"));
  socket.close();
  browser.kill();
}

await mkdir(outputDir, { recursive: true });
let index = 0;
for (const shot of inputShots) await capture(shot, index++);
for (const shot of reportShots) await capture(shot, index++, true);
globalThis.process.exit(0);
