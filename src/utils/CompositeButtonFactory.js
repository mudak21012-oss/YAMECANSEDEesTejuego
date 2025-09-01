export class CompositeButtonFactory {
  constructor(scene){ this.scene = scene; }

  // Map logical variant to base sheet names (without .png, already loaded)
  map(){
    return {
      green:   { text:'green_buttons_text', icons:'green_buttons_icons' },
      metal:   { text:'metal_buttons_text', icons:'metal_buttons_icons' },
      orange:  { text:'orange_button_text', icons:'orange_button_icons' },
      pink:    { text:'pink_buttons_text', icons:'pink_buttons_icons' },
      purple:  { text:'purple_buttons_text', icons:'purple_buttons_icons' }
    };
  }

  // Extract a single button slice by rectangle. Developer can tweak coords array.
  // coords: { x,y,w,h, iconX, iconY, iconW, iconH }
  buildFrom(sheetKey, { x,y,w,h }){
    const rt = this.scene.make.renderTexture({ width:w, height:h, add:false });
    rt.draw(sheetKey, -x, -y); // negative offset to crop
    const key = `${sheetKey}_${x}_${y}_${w}_${h}`;
    if (!this.scene.textures.exists(key)) rt.saveTexture(key); else rt.saveTexture(key+"_dup");
    rt.destroy();
    return key;
  }

  makeButton(x,y,{ variant='green', label='JUGAR', index=0, onClick=()=>{} }={}){
    const mp = this.map()[variant];
    if (!mp) throw new Error('Variant desconocida: '+variant);
    // Placeholder simple strategy: assume vertical stack of buttons each height 148 (like earlier guess)
    const baseH = 148; const baseW = 640; const padTop = 40; const gap = 20; // heuristics
    const sliceY = padTop + index*(baseH+gap);
    const rect = { x:40, y:sliceY, w:baseW, h:baseH };
    const texKey = this.buildFrom(mp.text, rect);
    const img = this.scene.add.image(0,0,texKey).setOrigin(0.5);
    const targetW = 420;
    const s = targetW / img.width * 0.5; // scale down
    img.setScale(s);
    const text = this.scene.add.bitmapText(0,0,'casual',label.toUpperCase(),32).setOrigin(0.5).setTint(0xffffff);
    if (text.getTextBounds().local.width > targetW*0.55){
      let fs=text.fontSize; while(fs>12 && text.getTextBounds().local.width>targetW*0.55){ fs--; text.setFontSize(fs);} }
    const c = this.scene.add.container(x,y,[img,text]);
    const bw = img.displayWidth; const bh = img.displayHeight;
    c.setSize(bw,bh).setInteractive(new Phaser.Geom.Rectangle(-bw/2,-bh/2,bw,bh), Phaser.Geom.Rectangle.Contains);
    c.input.cursor='pointer';
    const baseY=y;
    c.on('pointerover', ()=> c.setScale(1.02));
    c.on('pointerout', ()=> { c.setScale(1); c.y=baseY; });
    c.on('pointerdown', ()=> c.y=baseY+2);
    c.on('pointerup', ()=> { c.y=baseY; onClick?.(); });
    return c;
  }
}
