import { USERS_CSV_URL, USERS_FORM_URL, USERS_FORM_FIELDS, LS_USER_KEY } from "../config/gsheets.js";

// Fallback local (para cuando el Google Form todavía no está configurado)
const LS_LOCAL_USERS = "hoho3d_local_users"; // array [{nombre,password_hash,contacto}]
function loadLocalUsers(){
  try { return JSON.parse(localStorage.getItem(LS_LOCAL_USERS)||"[]"); } catch { return []; }
}
function saveLocalUsers(arr){ try { localStorage.setItem(LS_LOCAL_USERS, JSON.stringify(arr)); } catch {} }
function formIsReady(){
  if(!USERS_FORM_URL.includes('/formResponse')) return false;
  if(/X{4,}/i.test(USERS_FORM_URL)) return false;
  const placeholders = ['1111111111','2222222222','3333333333'];
  return !Object.values(USERS_FORM_FIELDS).some(v=> placeholders.some(p=> v.includes(p)));
}

// SHA-256 hash (mejor que texto plano; OJO: visible públicamente en el CSV)
export async function sha256(text){
  const enc = new TextEncoder().encode(text || "");
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

// Parser CSV robusto (comillas + comas)
export function parseCSV(text){
  const rows=[]; let row=[], cell="", inQ=false;
  for (let i=0;i<text.length;i++){
    const ch=text[i], nx=text[i+1];
    if(ch==='"' && nx==='"'){ cell+='"'; i++; continue; }
    if(ch==='"'){ inQ=!inQ; continue; }
    if(!inQ && ch===','){ row.push(cell); cell=""; continue; }
    if(!inQ && (ch==='\n' || ch==='\r')){ if(cell!==""||row.length){ row.push(cell); rows.push(row); row=[]; cell=""; } continue; }
    cell+=ch;
  }
  if(cell!==""||row.length){ row.push(cell); rows.push(row); }
  return rows;
}

export function normName(n){ return String(n||"").trim().replace(/\s+/g," ").slice(0,24); }

let _usersCache=null, _usersAt=0;
export async function fetchUsers(force=false){
  const now=Date.now();
  if(!force && _usersCache && now - _usersAt < 30000) return _usersCache;
  const txt = await fetch(USERS_CSV_URL, { cache: "no-store" }).then(r=>r.text());
  const rows = parseCSV(txt);
  if(!rows.length) return [];
  const head = rows.shift().map(h=>h.toLowerCase());
  const iNombre = head.findIndex(h=>/nombre/.test(h));
  const iHash = head.findIndex(h=>/password_hash|hash/.test(h));
  const iContacto = head.findIndex(h=>/contacto/.test(h));
  const out = rows.map(r=>({
    nombre: normName(r[iNombre]||""),
    password_hash: String(r[iHash]||""),
    contacto: r[iContacto]||""
  })).filter(u=>u.nombre);
  // Mezclar usuarios locales (solo visibles en este navegador) para pruebas sin backend
  const locals = loadLocalUsers();
  const merged = [...out];
  locals.forEach(l=> { if(!merged.some(u=> u.nombre.toLowerCase()===l.nombre.toLowerCase())) merged.push(l); });
  _usersCache = merged; _usersAt = now; return merged;
}

// POST al Form (no-cors)
export async function postForm(url, fields){
  const fd = new FormData();
  Object.entries(fields).forEach(([k,v])=> fd.append(k, v));
  await fetch(url, { method:"POST", mode:"no-cors", body:fd });
}

export async function register({ nombre, password, contacto="" }){
  const clean=normName(nombre);
  if(!clean || clean.length<3) return { ok:false, error:"Nombre inválido" };
  const users=await fetchUsers();
  if(users.some(u=>u.nombre.toLowerCase()===clean.toLowerCase()))
    return { ok:false, error:"Ese nombre ya existe" };
  const hash = await sha256(password||"");
  if(formIsReady()){
    await postForm(USERS_FORM_URL, {
      [USERS_FORM_FIELDS.nombre]: clean,
      [USERS_FORM_FIELDS.password_hash]: hash,
      [USERS_FORM_FIELDS.contacto]: contacto
    });
  } else {
    // Guardar localmente (modo demo)
    const locals = loadLocalUsers();
    locals.push({ nombre:clean, password_hash:hash, contacto });
    saveLocalUsers(locals);
  }
  const user={ nombre:clean, password_hash:hash, contacto };
  localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
  return { ok:true, user };
}

export async function login({ nombre, password }){
  const clean=normName(nombre);
  const hash=await sha256(password||"");
  const users=await fetchUsers();
  const found=users.find(u=>u.nombre.toLowerCase()===clean.toLowerCase() && u.password_hash===hash);
  if(!found) return { ok:false, error:"Credenciales inválidas" };
  const user={ nombre:found.nombre, password_hash:hash, contacto:found.contacto };
  localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
  return { ok:true, user };
}

export function getSession(){ try{ return JSON.parse(localStorage.getItem(LS_USER_KEY)||"null"); }catch{ return null; } }
export function logout(){ localStorage.removeItem(LS_USER_KEY); }
