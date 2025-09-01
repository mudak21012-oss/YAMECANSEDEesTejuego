// GradientButtonFactory: genera botones gradiente redondeados con soporte de sombra y hover scale.
export class GradientButtonFactory {
  constructor(scene){
    this.scene = scene;
    this.themes = {
      blue:   { a: 0x9fd7ff, b: 0x3a83d6, text: '#0d0d0d', border: 0x1c3550 },
      green:  { a: 0x8fffa5, b: 0x3bbf58, text: '#0d1116', border: 0x1d4a2c },
      yellow: { a: 0xffef9f, b: 0xd9a530, text: '#0d0d0d', border: 0x5d4713 },
      red:    { a: 0xffb3b3, b: 0xd95757, text: '#111111', border: 0x5a1f1f },
      gray:   { a: 0xd0d4da, b: 0x7b828c, text: '#0d0d0d', border: 0x2f3439 },
      default:{ a: 0xd3d3d3, b: 0x8a8a8a, text: '#0d0d0d', border: 0x2e2e2e }
    };
  }

  // Dibuja un render texture con gradiente vertical y aplica máscara rounded, devolviendo directamente el contenedor
  drawGradientPill(w,h,radius,theme){
    const pal = this.themes[theme] || this.themes.default;
    const rt = this.scene.make.renderTexture({ width: w, height: h, add: false });
    for (let y=0; y<h; y++) {
      const colObj = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(pal.a),
        Phaser.Display.Color.ValueToColor(pal.b), h-1, y
      );
      const hex = (colObj.r<<16)|(colObj.g<<8)|colObj.b;
      rt.fill(hex,1,0,y,w,1);
    }
    const texKey = `gradpill_${w}x${h}_${theme}_${Math.random().toString(36).slice(2)}`;
    rt.saveTexture(texKey); rt.destroy();
    const img = this.scene.add.image(0,0,texKey).setOrigin(0.5);
    const gMask = this.scene.make.graphics({ add:false });
    gMask.fillStyle(0xffffff,1).fillRoundedRect(-w/2,-h/2,w,h,radius);
    img.setMask(gMask.createGeometryMask());
    const border = this.scene.add.graphics();
    border.lineStyle(2, pal.border, 0.9).strokeRoundedRect(-w/2,-h/2,w,h,radius);
    return this.scene.add.container(0,0,[img,border]);
  }

  // Método make reemplazado según especificación
  make(x, y, {
    label="BUTTON", theme="blue", onClick=()=>{},
    w=240, h=48, radius=20, fontSize=18, shadow=true, hoverScale=1.02
  } = {}) {
    let shadowImg=null;
    if (shadow) {
      const sg=this.scene.add.graphics();
      sg.fillStyle(0x000000,0.28).fillRoundedRect(4,6,w,h,radius);
      const srt=this.scene.make.renderTexture({width:w+12,height:h+12,add:false});
      srt.draw(sg,0,0); sg.destroy();
      const skey=`cta_shadow_${Math.random().toString(36).slice(2)}`;
      srt.saveTexture(skey); srt.destroy();
      shadowImg=this.scene.add.image(0,0,skey).setOrigin(0.5);
    }
    const bg=this.drawGradientPill(w,h,radius,theme);
    const txt=this.scene.add.text(0,0,label,{fontSize:`${fontSize}px`,color:this.themes[theme]?.text??"#0d0d0d",fontStyle:"bold"}).setOrigin(0.5);
    const c=this.scene.add.container(x,y,shadowImg?[shadowImg,bg,txt]:[bg,txt]);
    c.setSize(w,h).setInteractive(new Phaser.Geom.Rectangle(-w/2,-h/2,w,h), Phaser.Geom.Rectangle.Contains);
    const baseY=y;
    c.on("pointerover",()=>c.setScale(hoverScale));
    c.on("pointerout", ()=>{c.setScale(1); c.y=baseY; bg.clearTint(); txt.clearTint();});
    c.on("pointerdown",()=>{c.y=baseY+2; bg.setTint(0xeeeeee); txt.setTint(0xffffff);});
    c.on("pointerup",  ()=>{c.y=baseY; bg.clearTint(); txt.clearTint(); onClick?.();});
    return c;
  }
}
