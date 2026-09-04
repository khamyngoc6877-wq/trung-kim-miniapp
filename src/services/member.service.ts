import CONFIG from "@/config";
import type {UserInfo} from "@/types";
const API=String(import.meta.env.VITE_API_URL??"").replace(/\/$/,"");
async function request(path:string,init?:RequestInit){const r=await fetch(`${API}${path}`,{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message??"Có lỗi xảy ra");return d;}
function save(m:UserInfo){localStorage.setItem(CONFIG.STORAGE_KEYS.USER_INFO,JSON.stringify(m));return m;}
export async function registerMember(input:{name:string;phone:string;email?:string;address?:string;password:string}){return save(await request("/api/members/register",{method:"POST",body:JSON.stringify(input)}));}
export async function loginMember(phone:string,password:string){return save(await request("/api/members/login",{method:"POST",body:JSON.stringify({phone,password})}));}
export async function refreshMember(){const raw=localStorage.getItem(CONFIG.STORAGE_KEYS.USER_INFO);if(!raw)return null;const old=JSON.parse(raw);if(!old?.id)return null;return save(await request(`/api/members/${encodeURIComponent(old.id)}`));}
