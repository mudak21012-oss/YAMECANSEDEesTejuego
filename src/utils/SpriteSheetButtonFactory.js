export class SpriteSheetButtonFactory {
  constructor(scene){ this.scene = scene; }

  // Define manual slices (x,y,w,h) for variants extracted from the reference image.
  // Coordinates are heuristic; adjust after visual test. User can refine.
  variants(){
    return {
      amber:   { x:40,  y:40,  w:640, h:148 },
      aqua:    { x:40,  y:220, w:640, h:148 },
      emerald: { x:40,  y:400, w:640, h:148 },
      violet:  { x:40,  y:580, w:640, h:148 },
      sunset:  { x:40,  y:760, w:640, h:148 }
    };
  }

  ensureTextures(){
    if (!this.scene.textures.exists('btn_sheet')) return false;
    const base = this.scene.textures.get('btn_sheet').getSourceImage();
    if (!base) return false;
    const variants = this.variants();
    const keyPrefix = 'btn_slice_';
    for (const [k,v] of Object.entries(variants)){
      const key = keyPrefix + k;
      if (this.scene.textures.exists(key)) continue;
      // Draw slice into RT to preserve filtering off
      const rt = this.scene.make.renderTexture({ width:v.w, height:v.h, add:false });
      rt.draw('btn_sheet', v.x, v.y);
      rt.saveTexture(key); rt.destroy();
    }
    return true;
  }

  makeButton(x,y,{ variant='emerald', label='BUTTON', fontKey='casual', scale=0.42, onClick=()=>{} }={}){
    const ok = this.ensureTextures();
    const texKey = ok && this.scene.textures.exists('btn_slice_'+variant) ? 'btn_slice_'+variant : null;
    let img;
    const targetW = 380; // normalized final width
    if (texKey){
      img = this.scene.add.image(0,0,texKey).setOrigin(0.5);
      const s = targetW / img.width * scale;
      img.setScale(s);
    } else {
      img = this.scene.add.rectangle(0,0, targetW, Math.round(targetW*0.28), 0x333333).setStrokeStyle(2,0xffffff,0.25);
    }
    const text = this.scene.add.bitmapText(0,0,fontKey,label.toUpperCase(),32).setOrigin(0.5).setTint(0xffffff);
    // Auto shrink if wider than 70% of button interior
    if (text.getTextBounds().local.width > targetW*0.65){
      let fs = text.fontSize;
      while(fs>10 && text.getTextBounds().local.width > targetW*0.65){ fs--; text.setFontSize(fs); }
    }
    const c = this.scene.add.container(x,y,[img,text]);
    const bw = img.displayWidth || targetW;
    const bh = img.displayHeight || Math.round(targetW*0.28);
    c.setSize(bw,bh).setInteractive(new Phaser.Geom.Rectangle(-bw/2,-bh/2,bw,bh), Phaser.Geom.Rectangle.Contains);
    c.input.cursor='pointer';
    const baseY = y;
    c.on('pointerover', ()=> c.setScale(1.03));
    c.on('pointerout',  ()=> { c.setScale(1); c.y=baseY; });
    c.on('pointerdown', ()=> c.y=baseY+2);
    c.on('pointerup',   ()=> { c.y=baseY; onClick?.(); });
    return c;
  }
}
