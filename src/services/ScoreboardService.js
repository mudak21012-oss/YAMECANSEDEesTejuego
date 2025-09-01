// src/services/ScoreboardService.js
// Servicio scoreboard v3: parser robusto CSV (comillas, comas internas), normalización y dedupe.
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZ-GFIahnmzB09C1GWCvAs1PaNXmpN2_Ed5taWtseTRlqx0P8-ZKJ28TOsvziFOw/pub?gid=1321470601&single=true&output=csv";

/** @typedef {{ name:string, score:number, date:string|null }} ScoreRow */

export class ScoreboardService {
  /** @param {string} url */
  constructor(url = CSV_URL){ this.url = url; this._cache = null; this._ts = 0; }

  /** CSV parser simple con soporte de comillas y comas internas */
  parseCSV(text){
    const rows = []; let row = [], cell = "", inQ = false;
    for (let i=0;i<text.length;i++){
      const ch = text[i], nx = text[i+1];
      if (ch === '"' && nx === '"'){ cell += '"'; i++; continue; }
      if (ch === '"'){ inQ = !inQ; continue; }
      if (!inQ && ch === ','){ row.push(cell); cell=""; continue; }
      if (!inQ && (ch === '\n' || ch === '\r')){
        if (cell!=="" || row.length){ row.push(cell); rows.push(row); row=[]; cell=""; }
        continue;
      }
      cell += ch;
    }
    if (cell!=="" || row.length){ row.push(cell); rows.push(row); }
    return rows;
  }

  /** Mapeo de cabeceras flexibles */
  mapHeaders(head){
    const idx = rx => head.findIndex(h => rx.test((h||"").toLowerCase()));
    return {
      iName: idx(/nombre|name|jugador|player/),
      iContact: idx(/contacto|contact|email|correo/),
      iPass: idx(/contraseña|contrasena|password|pass/),
      iScore: idx(/puntos|score|points/),
      iDate: idx(/fecha|date|día|dia/)
    };
  }

  /** @param {any} v */
  toNumber(v){ const n = Number(String(v).replace(/[^\d\-]/g,"")); return isFinite(n)? n : 0; }

  /** @param {string} v dd/mm[/yyyy] -> ISO yyyy-mm-dd */
  toISOFromDDMM(v){
    const m = String(v).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
    if (!m) return null;
    const d = m[1].padStart(2,"0"), M = m[2].padStart(2,"0"), Y = (m[3]? String(m[3]).padStart(4,"20") : new Date().getFullYear());
    return `${Y}-${M}-${d}`;
  }

  /** Sanea y recorta nombre */
  sanitizeName(name){ return String(name||"").trim().replace(/\s+/g," ").slice(0,24); }

  /** Descarga y normaliza datos (cache 60s) */
  async fetchAll(){
    const now = Date.now();
    if (this._cache && now - this._ts < 60_000) return this._cache;
    const txt = await fetch(this.url).then(r=>{ if(!r.ok) throw new Error("CSV HTTP "+r.status); return r.text(); });
    const rows = this.parseCSV(txt);
    if (!rows.length) { this._cache=[]; this._ts=now; return []; }
    const head = rows.shift();
    const { iName, iScore, iDate } = this.mapHeaders(head);
    /** @type {ScoreRow[]} */
    const data = rows.map(r=>{
      const name = this.sanitizeName(r[iName] ?? "???");
      const score = this.toNumber(r[iScore] ?? 0);
      const iso = this.toISOFromDDMM(r[iDate] ?? "") || null;
      return { name, score, date: iso };
    }).filter(x=>x.name);

    // Dedupe por nombre: mejor score; empate => fecha más reciente
    const best = new Map();
    for (const e of data){
      const prev = best.get(e.name);
      if (!prev) { best.set(e.name, e); continue; }
      if (e.score > prev.score) { best.set(e.name, e); continue; }
      if (e.score === prev.score){
        if ((e.date||"") > (prev.date||"")) best.set(e.name, e);
      }
    }
    const arr = [...best.values()].sort((a,b)=>{
      if (b.score !== a.score) return b.score - a.score;
      return (b.date||"") > (a.date||"") ? 1 : -1; // fecha descendente
    });
    this._cache = arr; this._ts = now; return arr;
  }

  /** @param {number} limit */
  async getTop(limit=10){ const all = await this.fetchAll(); return all.slice(0, limit); }

  /** TRUE si el nombre existe (case-insensitive) */
  async existsName(name){
    const n = this.sanitizeName(name).toLowerCase();
    const all = await this.fetchAll();
    return all.some(e => e.name.toLowerCase() === n);
  }

  /** Sugerencia de nombre único base#2, #3, ... */
  async suggestName(name){
    const base = this.sanitizeName(name);
    const all = await this.fetchAll();
    const taken = new Set(all.map(e=>e.name.toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let i=2;i<5000;i++){
      const cand = `${base}#${i}`;
      if (!taken.has(cand.toLowerCase())) return cand;
    }
    return `${base}#${Math.floor(Math.random()*9000+1000)}`;
  }
}

// Export util separado para potencial UI futura
export const NameTools = {
  sanitize(name){ return String(name||"").trim().replace(/\s+/g," ").replace(/[^\w\s#\-.]/g,"").slice(0,24); },
  isValid(name){ return this.sanitize(name).length >= 3; }
};


