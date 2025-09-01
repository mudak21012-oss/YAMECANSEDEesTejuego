export class PixelUiFactory {
  constructor(scene, px = 4){ this.scene = scene; this.px = px; }

  palette(theme){
    const P = {
      mint:    { fill: 0x62e6b3, hi: 0x8ff0cd, edge: 0x1f6e56, text: 0x0f1a15 },
      cobalt:  { fill: 0x5aa7ff, hi: 0x8cc6ff, edge: 0x2b5794, text: 0x0e1420 },
      amber:   { fill: 0xf4c361, hi: 0xf9da92, edge: 0x8a5f17, text: 0x201407 },
      magenta: { fill: 0xc86bd9, hi: 0xda98e6, edge: 0x6b2a76, text: 0x1b0f1d },
      slate:   { fill: 0x748195, hi: 0xa4afc0, edge: 0x2f3640, text: 0x0f1116 }
    };
    return P[theme] || P.cobalt;
  }

  makeButton(x, y, {
    label="BUTTON", theme="cobalt", onClick=()=>{},
    w=320, h=52, radius=22,
    size=28, letterSpacing=1,
    paddingX=18, paddingY=8,
  textTint, autoFitText=true,
  pulseLight=true
  } = {}) {
    const pal = this.palette(theme);
    const g = this.scene.add.graphics();
    g.fillStyle(pal.fill, 1).fillRoundedRect(-w/2, -h/2, w, h, radius);
    g.fillStyle(pal.hi, 1).fillRoundedRect(-w/2+2, -h/2+2, w-4, Math.max(6, h*0.38), Math.max(0, radius-2));
    g.lineStyle(2, pal.edge, 1).strokeRoundedRect(-w/2+1, -h/2+1, w-2, h-2, radius);
    const rt = this.scene.make.renderTexture({ width:w+4, height:h+4, add:false });
    rt.draw(g, w/2+2, h/2+2); g.destroy();
    const key = `pxbtn_${Math.random().toString(36).slice(2)}`;
    rt.saveTexture(key); rt.destroy();
    const img = this.scene.add.image(0,0,key).setOrigin(0.5);
    const bmp = this.scene.add.bitmapText(0,0,"casual", label.toUpperCase(), size)
      .setOrigin(0.5).setLetterSpacing(letterSpacing)
      .setTint(textTint ?? pal.text);
  const c = this.scene.add.container(x,y,[img,bmp]);
	c.setSize(w,h)
	 .setInteractive({ cursor: 'pointer' })
	 .setDepth(100);
  // Guardar dimensiones para fallback manual
  c._btnW = w; c._btnH = h; c._btnLabel = label;
    if (autoFitText) this.fitBitmapWithin(bmp, w - 2*paddingX, h - 2*paddingY);
  // Interacción simplificada: sin animaciones ni desplazamientos para evitar "salto".
  c.on("pointerdown", ()=> { console.log('[UI] click', label); onClick?.(); });
    if (pulseLight){
      // Overlay additivo que pulsa suavemente simulando luz
      const pulse = this.scene.add.image(0,0,key).setOrigin(0.5).setTint(0xffffff).setAlpha(0.0).setBlendMode(Phaser.BlendModes.ADD);
      c.add(pulse);
      this.scene.tweens.add({ targets:pulse, alpha:{ from:0.10, to:0.38 }, duration:1600, yoyo:true, repeat:-1, ease:'sine.inOut' });
    }
    return c;
  }

  fitBitmapWithin(bmp, maxW, maxH){
    if(!bmp || !maxW || !maxH) return;
    const hasBounds = typeof bmp.getTextBounds === 'function';
    if(hasBounds){
      try {
        let loops=0;
        while (bmp.getTextBounds().local.width > maxW && bmp.fontSize > 8 && loops<40) {
          bmp.setFontSize(bmp.fontSize - 1); loops++;
        }
        const b = bmp.getTextBounds().local;
        const sx = Math.min(1, maxW / Math.max(1,b.width));
        const sy = Math.min(1, maxH / Math.max(1,b.height));
        bmp.setScale(Math.min(sx, sy));
        return;
      } catch(e){ /* fallback abajo */ }
    }
    const approxW = bmp.displayWidth || bmp.width || maxW;
    const approxH = bmp.displayHeight || bmp.height || maxH;
    const sx = Math.min(1, maxW / Math.max(1, approxW));
    const sy = Math.min(1, maxH / Math.max(1, approxH));
    bmp.setScale(Math.min(sx, sy));
  }
}
