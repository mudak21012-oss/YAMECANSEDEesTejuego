// Genera un fondo "dungeon" con ladrillos, viñeta, antorchas y logo pixelado.
export function addDungeonBackdrop(scene, {
  variant = "menu",
  withLogo = true,
  logoSize = 180,
  opacity = 1,
  tint = 0xffffff
} = {}) {
  const W = scene.scale.gameSize.width;
  const H = scene.scale.gameSize.height;
  const c = scene.add.container(0,0).setDepth(-10).setScrollFactor(0).setAlpha(opacity);

  // 1) Base ladrillos
  const g = scene.add.graphics();
  const base = (variant === "gameover") ? 0x1a1016 : 0x0f141c;
  g.fillStyle(base,1).fillRect(0,0,W,H);
  const tile = 16;
  for (let y=0; y<H; y+=tile){
    for (let x=0; x<W; x+=tile){
      const odd = ((x/tile)+(y/tile)) % 2 === 0;
      const shade = odd ? 0x18202a : 0x131a22;
      const cr = Phaser.Display.Color.IntegerToColor(shade);
      if (variant === 'gameover') cr.darken(8);
      g.fillStyle(cr.color,1).fillRect(x,y,tile,tile);
      g.lineStyle(1,0x0b0e13,0.23).strokeRect(x,y,tile,tile);
      if (Phaser.Math.Between(0,18)===0) {
        g.lineStyle(1,0x091019,0.35);
        const wobble = Phaser.Math.Between(-6,6);
        g.lineBetween(x+Phaser.Math.Between(2,6), y+2, x+Phaser.Math.Between(10,14), y+tile-2 + wobble*0.02);
      }
    }
  }
  c.add(g);

  // 2) Antorchas
  const makeTorch = (tx,ty)=>{
    const torch = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const draw = (alpha=0.6,r=90)=>{
      torch.clear();
      torch.fillStyle(0xffd38a,0.35*alpha).fillCircle(tx,ty,r*0.36);
      torch.fillStyle(0xff9e4a,0.25*alpha).fillCircle(tx,ty,r*0.24);
      torch.fillStyle(0xff7800,0.18*alpha).fillCircle(tx,ty,r*0.14);
    };
    draw();
    scene.tweens.add({ targets: torch, duration:550, repeat:-1, yoyo:true, onUpdate:()=>{
      const a = 0.55 + Math.sin(scene.time.now*0.005)*0.08;
      const r = 84 + Math.cos(scene.time.now*0.004)*6;
      draw(a,r);
    }});
    return torch;
  };
  c.add(makeTorch(68,92));
  c.add(makeTorch(W-68,132));

  // 3) Viñeta
  const v = scene.add.graphics();
  const rings = 6; const diag = Math.hypot(W,H)/2;
  for (let i=0;i<rings;i++){
    const k = i/(rings-1); const a = 0.16 + k*0.25;
    v.lineStyle((i+1)*22,0x000000,a).strokeCircle(W/2,H/2,diag);
  }
  v.setBlendMode(Phaser.BlendModes.MULTIPLY);
  c.add(v);

  // 4) Logo pixelado
  if (withLogo && scene.textures.exists('logo_brand')){
    const logo = stampPixelLogo(scene, 'logo_brand', logoSize);
    logo.setTint(tint).setAlpha(0.92);
    logo.setPosition(W/2, Math.max(36, H*0.11));
    c.add(logo);
    c.logo = logo;
  }

  c.relayout = () => {
    const w = scene.scale.gameSize.width, h = scene.scale.gameSize.height;
    g.clear();
    g.fillStyle(base,1).fillRect(0,0,w,h);
    for (let y=0; y<h; y+=tile){
      for (let x=0; x<w; x+=tile){
        const odd = ((x/tile)+(y/tile)) % 2 === 0;
        const shade = odd ? 0x18202a : 0x131a22;
        const cr = Phaser.Display.Color.IntegerToColor(shade);
        if (variant === 'gameover') cr.darken(8);
        g.fillStyle(cr.color,1).fillRect(x,y,tile,tile);
        g.lineStyle(1,0x0b0e13,0.23).strokeRect(x,y,tile,tile);
      }
    }
    v.clear();
    const diag2 = Math.hypot(w,h)/2;
    for (let i=0;i<rings;i++){
      const k = i/(rings-1); const a = 0.16 + k*0.25;
      v.lineStyle((i+1)*22,0x000000,a).strokeCircle(w/2,h/2,diag2);
    }
    if (c.logo) c.logo.setPosition(w/2, Math.max(36, h*0.11));
  };

  return c;
}

export function stampPixelLogo(scene, key, finalWidth=180){
  const tex = scene.textures.get(key);
  if (!tex) return scene.add.container();
  const src = tex.getSourceImage();
  const ratio = src.height / src.width;
  const smallW = Math.max(32, Math.round(finalWidth/4));
  const smallH = Math.round(smallW * ratio);
  const rtSmall = scene.make.renderTexture({ width: smallW, height: smallH, add:false });
  const tmp = scene.add.image(0,0,key).setOrigin(0).setDisplaySize(smallW, smallH);
  rtSmall.draw(tmp,0,0); tmp.destroy();
  const bigKey = `logo_px_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  rtSmall.saveTexture(bigKey); rtSmall.destroy();
  return scene.add.image(0,0,bigKey).setOrigin(0.5).setDisplaySize(finalWidth, Math.round(finalWidth*ratio));
}
