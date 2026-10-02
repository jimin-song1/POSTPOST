import {describe,expect,it} from "vitest";
import {isMockInterpretationEnabled} from "@/lib/saju/ai-interpretation/mock-mode";

describe("mock interpretation environment policy",()=>{
  it("enables local development",()=>expect(isMockInterpretationEnabled({DEV_MOCK_INTERPRETATION:"true",NODE_ENV:"development"})).toBe(true));
  it("enables Vercel Preview even when NODE_ENV is production",()=>expect(isMockInterpretationEnabled({DEV_MOCK_INTERPRETATION:"true",NODE_ENV:"production",VERCEL_ENV:"preview"})).toBe(true));
  it("enables Vercel Preview without a separately configured flag",()=>expect(isMockInterpretationEnabled({NODE_ENV:"production",VERCEL_ENV:"preview"})).toBe(true));
  it("always disables Vercel Production",()=>expect(isMockInterpretationEnabled({DEV_MOCK_INTERPRETATION:"true",NODE_ENV:"production",VERCEL_ENV:"production"})).toBe(false));
  it("disables generic production outside Vercel",()=>expect(isMockInterpretationEnabled({DEV_MOCK_INTERPRETATION:"true",NODE_ENV:"production"})).toBe(false));
  it("disables mock when the flag is off",()=>expect(isMockInterpretationEnabled({DEV_MOCK_INTERPRETATION:"false",NODE_ENV:"development",VERCEL_ENV:"preview"})).toBe(false));
});
