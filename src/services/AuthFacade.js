// Unifica gsheets (fallback) y supabase según configuración
import { supabaseConfigured } from "../config/supabase.js";
import { login as gsLogin, register as gsRegister, getSession as gsGet, logout as gsLogout } from "./gsheetsAuth.js";
import SupabaseAuthService from "./SupabaseAuthService.js";

let supa = new SupabaseAuthService();
function refresh(){ if(!supa.available()) supa = new SupabaseAuthService(); return supa; }

export function authBackendName(){
  refresh();
  return (supabaseConfigured() && supa.available())? "supabase" : "fallback";
}

export async function authRegister(data){
  const backend = authBackendName();
  console.log("[AuthFacade] register attempt backend=", backend, data?.nombre);
  if(backend === 'supabase') return refresh().register(data);
  return gsRegister(data);
}
export async function authLogin(data){
  const backend = authBackendName();
  console.log("[AuthFacade] login attempt backend=", backend, data?.nombre);
  if(backend === 'supabase') return refresh().login(data);
  return gsLogin(data);
}
export function authGetSession(){
  if(authBackendName()==='supabase') return refresh().getSession();
  return gsGet();
}
export function authLogout(){
  if(authBackendName()==='supabase') return refresh().logout();
  return gsLogout();
}
