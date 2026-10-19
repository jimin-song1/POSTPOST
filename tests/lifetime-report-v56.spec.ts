import {describe,expect,it} from "vitest";
import {buildDynamicLifetimeBook} from "@/rules/lifetime-report.v4";

const expected=["PROLOGUE","PART01","PART02","PART03","PART04","PART05","PART06","PART07","PART08","PART09","PART10","SPECIAL","PART11","PART12","EPILOGUE"];

describe("lifetime report V5.6 table of contents",()=>{
  it("reuses the existing book sections under the V5.6 part order",()=>{
    const book=buildDynamicLifetimeBook({includeSamjae:true,year:2026,relationshipStatus:"SINGLE",childStatus:"NOT_APPLICABLE"});
    expect(book.parts.map(part=>part.partNumber)).toEqual(expected);
    expect(book.parts.map(part=>part.title)).toEqual(["사주원국","성격","직업운·학업운","직장운","사업운","재물운","연애운·결혼운","가족운","귀인운","건강운","사주 심층풀이","신살·삼재","연운","평생 대운","에필로그"]);
    expect(book.sections.some(section=>section.evidenceGroup==="CHILDREN")).toBe(false);
    expect(JSON.stringify(book)).not.toContain("임신과 출산을 앞두고");
    expect(JSON.stringify(book)).not.toContain("손주와의 인연");
  });

  it("branches PART07 copy for married customers without changing calculations",()=>{
    const withoutChildren=buildDynamicLifetimeBook({includeSamjae:true,year:2026,relationshipStatus:"MARRIED",childStatus:"NO_CHILDREN"});
    const withChildren=buildDynamicLifetimeBook({includeSamjae:true,year:2026,relationshipStatus:"MARRIED",childStatus:"HAS_CHILDREN"});
    expect(withoutChildren.parts.find(part=>part.partNumber==="PART07")?.title).toBe("가족운·자녀운");
    expect(withoutChildren.sections.map(section=>section.title)).toEqual(expect.arrayContaining(["자녀 인연","부모가 되었을 때의 모습","자녀와 관계 맺는 방식"]));
    expect(withChildren.sections.map(section=>section.title)).toEqual(expect.arrayContaining(["자녀와 나의 인연","부모로서의 모습","자녀와 의견이 다를 때","성장에 따른 관계 변화"]));
  });
});
