import { makePixelPanel } from "../utils/pixelPanel.js";
import PointsSheetService from "../services/PointsSheetService.js";
import SupabaseScoreService from "../services/SupabaseScoreService.js";

// LeaderboardPanel v2
export default class LeaderboardPanel {
  constructor(scene, { x=0, y=0, maxW=640, title="Mejores Puntos", subtitle="(Top 10)", theme="slate", mode="standard" } = {}){
    this.scene = scene;
    this.g = scene.add.container(x,y).setDepth(12);
    this.maxW = maxW;
    this.mode = mode; // 'standard' | 'compact2'
    if (this.mode === 'sideWeekly') {
      title = title || 'MEJORES PUNTOS DE LA SEMANA';
      subtitle = '';
      this.sideCfg = { titleSize:16, rowSize:12, padX:6, padY:4, rowGap:2, maxRows:6 };
    }
    this.title = scene.add.bitmapText(0,0,"casual", title, this.mode==='sideWeekly'? (this.sideCfg.titleSize):36).setTint(0xffffff);
    this.sub   = scene.add.bitmapText(0,0,"casual", subtitle, this.mode==='sideWeekly'?0:20).setTint(0xcfe3ff).setVisible(this.mode!=='sideWeekly');
    this.titleBg = scene.add.rectangle(0,0,10,10,0xffffff,0.05).setOrigin(0,0).setVisible(this.mode==='sideWeekly');
    this.panel = makePixelPanel(scene, maxW, 260, theme).setAlpha(0.95);
    this.g.add([this.panel, this.titleBg, this.title, this.sub]);
    this.rows = [];
  // Servicio original de scoreboard se mantiene para retrocompatibilidad; nuevo servicio para hoja de puntos
  this.pointsSvc = new PointsSheetService();
  this.sbScores = new SupabaseScoreService();
  }

  safeBounds(obj){
    if(!obj) return { width:0, height:0 };
    try {
      if(typeof obj.getTextBounds === 'function'){ const b=obj.getTextBounds().local; return { width:b.width||0,height:b.height||0 }; }
    } catch(_){}
    return { width: obj.displayWidth||obj.width||0, height: obj.displayHeight||obj.height||0 };
  }

