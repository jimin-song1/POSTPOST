export interface MockInterpretationEnvironment {
  DEV_MOCK_INTERPRETATION?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
}

export function isMockInterpretationEnabled(environment:MockInterpretationEnvironment=process.env){
  if(environment.DEV_MOCK_INTERPRETATION!=="true")return false;
  if(environment.VERCEL_ENV==="production")return false;
  if(environment.VERCEL_ENV==="preview")return true;
  if(environment.NODE_ENV==="production")return false;
  return true;
}
