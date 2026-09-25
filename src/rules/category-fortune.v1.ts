import type { TenGodCategory } from "./structure-useful-god.v1";
export type FlowMatrix=Record<TenGodCategory,number>;
const matrix=(companion:number,resource:number,output:number,wealth:number,officer:number):FlowMatrix=>
  ({companion,resource,output,wealth,officer});
export const CATEGORY_FORTUNE_V1={
  ruleVersion:"category-fortune-v1",scoreVersion:"category-score-v1",flowMatrixVersion:"category-flow-matrix-v1",
  wealthVersion:"wealth-category-v1",relationshipVersion:"relationship-category-v1",
  weights:{overallSupport:{favorability:.55,alignment:.45},categorySupport:{favorability:.45,alignment:.35,flowQuality:.20},
    categoryActivity:{activation:.70,flowActivity:.30},changeSupport:{favorability:.50,alignment:.50},
    expensePressure:{activation:.35,flowPressure:.30,inverseFavorability:.20,inverseAlignment:.15},
    expansionInvestment:{activation:.60,flowActivity:.40},wealthAggregate:{incomeOpportunity:.30,businessRevenue:.25,stableCashflow:.25,assetAccumulation:.20},
    relationshipAggregate:{opportunity:.40,stability:.35,formalizationSupport:.25}},
  matrices:{
    incomeOpportunity:matrix(-.35,0,.55,1,.15),businessRevenue:matrix(-.20,.15,.80,1,.25),
    stableCashflow:matrix(-.50,.35,0,.75,.55),assetAccumulation:matrix(-.70,.40,-.25,.80,.60),
    expensePressure:matrix(.80,-.20,.60,.30,.10),expansionInvestment:matrix(.30,.20,1,1,.20),
    business:matrix(-.15,.30,.85,.85,.35),career:matrix(0,.65,.15,.10,1),study:matrix(.10,1,.55,-.10,.35),
    relationship:{
      male:{opportunity:matrix(-.20,.20,.35,1,.40),stability:matrix(-.25,.45,0,.75,.65),formalizationSupport:matrix(-.20,.50,0,.65,.80)},
      female:{opportunity:matrix(-.20,.20,.35,.15,1),stability:matrix(-.25,.45,0,.25,.90),formalizationSupport:matrix(-.20,.50,0,.20,1)},
      generic:{opportunity:matrix(-.10,.20,.35,.50,.50),stability:matrix(-.15,.45,0,.55,.55),formalizationSupport:matrix(-.10,.50,0,.50,.70)},
    }
  }
} as const;
