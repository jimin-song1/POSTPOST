export const USEFUL_GODS_V1 = {
  status: "not_implemented",
  weights: { eokbu: 30, gyeokguk: 25, johu: 20, byeongyak: 15, tonggwan: 10 },
  evaluators: ["억부용신", "조후용신", "통관용신", "병약용신", "격국용신", "종격"],
  principle: "각 evaluator를 독립 계산한 뒤 종합하며 AI는 결정에 관여하지 않는다.",
  todo: "조후 120개 표 및 각 evaluator 구현"
} as const;
