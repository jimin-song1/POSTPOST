const BOOK_PART_TITLES:Record<string,string>={
  "01":"나는 어떤 사람인가",
  "02":"나를 이루는 여덟 글자",
  "03":"내 안에는 여러 모습이 있다",
  "04":"나는 어떤 일을 하며 살아갈까",
  "05":"돈과는 어떤 인연일까",
  "06":"사랑하고 함께 살아가는 일",
  "07":"가족이라는 이름 안에서",
  "08":"살면서 만나게 되는 사람들",
  "09":"몸과 마음의 기운",
  "10":"내 사주에서 눈여겨볼 것들",
  "11":"열 해마다 달라지는 인생의 운",
  "12":"앞으로 다섯 해는 어떨까",
  "13":"인생의 방향이 바뀌는 때",
  "14":"긴 사주 이야기를 마치며"
};
const BOOK_PART_SUBTITLES:Record<string,string>={
  "01":"남들이 보는 나와 내가 아는 나",
  "02":"태어날 때부터 가지고 온 기운의 모습",
  "03":"십성으로 더 깊이 들여다보는 성격",
  "04":"재능과 직업, 공부와 성공의 방식",
  "05":"돈을 버는 방식과 재물을 지키는 힘",
  "06":"연애, 배우자와 결혼생활의 모습",
  "07":"가족과 자녀로 이어지는 인연",
  "08":"인연과 귀인, 나를 돕는 사람들",
  "09":"건강과 휴식, 일상의 균형",
  "10":"신살과 십이운성에 담긴 이야기",
  "11":"대운으로 돌아보는 지나온 삶과 앞으로의 세월",
  "12":"해마다 달라지는 일·돈·사람의 흐름",
  "13":"변화운과 삼재, 흔들림 속에서 살펴볼 것들",
  "14":"한 사람의 사주에서 오래 기억할 이야기"
};
const customerSectionTitle=(_id:string,fallback:string)=>fallback;
const customerPartTitle=(partNumber:string,fallback:string)=>BOOK_PART_TITLES[partNumber]??fallback;
const ordinalDaeun=(index:number)=>["첫","두 번째","세 번째","네 번째","다섯 번째","여섯 번째","일곱 번째","여덟 번째","아홉 번째","열 번째"][index]??`${index+1}번째`;
const daeunAgeLabel=(analysis:SajuAnalysis,index:number)=>{
  const period=analysis.daeun.periods[index];
  if(!period)return null;
  const start=Math.max(0,Math.floor(period.startAgeYears));
  const end=Math.max(start,Math.floor(period.endAgeYears));
  return `${start}~${end}세`;
};

const displaySectionTitle=(section:{id:string;title:string;evidenceGroup?:string},analysis:SajuAnalysis)=>{
  const group=section.evidenceGroup??"";
  const match=group.match(/^DAEUN_(\d+)$/);
  if(!match)return section.title;
  const index=Number(match[1])-1;
  const age=daeunAgeLabel(analysis,index);
  if(!age)return section.title;