import { authLogin, authRegister } from "../services/AuthFacade.js";
import { makePixelPanel } from "../utils/pixelPanel.js";

/* PixelAuthPanel: formulario de Login / Registro 100% en canvas (sin DOM),
   usando bitmap font y captura básica de teclado. */
export default class PixelAuthPanel {
  constructor(scene, { mode='login', x, y, onSuccess, onClose } = {}){
    this.scene = scene; this.mode = mode; this.onSuccess = onSuccess; this.onClose = onClose;
    this.x = x ?? scene.scale.width/2; this.y = y ?? (scene.scale.height*0.60);
    this.maxW = 360;
    this.build();
  }

  build(){
    const s = this.scene;
    this.container = s.add.container(this.x, this.y).setDepth(120);
  const panelH = this.computePanelHeight();
  this.panel = makePixelPanel(s, this.maxW, panelH, 'slate').setAlpha(0.94).setOrigin(0.5);
    this.title = s.add.bitmapText(0, -94, 'casual', this.mode==='login'? 'LOGIN':'REGISTRO', 28).setOrigin(0.5).setTint(0xffffff);
    this.msg = s.add.bitmapText(0, 72, 'casual', '', 16).setOrigin(0.5).setTint(0xaec7dd);
    this.container.add([this.panel, this.title, this.msg]);

    // Campos
  this.fields = this.buildFieldList();
    this.focus = 0;
    this.fieldTexts = [];
    const baseY = -44;
    this.fields.forEach((f,i)=>{
      const fy = baseY + i*40;
      const label = s.add.bitmapText(-this.maxW/2+18, fy, 'casual', f.label+':', 18).setOrigin(0,0.5).setTint(0xcfe3ff);
      const boxW = this.maxW - 140;
      const box = s.add.rectangle(0, fy, boxW, 30, 0x14212b, 1).setStrokeStyle(2, 0x2e4a5b, 1);
      const txt = s.add.bitmapText(0, fy, 'casual', '', 18).setOrigin(0.5).setTint(0xffffff);
      txt.maxWidth = boxW - 20;
      box.setInteractive({ cursor:'text' }).on('pointerdown', ()=> { this.focus = i; this.refreshFields(); });
      this.container.add([label, box, txt]);
      this.fieldTexts.push({ label, box, txt });
    });

    // Botones acción
    this.btnPrimary = this.makeMiniButton(0, 110, this.mode==='login'? 'ENTRAR':'CREAR', ()=> this.submit());
    this.btnSwap = this.makeMiniButton(-this.maxW/2+70, 110, this.mode==='login'? 'REG':'LOG', ()=> this.swapMode());
    this.btnCancel = this.makeMiniButton(this.maxW/2-60, -100, 'X', ()=> this.close(), 26, 0xcf5f5f);

    this.refreshFields();
    this.installResize();
    this.keyHandler = (e)=> this.handleKey(e);
    window.addEventListener('keydown', this.keyHandler);
    this.startCaret();
  }

  computePanelHeight(){
    const rows = (this.mode==='login')? 2 : 3;
    return 170 + (rows-2)*40; // base grows with extra field
  }

  buildFieldList(){
    const list = [
      { key:'nombre', label:'Nombre', value:'', max:24, secret:false },
      { key:'password', label:'Contraseña', value:'', max:40, secret:true }
    ];
    if(this.mode==='register') list.push({ key:'contacto', label:'Contacto', value:'', max:40, secret:false });
    return list;
  }

  installResize(){
    this.resizeHandler = (gameSize)=>{
      const { width, height } = gameSize;
      this.container.setPosition(width/2, height*0.60);
    };
    this.scene.scale.on('resize', this.resizeHandler);
  }

  startCaret(){
    const s=this.scene;
    this.caret = s.add.rectangle(0,0,10,18,0xffffff,0.85).setOrigin(0,0.5).setDepth(140);
    this.container.add(this.caret);
    this.caretTimer = s.time.addEvent({ delay:500, loop:true, callback:()=>{ if(this.caret) this.caret.visible=!this.caret.visible; } });
    this.positionCaret();
  }

  positionCaret(){
    if(!this.caret) return;
    const ft = this.fieldTexts[this.focus]; if(!ft) return;
    const f = this.fields[this.focus];
    const shown = f.secret? '*'.repeat(f.value.length) : f.value;
    const textObj = ft.txt;
    const bounds = textObj.getTextBounds().local;
    const offset = Math.min((bounds.width||0)/2 + 4, (ft.box.width/2)-10);
    this.caret.setPosition(textObj.x + offset, textObj.y);
  }

