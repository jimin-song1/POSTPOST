import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileInterpretationCache } from "@/lib/saju/ai-interpretation/file-cache";
import type { InterpretationSuccess } from "@/types/ai-interpretation";

const result = { status: "completed", analysisHash: "analysis", cacheKey: "cache", report: { headline: "ok" } } as unknown as InterpretationSuccess;

describe("FileInterpretationCache", () => {
  it("persists a validated result under the unchanged cache key and reports hit/miss", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "postpost-ai-cache-"));
    const events: string[] = [];
    try {
      const cache = new FileInterpretationCache(directory, (event) => events.push(event.cache));
      expect(await cache.get("stable-key")).toBeUndefined();
      await cache.set("stable-key", result);
      expect(await cache.get("stable-key")).toEqual(result);
      expect(JSON.parse(await readFile(path.join(directory, "stable-key.json"), "utf8"))).toEqual(result);
      expect(events).toEqual(["miss", "set", "hit"]);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("treats a corrupt entry as a miss without failing analysis", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "postpost-ai-cache-corrupt-"));
    try {
      await writeFile(path.join(directory, "corrupt-key.json"), "{not-json", "utf8");
      const cache = new FileInterpretationCache(directory);
      await expect(cache.get("corrupt-key")).resolves.toBeUndefined();
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
