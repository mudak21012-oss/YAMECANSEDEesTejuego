export class NeonButtonFactory {
  constructor(scene){ this.scene = scene; }

  themes(){
    return {
      sunset: { start:0xffc36b, end:0xff6b6b, edge:0x2b2020, accentStart:0xffe3a6, accentEnd:0xff8f8f },
      aqua:   { start:0x55e0ff, end:0x2a6bff, edge:0x142238, accentStart:0x9aeaff, accentEnd:0x3d89ff },
      emerald:{ start:0x50f28d, end:0x059c5d, edge:0x083623, accentStart:0x9dffca, accentEnd:0x06c779 },
      violet: { start:0xb475ff, end:0x5a2aff, edge:0x251340, accentStart:0xdab6ff, accentEnd:0x7d54ff },
      amber:  { start:0xffe06e, end:0xffb22e, edge:0x362300, accentStart:0xfff0a8, accentEnd:0xffc763 }
    };
  }

  makeButton(x,y,{ label="BUTTON", theme="emerald", w=340, h=60, icon:iconKind='arrow', fontKey='casual', onClick=()=>{}, glow=true }={}){
    const t = this.themes()[theme] || this.themes().emerald;
    const radius = Math.min(30, h/2);
    const wedgeW = Math.max(56, Math.min(100, w*0.25));
    const slant = Math.min(32, Math.max(18, h*0.55));
    const leftW = w - wedgeW + slant; // overlap for slant

    // --- draw base ---
    const g = this.scene.add.graphics();
    // Gradient utility vertical
    const drawVerticalGradient = (gfx, x, y, ww, hh, c1, c2, r, roundedLeft=true, roundedRight=true) => {
      for(let i=0;i<hh;i++){
        const tL = i/(hh-1);
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(c1), Phaser.Display.Color.ValueToColor(c2), hh-1, i
        );
        const color = (c.r<<16)|(c.g<<8)|c.b;
        let rx1 = x; let rx2 = x+ww;
        // clipping for rounded corners top/bottom
        if (r>0 && roundedLeft){
          // left circle center
          const cx = x + r; const cyTop = y + r; const cyBot = y + hh - r;
          if (i < r){ // top arc
            const dy = r - i; const dx = Math.sqrt(r*r - dy*dy); rx1 = Math.max(rx1, cx - dx);
          } else if (i >= hh - r){ // bottom arc
            const dy = i - (hh - r - 1); const dx = Math.sqrt(r*r - dy*dy); rx1 = Math.max(rx1, cx - dx);
          }
        }
        if (r>0 && roundedRight){
          const cx2 = x + ww - r; const cyTop2 = y + r; const cyBot2 = y + hh - r;
          if (i < r){ const dy = r - i; const dx = Math.sqrt(r*r - dy*dy); rx2 = Math.min(rx2, cx2 + dx); }
          else if (i >= hh - r){ const dy = i - (hh - r - 1); const dx = Math.sqrt(r*r - dy*dy); rx2 = Math.min(rx2, cx2 + dx); }
        }
        gfx.fillStyle(color,1).fillRect(rx1, y+i, rx2-rx1, 1);
      }
    };

    // Left pill segment
    drawVerticalGradient(g, -leftW/2, -h/2, leftW, h, t.start, t.end, radius, true, false);

    // Wedge / accent segment (polygon with slant)
    const wedgeX = leftW/2 - slant; // start of wedge area relative to container center
    const poly = new Phaser.Geom.Polygon([
      wedgeX, -h/2,
      wedgeX + wedgeW - slant, -h/2,
      wedgeX + wedgeW, 0,
      wedgeX + wedgeW - slant, h/2,
      wedgeX, h/2,
      wedgeX + slant, 0
    ]);
    // Draw wedge gradient by scanlines inside polygon bounds
    const polyBounds = poly.getBounds();
    for(let i=0;i<h;i++){
      const ty = -h/2 + i;
      // Horizontal intersections for this scanline
      const pts = [];
      const lines = poly.points;
      for(let j=0;j<lines.length;j++){
        const p1 = lines[j]; const p2 = lines[(j+1)%lines.length];
        if ((p1.y<=ty && p2.y>ty) || (p2.y<=ty && p1.y>ty)){
          const tEdge = (ty - p1.y)/(p2.y - p1.y);
            pts.push(p1.x + tEdge*(p2.x - p1.x));
        }
      }
      if (pts.length>=2){
        pts.sort((a,b)=>a-b);
        for (let k=0;k<pts.length;k+=2){
          const x1 = pts[k]; const x2 = pts[k+1];
          const tt = i/(h-1);
          const c = Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.ValueToColor(t.accentStart), Phaser.Display.Color.ValueToColor(t.accentEnd), h-1, i
          );
          const color = (c.r<<16)|(c.g<<8)|c.b;
          g.fillStyle(color,1).fillRect(x1, ty, x2-x1, 1);
        }
      }
    }

    // Edge stroke full outline (approx) using rounded rect then wedge outline overlay
    g.lineStyle(2, t.edge, 1).strokeRoundedRect(-leftW/2, -h/2, leftW, h, radius);
    g.lineBetween(wedgeX, -h/2, wedgeX + wedgeW - slant, -h/2);
    g.lineBetween(wedgeX + wedgeW - slant, -h/2, wedgeX + wedgeW, 0);
    g.lineBetween(wedgeX + wedgeW, 0, wedgeX + wedgeW - slant, h/2);
    g.lineBetween(wedgeX + wedgeW - slant, h/2, wedgeX, h/2);
    g.lineBetween(wedgeX, h/2, wedgeX + slant, 0);

    // Render to texture for performance
    const texKey = `neonbtn_${Math.random().toString(36).slice(2)}`;
    const boundsW = w + 8; const boundsH = h + 8;
    const rt = this.scene.make.renderTexture({ width:boundsW, height:boundsH, add:false });
    rt.draw(g, boundsW/2, boundsH/2);
    g.destroy();
    rt.saveTexture(texKey); rt.destroy();
    const base = this.scene.add.image(0,0,texKey).setOrigin(0.5);

    // Text
    const text = this.scene.add.bitmapText(0,0,fontKey,label.toUpperCase(), Math.min(32, h*0.46)).setOrigin(0.5).setTint(0xffffff);
    // Fit if too wide
    if (text.getTextBounds().local.width > w*0.55){
      let fs = text.fontSize;
      while(fs>10 && text.getTextBounds().local.width > w*0.55){ fs--; text.setFontSize(fs); }
    }
    text.x = -w*0.08; // shift left to visually center with wedge

    // Icon in wedge
  const iconSprite = this.makeIcon(iconKind, Math.min(h*0.42, 30), 0xffffff);
  iconSprite.x = w*0.28; iconSprite.y = 0;

  const c = this.scene.add.container(x,y,[base,text,iconSprite]);
    c.setSize(w,h).setInteractive(new Phaser.Geom.Rectangle(-w/2,-h/2,w,h), Phaser.Geom.Rectangle.Contains);
    c.input.cursor = 'pointer';

    // Hover effects
    const hoverTween = { targets:c, scale:1.04, duration:160, ease:'sine.out' };
    const outTween   = { targets:c, scale:1.0, duration:180, ease:'sine.out' };
    c.on('pointerover', ()=> this.scene.tweens.add(hoverTween));
    c.on('pointerout',  ()=> this.scene.tweens.add(outTween));
    c.on('pointerdown', ()=> c.y += 2);
    c.on('pointerup',   ()=> { c.y -= 2; onClick?.(); });

    if (glow){
      const glowImg = this.scene.add.image(0,0,texKey).setOrigin(0.5).setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.15);
      c.addAt(glowImg,0);
      this.scene.tweens.add({ targets:glowImg, alpha:{from:0.10,to:0.35}, duration:1800, yoyo:true, repeat:-1, ease:'sine.inOut' });
    }
    return c;
  }

  makeIcon(kind,size,color){
    const g = this.scene.add.graphics();
    g.lineStyle(3,color,1);
    if (kind==='arrow'){
      g.lineBetween(-size*0.4,0, size*0.2,-size*0.4);
      g.lineBetween(-size*0.4,0, size*0.2, size*0.4);
      g.lineBetween(size*0.2,-size*0.4, size*0.2, size*0.4);
    } else if (kind==='play'){
      g.fillStyle(color,1).fillTriangle(-size*0.35,-size*0.45,-size*0.35,size*0.45,size*0.55,0);
    } else if (kind==='plus'){
      g.lineBetween(-size*0.5,0,size*0.5,0); g.lineBetween(0,-size*0.5,0,size*0.5);
    } else if (kind==='chevron'){
      g.lineBetween(-size*0.4,-size*0.25,-size*0.05,0);
      g.lineBetween(-size*0.4,size*0.25,-size*0.05,0);
      g.lineBetween(-size*0.05,0,size*0.3,-size*0.25);
      g.lineBetween(-size*0.05,0,size*0.3,size*0.25);
    } else {
      g.fillStyle(color,0.7).fillCircle(0,0,size*0.25);
    }
    const key = `nb_icon_${kind}_${Math.random().toString(36).slice(2)}`;
    const pad = size+8;
    g.generateTexture(key, pad, pad);
    g.destroy();
    return this.scene.add.image(0,0,key).setDisplaySize(size,size);
  }
}