  makeMiniButton(x,y,label,onClick,size=24,color=0x62e6b3){
    const g=this.scene.add.graphics();
    g.fillStyle(color,1).fillRoundedRect(-46,-18,92,36,12);
    g.lineStyle(2,0x0d1b22,0.8).strokeRoundedRect(-46,-18,92,36,12);
    const key='pxab_'+Math.random().toString(36).slice(2); g.generateTexture(key,92,36); g.destroy();
    const img=this.scene.add.image(x,y,key).setTint(color).setOrigin(0.5);
    const txt=this.scene.add.bitmapText(x,y,'casual',label, size>=24?22:18).setOrigin(0.5).setTint(0x0f1a15);
    const c=this.scene.add.container(0,0,[img,txt]).setDepth(130);
    c.setSize(92,36).setInteractive({ cursor:'pointer' }).on('pointerdown', ()=> onClick?.());
    this.container.add(c); return c;
  }

  refreshFields(){
    this.fieldTexts.forEach((ft,i)=>{
      const f = this.fields[i];
      const shown = f.secret ? '*'.repeat(f.value.length) : f.value;
      ft.txt.setText(shown || '');
      ft.box.setFillStyle(i===this.focus? 0x1f3442:0x14212b);
      ft.box.setStrokeStyle(2, i===this.focus? 0x4d90b2:0x2e4a5b, 1);
    });
  this.positionCaret();
  }

  handleKey(e){
    if(!this.container?.active) return;
  if(e.key==='Tab'){ e.preventDefault(); this.focus = (this.focus+1)%this.fields.length; this.refreshFields(); return; }
    if(e.key==='Enter'){ this.submit(); return; }
    if(e.key==='Escape'){ this.close(); return; }
    if(e.key==='Backspace'){
      const f=this.fields[this.focus]; f.value = f.value.slice(0,-1); this.refreshFields(); return; }
  if(e.key.length===1 && !e.altKey && !e.metaKey && !e.ctrlKey && !e.repeat){
      const f=this.fields[this.focus];
      if(f.value.length < f.max && /[\p{L}\d _.-]/u.test(e.key)){
        f.value += e.key; this.refreshFields();
      }
    }
  }

  async submit(){
    const nombre = this.fields.find(f=>f.key==='nombre')?.value.trim();
    const password = this.fields.find(f=>f.key==='password')?.value;
    const contacto = this.fields.find(f=>f.key==='contacto')?.value || '';
    if(!nombre || nombre.length<3){ return this.say('Nombre corto', 0xffb4b4); }
    this.say(this.mode==='login'? 'Ingresando...':'Registrando...');
    let res;
    try {
      res = this.mode==='login'? await authLogin({ nombre, password }) : await authRegister({ nombre, password, contacto });
    } catch(err){ res={ ok:false, error:'Error red'}; }
    if(res.ok){ this.say('Listo', 0x9bf6a3); this.scene.time.delayedCall(250, ()=> { this.onSuccess?.(res.user); this.close(); }); }
    else this.say(res.error||'Error', 0xffb4b4);
  }

  say(text, color=0xaec7dd){ this.msg.setText(text); this.msg.setTint(color); }

  swapMode(){
    this.mode = this.mode==='login'? 'register':'login';
    // Limpiar elementos campo
    this.fieldTexts.forEach(ft=> { ft.label.destroy(); ft.box.destroy(); ft.txt.destroy(); });
    this.fieldTexts.length=0;
    this.fields = this.buildFieldList(); this.focus=0;
    // Redimensionar panel
    const newH = this.computePanelHeight();
    this.panel.setDisplaySize(this.maxW, newH);
    const baseY=-44;
    this.fields.forEach((f,i)=>{
      const fy=baseY+i*40;
      const label=this.scene.add.bitmapText(-this.maxW/2+18, fy, 'casual', f.label+':', 18).setOrigin(0,0.5).setTint(0xcfe3ff);
      const boxW=this.maxW-140;
      const box=this.scene.add.rectangle(0, fy, boxW, 30, 0x14212b,1).setStrokeStyle(2,0x2e4a5b,1).setInteractive({ cursor:'text' }).on('pointerdown', ()=>{ this.focus=i; this.refreshFields(); });
      const txt=this.scene.add.bitmapText(0, fy, 'casual','',18).setOrigin(0.5).setTint(0xffffff); txt.maxWidth=boxW-20;
      this.container.add([label,box,txt]); this.fieldTexts.push({ label,box,txt });
    });
    this.title.setText(this.mode==='login'? 'LOGIN':'REGISTRO');
    this.btnPrimary.list[1].setText(this.mode==='login'? 'ENTRAR':'CREAR');
    this.btnSwap.list[1].setText(this.mode==='login'? 'REG':'LOG');
    this.refreshFields(); this.say('');
  }

  close(){
    window.removeEventListener('keydown', this.keyHandler);
  this.scene.scale.off('resize', this.resizeHandler);
  this.caretTimer?.remove();
  this.caret?.destroy();
    this.container?.destroy();
    this.onClose?.();
  }
}