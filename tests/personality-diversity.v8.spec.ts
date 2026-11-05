import {describe,it,expect} from 'vitest';
import {selectPersonalityInterpretations,createPersonalityWritingBrief} from '../src/lib/saju/ai-interpretation/personality-editorial.v1';
import {behavioralOverlap,canonicalBehaviorCandidates,verifyGeneratedBehaviorContract} from '../src/lib/saju/ai-interpretation/personality-claim-guard.v1';
import type {SajuAnalysis} from '../src/types/saju-analysis';
import sampleJson from '../samples/SYNTHETIC_CORE_001.json';

const analysis=sampleJson.response as unknown as SajuAnalysis;

describe('V8 conditional behavioral scene differentiation',()=>{
  const plan=selectPersonalityInterpretations(analysis);
  const pick=(index:string)=>plan.sections.find(s=>s.sectionId===`P01-${index}`)?.selected;
  it('maintains 10 traceable behavior hypotheses',()=>{
    expect(plan.sections).toHaveLength(10);
    expect(plan.sections.every(s=>s.selected?.behaviorHypothesis)).toBe(true);
  });
  it('separates initial approach and joint agreement as different actions',()=>{
    const start=pick('01')!;const joint=pick('07')!;
    expect(start.behaviorHypothesis?.scenarioRuleId).toMatch(/^P01-01:baseline:/);
    expect(joint.behaviorHypothesis?.scenarioRuleId).toMatch(/^P01-07:cooperation:/);
    expect(joint.behaviorHypothesis?.observableBehavior).toContain('합의');
    expect(behavioralOverlap(start,joint).nearDuplicate).toBe(false);
  });
  it('separates joint responsibility from the evidence-backed strength',()=>{
    expect(pick('09')?.behaviorHypothesis?.scenarioRuleId).toMatch(/^P01-09:/);
    expect(behavioralOverlap(pick('07')!,pick('09')!).nearDuplicate).toBe(false);
  });
  it('keeps the original 05/09 overlap detectable without selecting it',()=>{
    const canonical=canonicalBehaviorCandidates(analysis);
    const old05=canonical.get('V56-B2-P01-05-dayBranch-hourStem')!;
    const old09=canonical.get('V56-B2-P01-09-monthBranch-dayBranch')!;
    expect(behavioralOverlap(old05,old09).nearDuplicate).toBe(true);
    expect(behavioralOverlap(pick('05')!,pick('09')!).nearDuplicate).toBe(false);
  });
  it('does not change the generated canonical behavior text while editing',()=>{
    const canonical=canonicalBehaviorCandidates(analysis);
    expect(plan.sections.every(s=>s.selected && verifyGeneratedBehaviorContract(analysis,s.selected,canonical))).toBe(true);
  });
  it('links 10 to validated 09 rather than inventing a new weakness',()=>{
    expect(pick('10')?.behaviorHypothesis?.linkedStrengthCandidateId).toEqual(pick('09')?.id);
  });
  it('keeps downstream writing scenes and their conditions',()=>{
    const brief=createPersonalityWritingBrief(plan);
    for(const id of ['01','07','09']){
      const b=brief.sections.find(s=>s.id===`P01-${id}`)?.primary?.behaviorHypothesis;
      expect(b).toEqual(pick(id)?.behaviorHypothesis);
    }
  });
});
