import type { Branch, Element, Stem } from "@/types/saju-analysis";

export type JohuUrgency = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type JohuStemRole = "PRIMARY" | "SECONDARY" | "SUPPORTING" | "OPTIONAL" | "AVOID";
export interface JohuCondition {
  id: string;
  if: { branchFormation?: "WOOD_GROUP"; visibleCompanion?: true };
  priorityOverride?: Stem[];
  scoreDeltas?: Partial<Record<Stem, number>>;
  sourceNote: string;
}
export interface JohuBlocker {
  id: string;
  if: { adjustedElement: Element; percentageAtLeast: number };
  targetStems: Stem[];
  sourceNote: string;
}
export interface JohuRuleCell {
  dayStem: Stem;
  monthBranch: Branch;
  priorities: Array<{ stem: Stem; rank: number; role: JohuStemRole }>;
  conditions: JohuCondition[];
  blockers: JohuBlocker[];
  climateTags: string[];
  urgency: JohuUrgency;
  source: { tradition: "QIONG_TONG_BAO_JIAN"; section: string;
    sourceNote: string; curationVersion: "johu-qiongtong-v1" };
  curationNote?: string;
}

const branches = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"] as const;
const monthNames = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"] as const;
const priorityStems: Record<Stem, readonly string[]> = {
  甲: ["丙癸", "庚丁丙", "庚壬丁", "癸丁庚", "癸丁庚", "丁庚癸", "丁庚", "丁丙庚", "丁癸庚", "庚丁丙戊", "丁庚丙", "庚丁"],
  乙: ["丙癸", "丙癸", "癸丙", "癸丙辛", "癸丙", "癸丙", "丙癸己", "癸丙", "癸辛", "丙戊", "丙", "丙"],
  丙: ["壬庚", "壬己", "壬甲", "壬庚癸", "壬庚", "壬庚", "壬戊", "壬癸", "甲壬", "甲戊庚壬", "壬戊己", "壬甲"],
  丁: ["庚甲", "庚甲", "甲庚", "甲庚", "壬庚癸", "甲壬庚", "甲庚丙", "甲庚丙", "甲庚", "甲庚", "甲庚丙", "甲庚"],
  戊: ["丙甲癸", "丙甲癸", "甲丙癸", "甲丙癸", "壬甲丙", "癸丙甲", "丙癸甲", "丙癸", "甲丙癸", "甲丙", "丙甲", "丙甲"],
  己: ["丙甲庚", "甲癸丙", "丙癸甲", "癸丙", "癸丙", "癸丙", "丙癸", "癸丙", "甲癸丙", "丙甲戊", "丙甲", "丙甲"],
  庚: ["戊甲丙壬丁", "丁甲庚丙", "甲丁壬癸", "壬戊丙丁", "壬癸", "丁甲", "丁甲", "丁丙", "甲壬", "丁丙甲", "丁甲丙", "丙丁甲"],
  辛: ["己壬庚", "壬甲", "壬甲", "壬甲癸", "壬己癸", "壬庚甲", "壬甲戊", "壬甲", "壬甲", "壬丙", "丙壬戊甲", "丙壬戊己"],
  壬: ["庚丙戊", "戊辛庚", "甲庚", "壬辛庚癸", "癸庚辛", "辛甲", "戊丁", "甲庚", "甲丙", "戊庚", "戊丙", "丙甲丁"],
  癸: ["辛丙庚", "庚辛", "丙辛甲", "辛庚", "庚辛壬", "庚辛壬", "丁", "辛丙", "辛甲癸", "庚辛戊丁", "丙辛", "丙丁"],
};
const urgencyRows: Record<Stem, readonly JohuUrgency[]> = {
  甲: ["HIGH","MEDIUM","MEDIUM","HIGH","CRITICAL","HIGH","MEDIUM","MEDIUM","HIGH","HIGH","CRITICAL","CRITICAL"],
  乙: ["HIGH","MEDIUM","MEDIUM","HIGH","CRITICAL","HIGH","MEDIUM","MEDIUM","HIGH","HIGH","CRITICAL","CRITICAL"],
  丙: ["MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","HIGH","MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","CRITICAL"],
  丁: ["MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","HIGH","MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","CRITICAL"],
  戊: ["HIGH","MEDIUM","MEDIUM","HIGH","CRITICAL","HIGH","MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","CRITICAL"],
  己: ["HIGH","MEDIUM","MEDIUM","HIGH","CRITICAL","HIGH","MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","CRITICAL"],
  庚: ["MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","HIGH","MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","CRITICAL"],
  辛: ["MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","HIGH","MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","CRITICAL"],
  壬: ["MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","HIGH","MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","CRITICAL"],
  癸: ["MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","HIGH","MEDIUM","MEDIUM","MEDIUM","HIGH","CRITICAL","CRITICAL"],
};
const ambiguousKeys = new Set(["甲午","甲未","丙亥","庚寅","庚卯","庚辰","庚巳","辛子","辛丑","壬巳","癸亥"]);
const role = (rank: number): JohuStemRole => rank === 1 ? "PRIMARY" : rank === 2 ? "SECONDARY" :
  rank === 3 ? "SUPPORTING" : "OPTIONAL";
