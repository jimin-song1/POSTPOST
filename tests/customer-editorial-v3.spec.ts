import {describe,it,expect} from "vitest";
import {customerTechnicalTermHits} from "@/rules/customer-terminology.v1";
import {LIFETIME_REPORT_SYSTEM_ADDENDUM} from "@/lib/saju/ai-interpretation/prompt";
describe('V5.6 editorial contract',()=>{
 it('keeps requested technical titles while requiring plain prose',()=>{expect(customerTechnicalTermHits('일주일 동안 기록해 봅니다.')).toEqual([]);expect(customerTechnicalTermHits('천간과 지지의 관계')).toContain('천간');expect(LIFETIME_REPORT_SYSTEM_ADDENDUM).toContain('생활 한국어');});
 it('locks child gating and six calendar years in the generation prompt',()=>{expect(LIFETIME_REPORT_SYSTEM_ADDENDUM).toContain('SINGLE/DATING');expect(LIFETIME_REPORT_SYSTEM_ADDENDUM).toContain('6개 세운');expect(LIFETIME_REPORT_SYSTEM_ADDENDUM).toContain('임의의 소제목을 추가하지 마라');});
});
