import { getSupabase } from "./supabaseClient.js";
import { TABLES } from "../config/supabase.js";

export class SupabaseScoreService {
  constructor(){ this.sb = getSupabase(); }
  available(){ return !!this.sb; }

  async submitScore({ userId, points }){
    if(!this.available()) return { ok:false, error:"Supabase no configurado" };
    const { error } = await this.sb.from(TABLES.scores).insert({ user_id:userId, points:points|0 });
    if(error) return { ok:false, error:error.message };
    return { ok:true };
  }

  async getTop(limit=10){
    if(!this.available()) return [];
    // 1) Intentar RPC estándar (parámetro p_limit)
    try {
      const { data, error } = await this.sb.rpc('hoho3d_top_scores', { p_limit: limit });
      if(!error && Array.isArray(data)) {
        return data.map(r=> ({ rank:r.rank, name:r.username, score:r.points, date:(r.last_date||r.created_at||'').slice(0,10) }));
      }
      if(error) {
        // Intentar variante con limit_count (por hint del error)
        if(/p_limit/.test(error.message) || /limit_count/i.test(error.hint||'')){
          try {
            const { data: d2, error: e2 } = await this.sb.rpc('hoho3d_top_scores', { limit_count: limit });
            if(!e2 && Array.isArray(d2)) {
              return d2.map(r=> ({ rank:r.rank, name:r.username, score:r.points, date:(r.last_date||'').slice(0,10) }));
            }
          } catch { /* ignore */ }
        }
        console.warn('[SupabaseScoreService] RPC no disponible, usando fallback directo', error);
      }
    } catch(e){ console.warn('[SupabaseScoreService] RPC exception', e); }

    // 2) Fallback: consulta directa - tomar top 100 por puntos y deduplicar máximo por usuario
    try {
      const { data, error } = await this.sb
        .from(TABLES.scores)
        .select('id, points, created_at, user_id, users:users(username)')
        .order('points', { ascending:false })
        .limit(100);
      if(error){ console.warn('[SupabaseScoreService] fallback query error', error); return []; }
      const best = new Map(); // username -> {points,date}
      data.forEach(row=>{
        const username = row.users?.username || '???';
        const prev = best.get(username);
        if(!prev || row.points > prev.points || (row.points === prev.points && row.created_at > prev.date)){
          best.set(username, { points: row.points, date: row.created_at });
        }
      });
      const arr = [...best.entries()].map(([name, v])=> v.date? { name, score:v.points, date:v.date.slice(0,10) } : { name, score:v.points });
      arr.sort((a,b)=> b.score - a.score || (b.date||'').localeCompare(a.date||''));
      return arr.slice(0, limit).map((r,i)=> ({ rank:i+1, ...r }));
    } catch(e){ console.warn('[SupabaseScoreService] fallback exception', e); return []; }
  }
}

/* SQL helper for Postgres function (execute in Supabase SQL editor once):
CREATE OR REPLACE FUNCTION public.hoho3d_top_scores(p_limit int DEFAULT 10)
RETURNS TABLE(rank int, username text, points int, last_date timestamptz)
LANGUAGE sql STABLE AS $$
  WITH mx AS (
    SELECT u.username, MAX(s.points) AS points, MAX(s.created_at) AS last_date
    FROM scores s
    JOIN users u ON u.id = s.user_id
    GROUP BY u.username
  ), ord AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY points DESC, last_date DESC) AS rk
    FROM mx
  )
  SELECT rk AS rank, username, points, last_date FROM ord ORDER BY rk LIMIT p_limit;
$$;*/

export default SupabaseScoreService;
