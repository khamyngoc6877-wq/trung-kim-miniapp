import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type Member = { id:string; name:string; phone:string; email?:string; address?:string; passwordHash:string; points:number; registeredAt:string; pointsExpireAt:string; rewardedOrderIds:string[] };
type MemberDb = Record<string,Member>;
const filePath=path.resolve(process.env.MEMBER_STORE_FILE||"./data/members.json");
let queue:Promise<unknown>=Promise.resolve();
async function readDb():Promise<MemberDb>{try{const x=JSON.parse(await fs.readFile(filePath,"utf8")||"{}");return x&&typeof x==="object"&&!Array.isArray(x)?x:{};}catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return {};throw e;}}
async function writeDb(db:MemberDb){await fs.mkdir(path.dirname(filePath),{recursive:true});const t=`${filePath}.tmp`;await fs.writeFile(t,JSON.stringify(db,null,2),"utf8");await fs.rename(t,filePath);}
function mutate<T>(fn:(db:MemberDb)=>T|Promise<T>):Promise<T>{const n=queue.then(async()=>{const db=await readDb();const r=await fn(db);await writeDb(db);return r;});queue=n.catch(()=>undefined);return n;}
function hash(p:string){return crypto.createHash("sha256").update(p).digest("hex");}
function safe(m:Member){const {passwordHash,rewardedOrderIds,...x}=m;return x;}
export async function registerMember(i:{name:string;phone:string;email?:string;address?:string;password:string}){return mutate(db=>{const phone=i.phone.replace(/\s+/g,"").trim();if(Object.values(db).some(m=>m.phone===phone))throw new Error("Số điện thoại đã đăng ký");const now=new Date(),exp=new Date(now);exp.setFullYear(exp.getFullYear()+1);const m:Member={id:crypto.randomUUID(),name:i.name.trim(),phone,email:i.email?.trim(),address:i.address?.trim(),passwordHash:hash(i.password),points:0,registeredAt:now.toISOString(),pointsExpireAt:exp.toISOString(),rewardedOrderIds:[]};db[m.id]=m;return safe(m);});}
export async function loginMember(phone:string,password:string){const db=await readDb();const p=phone.replace(/\s+/g,"").trim();const m=Object.values(db).find(x=>x.phone===p&&x.passwordHash===hash(password));return m?safe(m):null;}
export async function getMember(id:string){const m=(await readDb())[id];return m?safe(m):null;}
export async function addOrderPoints(memberId:string,orderId:string,subtotal:number){return mutate(db=>{const m=db[memberId];if(!m)return null;if(m.rewardedOrderIds.includes(orderId))return {...safe(m),earnedPoints:0};const earned=Math.floor(Math.max(0,subtotal)/10000);m.points+=earned;m.rewardedOrderIds.push(orderId);return {...safe(m),earnedPoints:earned};});}
