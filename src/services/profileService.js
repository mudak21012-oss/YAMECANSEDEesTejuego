// Supabase profile & scores service with simple 60s cache
import { getSupabase } from './supabaseClient.js';

const _cache = { profile: new Map(), scores: new Map() }; // key: userId -> {ts,data}
const TTL_MS = 60_000;

function now(){ return Date.now(); }
function getCached(bucket, key){
  const entry = _cache[bucket].get(key);
  if(!entry) return null;
  if(now() - entry.ts > TTL_MS){ _cache[bucket].delete(key); return null; }
  return entry.data;
}
function setCached(bucket, key, data){ _cache[bucket].set(key, { ts: now(), data }); }

export async function getProfile(userId){
  const cached = getCached('profile', userId);
  if(cached) return cached;
  const sb = getSupabase();
  if(!sb) throw new Error('Supabase no inicializado');
  // Esquema real: tabla users(id, username, pass_hash, contact, created_at)
  const { data, error } = await sb.from('users').select('id,username,avatar_url,character,created_at').eq('id', userId).maybeSingle();
  if(error){ throw error; }
  if(!data) throw new Error('Usuario no encontrado');
  const profile = {
    id: data.id,
    nombre: data.username, // adaptamos a campo usado por UI
    avatar_url: data.avatar_url || null,
    character: data.character || null,
    updated_at: data.created_at,
    _table: 'users'
  };
  setCached('profile', userId, profile);
  return profile;
}

export async function getLastScores(userId, limit=3){
  const cacheKey = userId+':'+limit;
  const cached = getCached('scores', cacheKey);
  if(cached) return cached;
  const sb = getSupabase();
  if(!sb) throw new Error('Supabase no inicializado');
  // Tabla real: scores(points, created_at)
  const { data, error } = await sb.from('scores')
    .select('points,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending:false })
    .limit(limit);
  if(error) throw error;
  const mapped = (data||[]).map(r=>({ puntos:r.points, fecha:r.created_at }));
  setCached('scores', cacheKey, mapped);
  return mapped;
}

function dataUrlToFile(dataUrl, filename){
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length; const u8 = new Uint8Array(n);
  while(n--) u8[n] = bstr.charCodeAt(n);
  return new File([u8], filename, { type: mime });
}

export async function uploadAvatar(userId, file){
  if(!file) throw new Error('Archivo vacío');
  if(!/image\/(png|jpe?g)/i.test(file.type)) throw new Error('Formato no soportado');
  if(file.size > 512*1024) throw new Error('Máx 512KB');
  console.time('uploadAvatar');
  console.log('[avatar] start', { userId, type:file.type, size:file.size });
  // Normalizar a cuadrado 256x256 PNG
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement('canvas'); canvas.width=size; canvas.height=size;
  const ctx = canvas.getContext('2d');
  // cover crop
  const ratio = Math.max(size/bitmap.width, size/bitmap.height);
  const dw = bitmap.width*ratio, dh = bitmap.height*ratio;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmap, (size-dw)/2, (size-dh)/2, dw, dh);
  const dataUrl = canvas.toDataURL('image/png');
  const pngFile = dataUrlToFile(dataUrl, 'avatar.png');
  const path = `user/${userId}.png`;
  const sb = getSupabase();
  if(!sb) throw new Error('Supabase no inicializado');
  // upsert
  const { error:upErr } = await sb.storage.from('avatars').upload(path, pngFile, { upsert:true, cacheControl:'3600', contentType:'image/png' });
  if(upErr){
    if(upErr.message && /Bucket not found/i.test(upErr.message)){
      throw new Error("Bucket 'avatars' no existe. Crea uno público llamado exactamente 'avatars' en Storage. SQL: select storage.create_bucket('avatars', public:=true);");
    }
    throw upErr;
  }
  console.log('[avatar] storage upload ok', path);
  const { data } = sb.storage.from('avatars').getPublicUrl(path);
  const stableUrl = data.publicUrl; // Guardamos versión estable SIN parámetro
  const displayUrl = stableUrl + `?t=${Date.now()}`; // Sólo para mostrar inmediatamente
  // Intentar actualizar users.avatar_url con URL estable
  const { data: updData, error: updErr } = await sb.from('users').update({ avatar_url: stableUrl }).eq('id', userId).select('id,avatar_url');
  if(updErr){
    if(updErr.code === '42703'){ throw new Error('Falta columna avatar_url en users. Ejecuta: ALTER TABLE public.users ADD COLUMN avatar_url text;'); }
    throw updErr;
  }
  if(!updData || updData.length===0){
    console.warn('[avatar] UPDATE por id no afectó filas. Intento fallback por username.');
    try {
      const raw = localStorage.getItem('hoho3d_user');
      if(raw){
        const ses = JSON.parse(raw);
        if(ses?.nombre){
          const { data: updByName, error: updErr2 } = await sb.from('users').update({ avatar_url: stableUrl }).eq('username', ses.nombre).select('id,avatar_url');
          if(updErr2){ console.warn('[avatar] Fallback username UPDATE error', updErr2); }
          else if(updByName?.length){ console.log('[avatar] Fallback username UPDATE ok', updByName); }
          else console.warn('[avatar] Fallback username tampoco afectó filas');
        }
      }
    } catch(e){ console.warn('[avatar] Fallback username excepción', e); }
  }
  console.log('[avatar] users.avatar_url actualizado', stableUrl, 'fila:', updData);
  // Actualizar sesión local si coincide
  try {
    const key='hoho3d_user';
    const raw=localStorage.getItem(key);
  if(raw){ const ses=JSON.parse(raw); if(ses && ses.id===userId){ ses.avatar_url=stableUrl; localStorage.setItem(key, JSON.stringify(ses)); } }
  } catch(e){ console.warn('No se pudo actualizar avatar_url en session', e); }
  _cache.profile.delete(userId); // invalidate
  console.timeEnd('uploadAvatar');
  return displayUrl; // devolvemos versión con cache-bust para uso inmediato
}

export async function saveCharacter(userId, character){
  const sb = getSupabase();
  if(!sb) throw new Error('Supabase no inicializado');
  const { error } = await sb.from('users').update({ character }).eq('id', userId);
  if(error){
    if(error.code==='42703') throw new Error('Falta columna character en users. Ejecuta: ALTER TABLE public.users ADD COLUMN character text;');
    throw error;
  }
  _cache.profile.delete(userId);
}

export async function saveName(userId, nombre){
  const sb = getSupabase();
  if(!sb) throw new Error('Supabase no inicializado');
  const clean = (nombre||'').trim().slice(0,32);
  if(!clean) throw new Error('Nombre vacío');
  const { error } = await sb.from('users').update({ username:clean }).eq('id', userId);
  if(error) throw error;
  _cache.profile.delete(userId);
  return clean;
}