const stemLabel: Record<Stem, string> = { 甲:"甲木",乙:"乙木",丙:"丙火",丁:"丁火",戊:"戊土",
  己:"己土",庚:"庚金",辛:"辛金",壬:"壬水",癸:"癸水" };
const tags = (branch: Branch) => branch === "寅" || branch === "卯" || branch === "辰" ? ["SPRING"] :
  branch === "巳" || branch === "午" || branch === "未" ? ["SUMMER"] :
  branch === "申" || branch === "酉" || branch === "戌" ? ["AUTUMN"] : ["WINTER"];

export const JOHU_QIONGTONG_V1 = {
  sourceVersion: "johu-qiongtong-v1",
  tradition: "QIONG_TONG_BAO_JIAN",
  sourceEdition: "Wikisource 窮通寶鑑/欄江網系全文, accessed 2026-09-24",
  cells: (Object.keys(priorityStems) as Stem[]).flatMap((dayStem) => branches.map((monthBranch, index): JohuRuleCell => {
    const key = `${dayStem}${monthBranch}`;
    const priorities = Array.from(priorityStems[dayStem][index]).map((stem, priorityIndex) => ({
      stem: stem as Stem, rank: priorityIndex + 1, role: role(priorityIndex + 1),
    }));
    return { dayStem, monthBranch, priorities,
      conditions: key === "甲酉" ? [{ id: "JIA_YOU_WOOD_GROUP_VISIBLE_COMPANION",
        if: { branchFormation: "WOOD_GROUP", visibleCompanion: true }, priorityOverride: ["庚", "丁"],
        sourceNote: "八月甲木 원문의 支成木局·干透比劫이면 庚을 먼저, 丁을 다음으로 쓴다는 조건" }] : [],
      blockers: key === "甲酉" ? [{ id: "JIA_YOU_EXCESS_WATER_CONSTRAINS_FIRE",
        if: { adjustedElement: "water", percentageAtLeast: 35 }, targetStems: ["丁", "丙"],
        sourceNote: "八月甲木 문맥의 癸水가 丁·丙을 제약한다는 조건을 과다 水 context로만 기록" }] : [],
      climateTags: [...tags(monthBranch), `${monthBranch}_MONTH`], urgency: urgencyRows[dayStem][index],
      source: { tradition: "QIONG_TONG_BAO_JIAN", section: `${monthNames[index]}${stemLabel[dayStem]}`,
        sourceNote: key === "甲丑"
          ? "十二月甲木 절의 庚 선행, 丁 차선 순서를 반영; 丙은 해당 절에서 별도 우선 천간으로 지정되지 않음"
          : `${monthNames[index]} ${dayStem} 일간 절에서 선후·전용·참작 표현만 보수적으로 추출`,
        curationVersion: "johu-qiongtong-v1" },
      ...(ambiguousKeys.has(key) ? { curationNote: "원문에 복수 조건·참작 용법이 있어 기본 순위만 정규화하고 세부 명식 단정은 보류" } : {}),
    };
  })),
} as const;

export const JOHU_USEFUL_GOD_V1 = {
  rulesetVersion: "johu-useful-god-v1",
  conditionRuleVersion: "johu-condition-v1",
  scoreByRole: { PRIMARY: 30, SECONDARY: 20, SUPPORTING: 10, OPTIONAL: 5, AVOID: -15 },
  aggregationWeights: [1, 0.5, 0.25, 0.125],
  canonicalStemOrder: ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"] as const,
  elementByStem: { 甲:"wood",乙:"wood",丙:"fire",丁:"fire",戊:"earth",己:"earth",
    庚:"metal",辛:"metal",壬:"water",癸:"water" } satisfies Record<Stem, Element>,
} as const;
