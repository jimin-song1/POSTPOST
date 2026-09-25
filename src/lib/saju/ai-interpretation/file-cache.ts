import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { InterpretationSuccess } from "@/types/ai-interpretation";
import type { InterpretationCache } from "./cache";

/** Small persistent v1 backend. Atomic files keep the M17 cache key unchanged. */
export class FileInterpretationCache implements InterpretationCache {
  constructor(private readonly directory = process.env.AI_INTERPRETATION_CACHE_DIR ?? path.join(process.cwd(), ".cache", "interpretations"),
    private readonly logger?: (event: { cache: "hit" | "miss" | "set"; cacheKey: string }) => void) {}
  private file(key: string) { return path.join(this.directory, `${key}.json`); }
  async get(key: string) {
    try { const value = JSON.parse(await readFile(this.file(key), "utf8")) as InterpretationSuccess; this.logger?.({ cache: "hit", cacheKey: key }); return value; }
    catch { this.logger?.({ cache: "miss", cacheKey: key }); return undefined; }
  }
  async set(key: string, value: InterpretationSuccess) {
    await mkdir(this.directory, { recursive: true });
    const destination = this.file(key), temporary = `${destination}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(value), { encoding: "utf8", mode: 0o600 });
    await rename(temporary, destination);
    this.logger?.({ cache: "set", cacheKey: key });
  }
}
