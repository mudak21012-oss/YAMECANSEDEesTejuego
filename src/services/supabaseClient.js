import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigured } from "../config/supabase.js";

let _sb = null;
export function getSupabase(){
  if(!supabaseConfigured()) { console.log('[Supabase] not configured (using fallback)'); return null; }
  if(_sb) return _sb;
  // Carga ligera del cliente desde CDN dinámico si no existe global (runtime)
  if(!window.createSupabaseClient){
    console.warn("Supabase client no cargado. Incluye <script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm\"></script> en index.html para usar Supabase.");
    return null;
  }
  console.log('[Supabase] creating client', SUPABASE_URL);
  _sb = window.createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true } });
  console.log('[Supabase] client ready');
  return _sb;
}

// Health check: intenta un SELECT ligero sobre tabla users (si existe) para verificar RLS / conexión
export async function supabaseHealth(table = 'users'){
  const sb = getSupabase();
  if(!sb) return { ok:false, error:'no-client' };
  try {
    const { error } = await sb.from(table).select('id', { count:'exact', head:true }).limit(1);
    if(error){
      if(/permission denied/i.test(error.message)) return { ok:false, error:'rls-denied' };
      if(/relation .* does not exist/i.test(error.message)) return { ok:false, error:'table-missing' };
      return { ok:false, error:error.message };
    }
    return { ok:true };
  } catch(e){ return { ok:false, error:e.message }; }
}
