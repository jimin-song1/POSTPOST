import { describe, expect, it } from 'vitest';
import sample from '../samples/SYNTHETIC_CORE_001.json';
import { generateConditionalBehaviorCandidates } from '../src/lib/saju/ai-interpretation/personality-behavior.v2';
import { selectPersonalityInterpretations, createPersonalityWritingBrief } from '../src/lib/saju/ai-interpretation/personality-editorial.v1';
import { canonicalBehaviorCandidates, verifyGeneratedBehaviorContract } from '../src/lib/saju/ai-interpretation/personality-claim-guard.v1';
import type { SajuAnalysis } from '../src/types/saju-analysis';

const analysis=sample.response as unknown as SajuAnalysis;
describe('V5.6 P01-06 decision revision scene', () => {
  it('selects a traceable post-decision behavior without replacing P01-05', () => {
    const plan=selectPersonalityInterpretations(analysis);
    const initial=plan.sections[4].selected;
    const revision=plan.sections[5].selected;
    expect(plan.sections.every(s=>s.selected)).toBe(true);
    expect(initial?.behaviorHypothesis).toBeDefined();
    expect(revision?.behaviorHypothesis?.scenarioRuleId).toMatch(/^P01-06:revision:/);
    expect(revision?.behaviorHypothesis?.trigger).not.toBe(initial?.behaviorHypothesis?.trigger);
    expect(revision?.behaviorHypothesis?.possibleMotive).toBeNull();
    const brief=createPersonalityWritingBrief(plan);
    expect(brief.sections[5].primary?.behaviorHypothesis?.scenarioRuleId).toBe(revision?.behaviorHypothesis?.scenarioRuleId);
  });
  it('blocks post-generation tampering, even if natal source IDs match', () => {
    const selected=selectPersonalityInterpretations(analysis).sections[5].selected!;
    expect(verifyGeneratedBehaviorContract(analysis,selected,canonicalBehaviorCandidates(analysis))).toBe(true);
    const tampered={...selected,behaviorHypothesis:{...selected.behaviorHypothesis!,observableBehavior:'누구나 생각을 읽고 무조건 옳은 결정을 내린다'}};
    expect(verifyGeneratedBehaviorContract(analysis,tampered,canonicalBehaviorCandidates(analysis))).toBe(false);
  });
  it('does not generate a revision scene without revision evidence', () => {
    const changed=structuredClone(analysis);
    const revisions=new Set(['식신','상관','정인','편인']);
    for(const pos of ['year','month','day','hour'] as const){
      const stem=changed.tenGods.value?.heavenlyStems[pos];
      if(stem && revisions.has(stem.korean)) stem.korean='비견';
      for(const hidden of changed.tenGods.value?.hiddenStems[pos]??[]){
        if(revisions.has(hidden.tenGod.korean)) hidden.tenGod.korean='비견';
      }
    }
    expect(generateConditionalBehaviorCandidates(changed).filter(x=>x.sectionId==='P01-06')).toHaveLength(0);
  });
});
