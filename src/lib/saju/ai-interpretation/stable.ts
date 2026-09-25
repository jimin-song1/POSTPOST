import { createHash } from "node:crypto";

export function stableSerialize(value:unknown):string{
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return`[${value.map(stableSerialize).join(",")}]`;
  const object=value as Record<string,unknown>;
  return`{${Object.keys(object).sort().map(key=>`${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
}
export const sha256=(value:string)=>createHash("sha256").update(value).digest("hex");
