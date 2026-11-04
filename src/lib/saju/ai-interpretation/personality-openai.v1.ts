import type { PersonalityWritingProvider, PersonalityWritingRequest } from "./personality-generation.v1";

export interface PersonalityOpenAIConfig {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}
/** Optional OpenAI Responses API adapter for an isolated, review-only V5.6 draft. */
export class OpenAIPersonalityWriter implements PersonalityWritingProvider {
  constructor(private readonly config: PersonalityOpenAIConfig) {}
  async generate(request: PersonalityWritingRequest): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 60000);
    try {
      const response = await (this.config.fetchImpl ?? fetch)(
        (this.config.baseUrl ?? "https://api.openai.com/v1") + "/responses",
        {
          method: "POST", signal: controller.signal,
          headers: {Authorization: "Bearer " + this.config.apiKey, "Content-Type": "application/json"},
          body: JSON.stringify({
            model: this.config.model, store: false,
            instructions: request.systemPrompt + (request.repair ?
              "\n이전 JSON이 검증에 실패했습니다. 다음 오류를 해결하되 엔진 근거를 수정하거나 추가하지 마세요: " + request.repair.errors.join("; ") : ""),
            input: JSON.stringify({brief: request.brief,evidence: request.evidence,
              ...(request.repair ? {previousOutput:request.repair.previousOutput} : {})}),
            text: {format:{type:"json_schema",name:"personality_v56_draft",strict:true,schema:request.schema}},
          }),
        },
      );
      if (!response.ok) throw new Error("V5.6 AI provider HTTP " + response.status);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object") throw new Error("Invalid AI response");
      const parsed=payload as {output_text?:unknown;output?:Array<{content?:Array<{text?:unknown}>}>};
      const outputText = typeof parsed.output_text === "string" ? parsed.output_text :
        parsed.output?.flatMap(item=>item.content??[]).map(part=>part.text).find(text=>typeof text==="string");
      if (typeof outputText!=="string") throw new Error("AI returned no text");
      try {return JSON.parse(outputText) as unknown;} catch {return outputText;}
    } finally {clearTimeout(timer);}
  }
}
