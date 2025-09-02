import { getSupabase } from "./supabaseClient.js";
import { TABLES } from "../config/supabase.js";

// Envuelve autenticación básica usando tabla users (no usa supabase.auth email, solo username + hash simple)
export class SupabaseAuthService {
  constructor(){ this.sb = getSupabase(); }
  ensure(){ if(!this.sb) { this.sb = getSupabase(); if(this.sb) console.log('[SupabaseAuth] cliente obtenido tardío'); } return this.sb; }
  available(){ return !!this.ensure(); }

  async hash(text){
    const enc = new TextEncoder().encode(text||"");
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  norm(u){ return String(u||"").trim().replace(/\s+/g," ").slice(0,24); }

  async register({ nombre, password, contacto }){
  if(!this.available()) return { ok:false, error:"Supabase no configurado (no client)" };
    const username = this.norm(nombre);
    if(username.length<3) return { ok:false, error:"Nombre corto" };
    const pass_hash = await this.hash(password||"");
    // comprobar duplicado
  console.log('[SupabaseAuth] register intento', username);
  const { data:exists, error:errExists } = await this.sb.from(TABLES.users).select("id").eq("username", username).maybeSingle();
    if(errExists){ console.warn(errExists); return { ok:false, error:"Error lectura" }; }
    if(exists) return { ok:false, error:"Ya existe" };
  const { data, error } = await this.sb.from(TABLES.users).insert({ username, contact:contacto||"", pass_hash }).select("id,username,contact,avatar_url,character").single();
    if(error){
      // Detectar falta de política INSERT (RLS)
      if(/permission denied/i.test(error.message) || error.code==='42501'){
        return { ok:false, error:"RLS bloquea INSERT. Agrega política: CREATE POLICY users_insert ON public.users FOR INSERT WITH CHECK (true);" };
      }
      return { ok:false, error:error.message };
    }
  const user = { id:data.id, nombre:data.username, contacto:data.contact, pass_hash, avatar_url:data.avatar_url||null, character:data.character||null };
    localStorage.setItem("hoho3d_user", JSON.stringify(user));
    return { ok:true, user };
  }

  async login({ nombre, password }){
  if(!this.available()) return { ok:false, error:"Supabase no configurado (no client)" };
    const username = this.norm(nombre);
    const pass_hash = await this.hash(password||"");
  console.log('[SupabaseAuth] login intento', username);
  const { data, error } = await this.sb.from(TABLES.users).select("id,username,contact,pass_hash,avatar_url,character").eq("username", username).maybeSingle();
    if(error) return { ok:false, error:error.message };
    if(!data || data.pass_hash !== pass_hash) return { ok:false, error:"Credenciales" };
  const user = { id:data.id, nombre:data.username, contacto:data.contact, pass_hash, avatar_url:data.avatar_url||null, character:data.character||null };
    localStorage.setItem("hoho3d_user", JSON.stringify(user));
    return { ok:true, user };
  }

  getSession(){
    try { return JSON.parse(localStorage.getItem("hoho3d_user")||"null"); } catch { return null; }
  }
  logout(){ localStorage.removeItem("hoho3d_user"); }
}

export default SupabaseAuthService;
