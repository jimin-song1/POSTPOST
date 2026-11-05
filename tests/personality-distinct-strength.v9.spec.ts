import {describe,it,expect} from 'vitest';
import {selectPersonalityInterpretations,createPersonalityWritingBrief} from '../src/lib/saju/ai-interpretation/personality-editorial.v1';
import {canonicalBehaviorCandidates,behavioralOverlap,verifyGeneratedBehaviorContract} from '../src/lib/saju/ai-interpretation/personality-claim-guard.v1';
import {generateConditionalBehaviorCandidates} from '../src/lib/saju/ai-interpretation/personality-behavior.v2';
import type {SajuAnalysis} from '../src/types/saju-analysis';
import sampleJson from '../samples/SYNTHETIC_CORE_001.json';

const sample=sampleJson.response as unknown as SajuAnalysis;
const plan=selectPersonalityInterpretations(sample);
const get=(id:string)=>plan.sections.find(s=>s.sectionId===`P01-${id}`)?.selected;

describe('V9 selected strengths must not repeat the choice chapter',()=>{
  it('keeps an actual, different scene in the two sections',()=>{
    const choice=get('05')!,strength=get('09')!;
    expect(choice).toBeTruthy();expect(strength).toBeTruthy();
    expect(choice.behaviorHypothesis?.observableBehavior).toContain('선택');
    expect(strength.behaviorHypothesis?.scenarioRuleId).toMatch(/^P01-09:/);
    expect(strength.behaviorHypothesis?.semanticFamilyPairKey?.split('|')).toContain('output');
    expect(strength.behaviorHypothesis?.observableBehavior).toMatch(/완성|마무리|결과|수행|만들/);
    expect(behavioralOverlap(choice,strength).nearDuplicate).toBe(false);
  });
  it('still detects the original duplicate candidate',()=>{
    const candidates=canonicalBehaviorCandidates(sample);
    expect(behavioralOverlap(candidates.get('V56-B2-P01-05-dayBranch-hourStem')!,candidates.get('V56-B2-P01-09-monthBranch-dayBranch')!).nearDuplicate).toBe(true);
  });
  it('carries the selected strength into the chapter 10 writing context',()=>{
    const brief=createPersonalityWritingBrief(plan);
    const linked=brief.sections.find(s=>s.id==='P01-10')?.primary?.linkedStrengthContext;
    expect(get('10')?.behaviorHypothesis?.linkedStrengthCandidateId).toBe(get('09')?.id);
    expect(linked?.candidateId).toBe(get('09')?.id);
    expect(linked?.behavior).toBe(get('09')?.behaviorHypothesis?.observableBehavior);
  });
  it('never rewrites the claimed behavior under reused source IDs',()=>{
    const canonical=canonicalBehaviorCandidates(sample);
    for(const section of plan.sections)expect(verifyGeneratedBehaviorContract(sample,section.selected!,canonical)).toBe(true);
    const tampered={...get('09')!,behaviorHypothesis:{...get('09')!.behaviorHypothesis!,observableBehavior:'남의 생각과 거짓말을 단번에 읽는 능력'}};
    expect(verifyGeneratedBehaviorContract(sample,tampered,canonical)).toBe(false);
  });
  it('does not fabricate an output-based strength if all output signals are absent',()=>{
    // Synthetic rule test only, not an independently recalculated natal chart.
    const mock=structuredClone(sample);
    for(const p of ['year','month','day','hour'] as const){
      const stem=mock.tenGods.value?.heavenlyStems[p];
      if(stem && ['식신','상관'].includes(stem.korean))stem.korean='정인';
      for(const v of mock.tenGods.value?.hiddenStems[p] ?? []){
        if(['식신','상관'].includes(v.tenGod.korean))v.tenGod.korean='정인';
      }
    }
    const candidates=generateConditionalBehaviorCandidates(mock);
    expect(candidates.filter(c=>c.sectionId==='P01-09'&&c.behaviorHypothesis?.semanticFamilyPairKey?.split('|').includes('output'))).toHaveLength(0);
    const revised=selectPersonalityInterpretations(mock);
    const choice=revised.sections.find(s=>s.sectionId==='P01-05')?.selected;
    const strength=revised.sections.find(s=>s.sectionId==='P01-09')?.selected;
    if(choice?.behaviorHypothesis && strength?.behaviorHypothesis)expect(behavioralOverlap(choice,strength).nearDuplicate).toBe(false);
  });
});
