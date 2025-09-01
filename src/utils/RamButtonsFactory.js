export class RamButtonsFactory {
  constructor(scene){
    this.scene = scene;
    this._rects = null;
    this._slices = new Set();
    this.debugGraphics = null;
    this.debugLabels = [];
    this.debugEnabled = false;
    // Parámetros de filtrado
    this.MIN_WIDTH = 80;
    this.MIN_HEIGHT = 24;
    this.MAX_HEIGHT = 110;
    this.ASPECT_MIN = 1.6;
    this.MAX_BUTTONS = 12;
    scene.input.keyboard?.on('keydown-B', (e)=> { if (e.shiftKey){ this.toggleDebug(); } });
  }

  toggleDebug(){
    this.debugEnabled = !this.debugEnabled;
    if (!this.debugEnabled){
      if (this.debugGraphics){ this.debugGraphics.destroy(); this.debugGraphics=null; }
      this.debugLabels.forEach(t=> t.destroy());
      this.debugLabels.length=0;
    }
    if (this.debugEnabled){ this.drawDebug(); }
  }

  drawDebug(){
    if (!this.debugEnabled || !this._rects) return;
    if (!this.debugGraphics) this.debugGraphics = this.scene.add.graphics().setDepth(9999);
    const g = this.debugGraphics; g.clear();
    g.lineStyle(2,0x00ff88,0.9);
    this.debugLabels.forEach(l=> l.destroy());
    this.debugLabels.length=0;
    this._rects.forEach((r,i)=>{
      g.strokeRect(r.x, r.y, r.w, r.h);
      g.fillStyle(0x00ff88,0.12).fillRect(r.x, r.y, r.w, r.h);
      const label = this.scene.add.bitmapText(r.x + r.w/2, r.y + r.h/2, 'casual', String(i), 18)
        .setOrigin(0.5).setTint(0x00ff88).setDepth(10000);
      this.debugLabels.push(label);
    });
  }

  // Auto-detect rectangles containing button backgrounds.
  detectRects(){
    if (this._rects) return this._rects;
    const key='ram_buttons';
    if (!this.scene.textures.exists(key)) return [];
    const tex = this.scene.textures.get(key);
    const img = tex.getSourceImage();
    const W = img.width, H = img.height;
    // Sample background color (0,0)
    const ctx = this.getTempCtx(img);
    const bg = ctx.getImageData(0,0,1,1).data; // RGBA
    const isBg = (r,g,b,a)=> a<10 || (Math.abs(r-bg[0])<6 && Math.abs(g-bg[1])<6 && Math.abs(b-bg[2])<6);
    // Build binary mask (sample every 1 px for precision)
    const mask = new Uint8Array(W*H);
    const data = ctx.getImageData(0,0,W,H).data;
    for (let y=0;y<H;y++){
      for (let x=0;x<W;x++){
        const i=(y*W+x)*4; const r=data[i], g=data[i+1], b=data[i+2], a=data[i+3];
        if (!isBg(r,g,b,a)) mask[y*W+x]=1;
      }
    }
    // Connected components (simple flood fill) but restrict to reasonably sized rectangles
    const visited = new Uint8Array(W*H);
    const rects=[];
    const stack=[];
    const push=(x,y)=>{ stack.push(x,y); visited[y*W+x]=1; };
    for (let y=0;y<H;y++){
      for (let x=0;x<W;x++){
        const idx=y*W+x; if (!mask[idx]||visited[idx]) continue;
        // flood
        let minX=x,maxX=x,minY=y,maxY=y,count=0;
        push(x,y);
        while(stack.length){
          const sy=stack.pop(); const sx=stack.pop(); count++;
          if (sx<minX)minX=sx; if (sx>maxX)maxX=sx; if (sy<minY)minY=sy; if (sy>maxY)maxY=sy;
          for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) if (dx||dy){
            const nx=sx+dx, ny=sy+dy; if(nx>=0&&ny>=0&&nx<W&&ny<H){
              const nidx=ny*W+nx; if(!visited[nidx]&&mask[nidx]){ visited[nidx]=1; stack.push(nx,ny);} }
          }
        }
        const w=maxX-minX+1, h=maxY-minY+1;
        // Filter: skip tiny (text glyph clusters) and huge (full sheet) and very tall narrow (text columns)
        if (w>=40 && h>=20 && w<=W*0.9 && h<=H*0.5){
          rects.push({x:minX,y:minY,w,h});
        }
      }
    }
    // Merge overlapping / adjacent rects (to get full button groups)
    const merged=[];
    rects.sort((a,b)=> a.y===b.y ? a.x-b.x : a.y-b.y);
    for(const r of rects){
      let m = merged.find(o=> !(r.x>o.x+o.w+4 || r.x+r.w+4<o.x || r.y>o.y+o.h+4 || r.y+r.h+4<o.y));
      if (m){
        const nx=Math.min(m.x,r.x), ny=Math.min(m.y,r.y);
        const mx=Math.max(m.x+m.w, r.x+r.w), my=Math.max(m.y+m.h, r.y+r.h);
        m.x=nx; m.y=ny; m.w=mx-nx; m.h=my-ny;
      } else merged.push({...r});
    }
    // Filtrado por características de botón
    const filtered = merged.filter(r=> {
      const ratio = r.w / r.h;
      return r.w >= this.MIN_WIDTH && r.h >= this.MIN_HEIGHT && r.h <= this.MAX_HEIGHT && ratio >= this.ASPECT_MIN;
    });
    this._rects = filtered.sort((a,b)=> a.y===b.y ? a.x-b.x : a.y-b.y).slice(0,this.MAX_BUTTONS);
    if (this._rects.length < 3){
      // Relajar restricción de aspecto si detectamos muy pocos
      const relaxed = merged.filter(r=> r.w>=this.MIN_WIDTH && r.h>=this.MIN_HEIGHT && r.h<=this.MAX_HEIGHT);
      this._rects = relaxed.sort((a,b)=> a.y===b.y ? a.x-b.x : a.y-b.y).slice(0,this.MAX_BUTTONS);
    }
    this.drawDebug();
    return this._rects;
  }

  getTempCtx(img){
    if (!this._canvas){ this._canvas=document.createElement('canvas'); }
    this._canvas.width=img.width; this._canvas.height=img.height;
    const ctx=this._canvas.getContext('2d');
    ctx.drawImage(img,0,0);
    return ctx;
  }

  ensureSlice(index){
    const rects = this.detectRects();
    const r = rects[index % rects.length];
    if (!r) return null;
    if (this._slices.has(r)) return r.key;
    const key = `ram_btn_${index}`;
    if (!this.scene.textures.exists(key)){
      const rt = this.scene.make.renderTexture({ width:r.w, height:r.h, add:false });
      rt.draw('ram_buttons', -r.x, -r.y);
      rt.saveTexture(key); rt.destroy();
    }
    r.key = key;
    this._slices.add(r);
    return key;
  }

  makeButton(x,y,{ index=0, label='JUGAR', onClick=()=>{}, targetWidth=520, maxWidth=520, hoverScale=1.04, pressOffset=2, fontSize=34, minFontSize=14 }={}){
    if (!this.scene.textures.exists('ram_buttons')){
      // fallback simple
      return this.scene.add.text(x,y,label,{fontFamily:'Arial',fontSize:'24px',color:'#ffffff'}).setOrigin(0.5);
    }
    const key = this.ensureSlice(index);
    let img;
    if (key) {
      img = this.scene.add.image(0,0,key).setOrigin(0.5);
      // Escalado uniforme a targetWidth sin superar maxWidth
      const tw = Math.min(targetWidth, maxWidth);
      const s = tw / img.width;
      img.setScale(s);
    } else {
      img = this.scene.add.rectangle(0,0,targetWidth, Math.round(targetWidth*0.23),0x444444).setStrokeStyle(2,0xffffff,0.25);
    }
    // Texto + sombra
    const upper = label.toUpperCase();
    const txtShadow = this.scene.add.bitmapText(1,2,'casual', upper, fontSize).setOrigin(0.5).setTint(0x000000).setAlpha(0.55);
    const txt = this.scene.add.bitmapText(0,0,'casual', upper, fontSize).setOrigin(0.5).setTint(0xffffff);
    const c = this.scene.add.container(x,y,[img, txtShadow, txt]);
    // Ajustar tamaño de fuente si excede ancho útil
    const usable = img.displayWidth * 0.84;
    const bounds = ()=> txt.getTextBounds().local.width;
    while(bounds() > usable && txt.fontSize > minFontSize){ txt.setFontSize(txt.fontSize-1); txtShadow.setFontSize(txt.fontSize); }
    // Interactividad
    const bw = img.displayWidth; const bh = img.displayHeight;
    c.setSize(bw,bh);
    const zone = this.scene.add.zone(0,0,bw,bh).setOrigin(0.5).setInteractive({ cursor:'pointer' });
    c.addAt(zone,0);
    const baseY = y; let over=false;
    zone.on('pointerover', ()=> { over=true; c.setScale(hoverScale); img.setTint(0xffffff); });
    zone.on('pointerout',  ()=> { over=false; c.setScale(1); c.y=baseY; img.clearTint(); });
    zone.on('pointerdown', ()=> { c.y=baseY+pressOffset; });
    zone.on('pointerup',   ()=> { c.y=baseY; if(over) onClick?.(); });
    return c;
  }
}

