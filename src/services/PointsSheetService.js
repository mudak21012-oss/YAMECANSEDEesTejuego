// Servicio para leer la hoja pública de puntos (ranking,nombre,puntos,fecha)
// Encapsula parsing robusto CSV y orden de fallback.

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZ-GFIahnmzB09C1GWCvAs1PaNXmpN2_Ed5taWtseTRlqx0P8-ZKJ28TOsvziFOw/pub?gid=1321470601&single=true&output=csv";

export class PointsSheetService {
  constructor(url = CSV_URL){ this.url = url; this._cache = null; this._ts = 0; }

  // CSV robusto (comillas y comas internas)
  parseCSV(text){
    const rows=[]; let row=[], cell="", inQ=false;
    for (let i=0;i<text.length;i++){
      const ch=text[i], nx=text[i+1];
      if(ch==='"' && nx==='"'){ cell+='"'; i++; continue; }
      if(ch==='"'){ inQ=!inQ; continue; }
      if(!inQ && ch===','){ row.push(cell); cell=""; continue; }
      if(!inQ && (ch==='\n'||ch==='\r')){ if(cell!==""||row.length){ row.push(cell); rows.push(row); row=[]; cell=""; } continue; }
      cell+=ch;
    }
    if(cell!==""||row.length){ row.push(cell); rows.push(row); }
    return rows;
  }

  num(v){ const n = Number(String(v).replace(/[^\d\-]/g,"")); return isFinite(n)? n : 0; }
  toISO_ddmm(v){
    const s=String(v||"").trim(); if(!s) return null;
    const m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
    if(!m) return null;
    const d=m[1].padStart(2,"0"), M=m[2].padStart(2,"0");
    const Y=(m[3]? (m[3].length===2? "20"+m[3] : m[3]) : String(new Date().getFullYear()));
    return `${Y}-${M}-${d}`;
  }

  async fetchAll(){
    const now=Date.now();
    if(this._cache && now-this._ts<30_000) return this._cache; // cache 30s
    const txt = await fetch(this.url,{cache:"no-store"}).then(r=>r.text());
    const rows = this.parseCSV(txt);
    if(!rows.length) return [];
    // headers: ranking, nombre, puntos, fecha (tolerante a mayúsculas/espacios)
    const head = rows.shift().map(h=>String(h||"").trim().toLowerCase());
    const iR = head.findIndex(h=>/ranking/.test(h));
    const iN = head.findIndex(h=>/nombre|name/.test(h));
    const iP = head.findIndex(h=>/puntos|score|points/.test(h));
    const iF = head.findIndex(h=>/fecha|date/.test(h));

    const data = rows.map(r=>{
      const ranking = this.num(r[iR] ?? "");
      const name = String(r[iN] ?? "").trim();
      const score = this.num(r[iP] ?? 0);
      const dateISO = this.toISO_ddmm(r[iF] ?? "");
      return { ranking: (isNaN(ranking)||ranking<=0)? null : ranking, name, score, dateISO };
    }).filter(x=>x.name);

    // Determinar si existe ranking usable (>=50% de filas con ranking distinto y sin duplicados severos)
    const nonNull = data.filter(d=>d.ranking!=null);
    const uniqueRanks = new Set(nonNull.map(d=>d.ranking));
    const haveRanking = nonNull.length >= Math.ceil(data.length*0.5) && uniqueRanks.size === nonNull.length; // heurística de "consistencia"

    const sorted = data.sort((a,b)=>{
      if(haveRanking && a.ranking!=null && b.ranking!=null) return a.ranking - b.ranking;
      if(haveRanking && (a.ranking!=null || b.ranking!=null)) return (a.ranking!=null)? -1 : 1; // filas con ranking primero
      // Fallback: score DESC, luego fecha más reciente (ISO desc)
      const scoreDiff = b.score - a.score;
      if(scoreDiff) return scoreDiff;
      const da = a.dateISO || ""; const db = b.dateISO || "";
      if (da === db) return 0;
      return db < da ? -1 : 1; // da más nuevo primero
    });

    this._cache = sorted; this._ts = now; return sorted;
  }

  async getTop(limit=10){
    const all = await this.fetchAll();
    return all.slice(0, limit).map((d, i)=>({
      rank: d.ranking ?? (i+1),
      name: d.name,
      score: d.score,
      date: d.dateISO
    }));
  }
}

export default PointsSheetService;