  fmt(n){ return (n||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  cut(s, max){ return s.length<=max ? s : s.slice(0, max-1)+"…"; }

  makeMedal(rank){
    const col = rank===1?0xFFD54F : rank===2?0xCFD8DC : 0xFFAB91;
    const g = this.scene.add.graphics();
    g.fillStyle(col,1).fillCircle(0,0,6);
    g.lineStyle(2, 0x000000, 0.35).strokeCircle(0,0,6);
    return g;
  }

  clearRows(){
    this.rows.forEach(r=>{ r.rank.destroy(); r.name.destroy(); r.score.destroy(); r.medal?.destroy(); r.bg?.destroy(); r.div?.destroy(); });
    this.rows.length=0;
  }

  async load(limit=10){ // legacy (usa antiguo servicio si existiera)
    try {
      const data = await (this.svc?.getTop ? this.svc.getTop(limit) : this.pointsSvc.getTop(limit));
      this.setData(data);
    } catch {
      this.setData([{ name: "Sin conexión", score: 0 }]);
    }
  }

  async loadFromSheet(limit=10){
    // Primero intentar Supabase si está disponible
    if(this.sbScores.available()){
      try {
        const top = await this.sbScores.getTop(limit);
        if(top && top.length){
          // normalizar campos esperados por panel
          const data = top.map(r=> ({ rank:r.rank, name:r.name||r.username, score:r.score||r.points, date:r.date||r.last_date }));
          this.setData(data);
          return;
        }
      } catch(e){ console.warn('Supabase scores fallback a sheet', e); }
    }
    // Fallback a hoja CSV
    try { const data = await this.pointsSvc.getTop(limit); this.setData(data); }
    catch(e){ console.warn("Leaderboard load error", e); this.setData([{ name:"Sin conexión", score:0 }]); }
  }

  setData(entries){
    this.clearRows();
    // Weekly filter (últimos 7 días) si aplica
    if (this.mode === 'sideWeekly'){
      const now = new Date();
      const sevenAgo = now.getTime() - 7*24*3600*1000;
      const filtered = entries.filter(it=>{
        if(!it.date) return false;
        // date puede venir "YYYY-MM-DD" o "DD/MM/YYYY"
        let dStr = it.date;
        let d;
        if(/\d{4}-\d{2}-\d{2}/.test(dStr)) d = new Date(dStr+ 'T00:00:00');
        else if(/\d{2}\/\d{2}\/\d{4}/.test(dStr)){
          const [dd,mm,yyyy] = dStr.split('/');
          d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        }
        if(!d || isNaN(d)) return false;
        return d.getTime() >= sevenAgo;
      });
      if (filtered.length) entries = filtered; // solo si hay resultados recientes
    }
    const e = entries.slice(0,10);
  if (this.mode === 'sideWeekly'){
      e.forEach((it,i)=>{
        const rank = (it.rank ?? (i+1));
    const rs = this.sideCfg.rowSize;
    const bg = this.scene.add.rectangle(0,0,10,rs+2,0xffffff, i%2?0.04:0.07).setOrigin(0,0.5);
    const rankTxt = this.scene.add.bitmapText(0,0,"casual", `${rank}.`, rs).setTint(rank<=3?0xffe08a:0xb8c6d6);
    const nameTxt = this.scene.add.bitmapText(0,0,"casual", this.cut(it.name||"???", 9), rs).setTint(0xffffff);
    const scoreTxt= this.scene.add.bitmapText(0,0,"casual", this.fmt(it.score), rs).setTint(0xffffff);
        this.g.add([bg, rankTxt, nameTxt, scoreTxt]);
        this.rows.push({ side:true, bg, rank:rankTxt, name:nameTxt, score:scoreTxt });
      });
      this.layout(this.g.x, this.g.y, this.maxW);
      return;
    }
    if (this.mode === 'compact2'){
      // En modo compacto usamos una sola bitmapText por entrada (rank nombre puntuación)
      e.forEach((it,i)=>{
        const rank = (it.rank ?? (i+1));
        const label = `${rank}. ${this.cut(it.name||"???", 8)} ${this.fmt(it.score)}`;
        const txt = this.scene.add.bitmapText(0,0,"casual", label, 18).setTint(rank<=3?0xfff1a8:0xffffff);
        const bg = this.scene.add.rectangle(0,0,10,10,0xffffff, i%2?0.05:0.08).setOrigin(0,0.5);
        this.g.add([bg, txt]);
        this.rows.push({ compact:true, bg, line:txt, rank });
      });
    } else {
      e.forEach((it,i)=>{
        const rank = (it.rank ?? (i+1));
        const bg = (i%2===0) ? this.scene.add.rectangle(0,0,10,10,0xffffff,0.06).setOrigin(0) : null;
        const rankTxt = this.scene.add.bitmapText(0,0,"casual", `${rank}.`, 22).setTint(rank<=3?0xffe08a:0x9db7d1);
        const nameTxt = this.scene.add.bitmapText(0,0,"casual", this.cut(it.name||"???", 16), 22).setTint(0xffffff);
        const dateTxt = this.scene.add.bitmapText(0,0,"casual", it.date ? it.date.split("-").reverse().join("/") : "", 14).setTint(0xaec7dd);
        const scoreTxt= this.scene.add.bitmapText(0,0,"casual", this.fmt(it.score), 22).setTint(0xffffff);
        const medal = rank<=3 ? this.makeMedal(rank) : null;
        const div = this.scene.add.graphics().setAlpha(0.18);
        const toAdd = [rankTxt, nameTxt, dateTxt, scoreTxt, div];
        if (bg) toAdd.unshift(bg);
        this.g.add(toAdd); medal && this.g.add(medal);
        const target = it.score||0; scoreTxt.setText("0");
        this.scene.tweens.addCounter({ from:0, to:target, duration:400, delay:i*35, onUpdate: tw => scoreTxt.setText(this.fmt(Math.floor(tw.getValue()))) });
        this.rows.push({ bg, rank:rankTxt, name:nameTxt, date:dateTxt, score:scoreTxt, medal, div });
      });
    }
    this.layout(this.g.x, this.g.y, this.maxW);
  }

  layout(x=this.g.x, y=this.g.y, maxW=this.maxW){
    this.g.setPosition(x,y); this.maxW = maxW;
    const W = maxW;
    if (this.mode === 'compact2'){
      // Layout reducido: sólo 2 filas (hasta 10 entradas). Ajustamos panel mínimo.
      const paddingX = 10;
      const paddingY = 6;
      const haveMany = this.rows.length > 5;
      const rowsMax = haveMany ? 2 : 1; // si <=5, una sola fila
      const rowFontSize = 14;
      // aplicar tamaño de fuente a cada línea
      this.rows.forEach(r=> r.line.setFontSize(rowFontSize));
      // Título minimal; ocultar subtítulo para ahorrar altura
      this.title.setFontSize(18);
      this.sub.setVisible(false);
  const tB = this.safeBounds(this.title);
      this.title.setPosition(10,6);
      const startY = this.title.y + tB.height + 4;
      const rowGap = 4;
      const perRow = Math.ceil(this.rows.length / rowsMax) || 1;
      const usableW = W - paddingX*2;
      const colW = Math.max(60, Math.floor(usableW / perRow));
      // Ajustar panel a contenido real (sin exceder maxW asignado)
      const neededW = paddingX*2 + colW * perRow;
      if (neededW < W){ this.panel.setDisplaySize(neededW, this.panel.displayHeight); this.maxW = neededW; }
      const baseW = this.maxW || W;
      const offsetX = (baseW - neededW)/2; // centrar si reducimos
      this.rows.forEach((r,i)=>{
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const cx = offsetX + paddingX + colW*col + colW/2;
        const cy = startY + row* (rowFontSize + rowGap + 2) + rowFontSize/2;
        const txt = r.line;
        const tb = txt.getTextBounds().local;
        txt.setPosition(cx - tb.width/2, cy - rowFontSize/2);
        r.bg.setPosition(cx - colW/2 + 1, cy).setSize(colW - 2, rowFontSize + 4).setOrigin(0,0.5);
      });
      const usedRows = Math.min(rowsMax, Math.ceil(this.rows.length / perRow));
      const totalH = startY + usedRows*(rowFontSize + rowGap + 2) + paddingY;
      this.panel.setDisplaySize(baseW, totalH);
      return;
    }
    if (this.mode === 'sideWeekly'){
      const { padX, padY, rowGap, rowSize, maxRows } = { padX:this.sideCfg.padX, padY:this.sideCfg.padY, rowGap:this.sideCfg.rowGap, rowSize:this.sideCfg.rowSize, maxRows:this.sideCfg.maxRows };
  const tB = this.safeBounds(this.title);
      this.title.setPosition(padX, padY);
      this.titleBg.setVisible(true).setPosition(padX-3, padY-2).setSize(this.maxW - padX*2 +6, tB.height+4);
      const startY = padY + tB.height + 2;
      const visibleRows = Math.min(this.rows.length, maxRows);
      this.rows.forEach((r,i)=>{
        if(i>=visibleRows){ r.bg.setVisible(false); r.rank.setVisible(false); r.name.setVisible(false); r.score.setVisible(false); return; }
        const y = startY + i*(rowSize + rowGap) + rowSize/2 + 1;
        const baseX = padX;
        r.bg.setPosition(baseX, y).setSize(this.maxW - padX*2, rowSize + 2);
        r.rank.setPosition(baseX + 2, y - rowSize/2 - 1);
        r.name.setPosition(baseX + 26, y - rowSize/2 - 1);
        const sw = r.score.getTextBounds().local.width;
        r.score.setPosition(this.maxW - padX - sw - 2, y - rowSize/2 - 1);
      });
      const totalH = startY + visibleRows*(rowSize + rowGap) + padY;
      this.panel.setDisplaySize(this.maxW, totalH);
      return;
    }
    // Medidas reales via bounds para evitar solapamientos visuales (modo estándar)
  const tBounds = this.safeBounds(this.title);
  const sBounds = this.safeBounds(this.sub);
    this.title.setPosition(16, 10);
    this.sub.setPosition(16, this.title.y + tBounds.height + 2);
    const startY = this.sub.y + sBounds.height + 12; // mayor separación del primer row
    const rowH = 34; // un poco más alto para nombre + fecha opcional
    const twoCols = (W >= 560) && this.rows.length > 5;
    const colW = twoCols ? Math.floor((W - 32) / 2) : (W - 32);
    const rowsPerCol = twoCols ? Math.ceil(this.rows.length/2) : this.rows.length;
    const contentH = startY + rowsPerCol*rowH + 12;
    this.panel.setDisplaySize(W, Math.max(140, contentH));
    this.rows.forEach((r,i)=>{
      const col = (twoCols && i >= 5) ? 1 : 0;
      const baseX = 16 + col * (colW + 16);
      const baseY = startY + (twoCols ? (i%5) : i) * rowH;
      r.bg?.setPosition(baseX-4, baseY-3).setSize(colW+8, rowH-2);
  const nameBounds = this.safeBounds(r.name);
  const rankBounds = this.safeBounds(r.rank);
      const lineY = baseY + Math.max(0, (rowH - rankBounds.height)/2 - 2);
      r.rank.setPosition(baseX, lineY);
      r.name.setPosition(baseX + 30, lineY);
      if (r.date){
        // colocar fecha a la derecha del nombre en la misma línea si cabe, sino debajo
  const dateBounds = this.safeBounds(r.date);
        const nameRight = r.name.x + nameBounds.width + 8;
        if (nameRight + dateBounds.width < baseX + colW - 80){
          r.date.setPosition(nameRight, lineY + 2);
        } else {
          r.date.setPosition(r.name.x, lineY + nameBounds.height - 8);
        }
      }
      if (r.medal) r.medal.setPosition(baseX + 18, lineY + rankBounds.height/2 - 2);
  const sw = this.safeBounds(r.score).width;
      const scoreX = baseX + colW - 10;
      r.score.setPosition(scoreX - sw, lineY);
      r.div.clear();
      if (twoCols && col===0){
        r.div.lineStyle(2, 0x000000, 0.25).lineBetween(baseX + colW + 8, startY, baseX + colW + 8, startY + rowsPerCol*rowH - 8);
      }
    });
  }

  destroy(){ this.clearRows(); this.g.destroy(); }
}

