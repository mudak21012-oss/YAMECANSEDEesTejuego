import { getProfile, getLastScores, uploadAvatar, saveCharacter, saveName } from "../services/profileService.js";
import { PixelUiFactory } from "../utils/PixelUiFactory.js";

// UserPanel ampliado 336x196 con subtítulo y selector "Personaje".
export default class UserPanel {
  constructor(scene, { userId, shopUrl = "https://hoho3d.com.ar/tienda", x = 16, y = 16 }) {
    this.scene = scene; this.userId = userId; this.shopUrl = shopUrl;
  // Ajuste refinado: un poco más ancho y líneas más respiradas
  this.W = 352; this.H = 212; this.pad = 12; this.line = 26; // altura extendida para avatar más grande y botones nuevos
    if(!scene.textures.exists('__WHITE')){ const gTmp=scene.add.graphics(); gTmp.fillStyle(0xffffff,1).fillRect(0,0,2,2); gTmp.generateTexture('__WHITE',2,2); gTmp.destroy(); }
  // Profundidad menor que los botones del menú (que están en uiRoot depth 10) para no taparlos
  this.root = scene.add.container(x, y).setDepth(8);
  // Panel base (expandido: +4px arriba/abajo, +2px a la derecha)
  const extraTop = 4, extraBottom = 4, extraRight = 2;
  const outerW = this.W + extraRight;
  const outerH = this.H + extraTop + extraBottom;
  const g = scene.add.graphics();
  // Sombra desplazada también hacia arriba
  g.fillStyle(0x000000, 0.35).fillRoundedRect(2, 4 - extraTop, outerW, outerH, 12);
  g.fillStyle(0x202932, 0.96).fillRoundedRect(0, -extraTop, outerW, outerH, 12);
  g.lineStyle(2, 0x0d1217, 1).strokeRoundedRect(0, -extraTop, outerW, outerH, 12);
    this.root.add(g);
    // Avatar
  const avX = this.pad + 4, avY = this.pad + 4, AVS = 80; // avatar ampliado
  this.avatar = scene.add.image(avX, avY, "__WHITE").setOrigin(0).setDisplaySize(AVS, AVS);
  // Simplificamos: quitamos máscaras y recortamos en origen (canvas) al guardar textura.
    const ring = scene.add.graphics(); ring.lineStyle(3, 0x8cc6ff, 1).strokeCircle(avX + AVS / 2, avY + AVS / 2, AVS / 2 + 2);
  // Botón FOTO (debajo y centrado respecto al avatar)
  const bW = 66, bH = 24, bX = avX + (AVS - bW)/2, bY = avY + AVS + 10; // bajar 4px
    const bG = scene.add.graphics();
    bG.fillStyle(0xf4c361, 1).fillRoundedRect(bX, bY, bW, bH, 8);
    bG.lineStyle(2, 0x8a5f17, 1).strokeRoundedRect(bX, bY, bW, bH, 8);
    const bTxt = scene.add.bitmapText(bX + bW / 2, bY + 3, "casual", "FOTO", 14).setOrigin(0.5, 0).setTint(0x101319);
    this.btnPhoto = scene.add.zone(bX, bY, bW, bH).setOrigin(0).setInteractive();
    // Nombre
  const nameX = avX + AVS + 14, nameY = avY + 2; // ajuste vertical base columnas
  this.nameTxt = scene.add.bitmapText(nameX + 17, nameY - 10, "casual", "Jugador", 20).setTint(0xffffff).setInteractive({ useHandCursor:true }); // editable
  this.nameTxt.on('pointerup', ()=> this._promptEditName());
  // Subtítulo + filas: mantener filas donde estaban pero subir y achicar el rótulo para mayor separación visual
  const rowBase = nameY + 46; // posición base usada para filas (no cambiar para conservar filas)
  const subtitleLift = 16; // levantar subtítulo un poco más (antes 12)
    this.subTxt = scene.add.bitmapText(this.nameTxt.x, rowBase - subtitleLift, "casual", "ULTIMOS PUNTOS", 12).setTint(0xcfe3ff); // sin tilde para que se vea la U en la fuente
    // Filas de puntos
    const colLeftX = this.nameTxt.x; // alinear con "Jugador"
  // Acercar aún más la columna de puntajes (4px adicionales)
  const colRightX = this.W - this.pad - 56;
    // Filas combinadas: fecha y puntos juntos "DD/MM / 123" (más pequeñas, desplazadas 8px a la derecha)
    this.rows = [0,1,2].map(i=>{
      const y0 = rowBase + 10 + i*this.line;
      // desplazado 20px a la derecha (antes 32) para acercarlo hacia la izquierda
      const line = scene.add.bitmapText(colLeftX, y0, 'casual', '--/--/-- / 0', 12)
        .setTint(0xd0d4d8)
        .setAlpha(0.9);
      this.root.add(line);
      return { line };
    });
    // Re-centrar subtítulo tras conocer ancho real (ajuste después de mover columnas 4px)
    try {
      const mid = colLeftX + (colRightX - colLeftX) / 2;
      const w = this.subTxt.getTextBounds?.().local.width || this.subTxt.width;
      this.subTxt.x = Math.round(mid - w/2);
    } catch(_) {}
  // Botones inferiores (usar PixelUiFactory)
  const UI = scene.UI || new PixelUiFactory(scene,4);
  const bottomY = this.H - 38; // línea base de botones
  // Botón TIENDA más pequeño
  this.btnShop = UI.makeButton(0,0,{ label:'TIENDA', theme:'mint', w:130, h:36, radius:12, size:18, onClick:()=> window.open(this.shopUrl,'_blank'), pulseLight:false });
  this.btnShop.setPosition(this.pad + this.btnShop._btnW/2 + 2, bottomY); // desplazado 2px a la derecha
  // Botón Personaje (muestra selección actual o palabra "PERSONAJE")
  this.options=['Heroe','Maga','Rogue']; this.selIdx=-1; this.charMenu=null;
  this.charButton = UI.makeButton(0,0,{ label:'PERSONAJE', theme:'cobalt', w:160, h:36, radius:12, size:16, onClick:()=> this.toggleCharacterMenu(), pulseLight:false });
  // Reubicar botón PERSONAJE cerca de TIENDA (gap fijo)
  const gapBtns = 16;
  let charX = this.btnShop.x + (this.btnShop._btnW/2) + gapBtns + (this.charButton._btnW/2) + 2; // desplazar 2px extra
  const maxX = this.W - this.pad - this.charButton._btnW/2;
  if(charX > maxX) charX = maxX; // clamp por si se excede
  this.charButton.setPosition(charX, bottomY);
    // Ensamblar
  this.root.add([this.avatar, ring, bG, bTxt, this.btnPhoto, this.nameTxt, this.subTxt, this.btnShop, this.charButton]);
  // Interacciones adicionales
    // Input file oculto
    const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.style.display='none'; document.body.appendChild(input);
    this.btnPhoto.on('pointerup',()=> input.click());
  input.addEventListener('change', async e=>{ const file=e.target.files?.[0]; if(!file) return; try{ const url = await uploadAvatar(this.userId,file); await this._loadAvatar(url); scene.events.emit('user:avatarChanged'); }catch(err){ console.warn('uploadAvatar',err);} input.value=''; });
    // Resize
  // Mantener coordenadas iniciales recibidas (no reubicar automáticamente) para evitar "salto" posterior.
    // Carga inicial
    this.refresh().then(()=> scene.events.emit('user:ready'));
  }
  layoutTopLeft(){}
  async refresh(profile){
    try{
      const p=profile ?? await getProfile(this.userId);
  console.log('[UserPanel.refresh] perfil avatar_url=', p?.avatar_url);
      const name=(p?.nombre||'Jugador').trim();
      this.nameTxt.setText(this._fit(this._glyphSafe(name),18));
      // Fallback: si perfil no trae avatar_url usar valor en session local.
      let avatarUrl = p?.avatar_url;
      if(!avatarUrl){
        try { const ses = JSON.parse(localStorage.getItem('hoho3d_user')||'null'); avatarUrl = ses?.avatar_url||null; } catch {}
      }
  // Añadir parámetro de busting sólo al cargar (no lo guardamos en DB)
  if(avatarUrl && !/[?&]t=/.test(avatarUrl)){ avatarUrl = avatarUrl + `?t=${Date.now()}`; }
  await this._loadAvatar(avatarUrl);
      const list=await getLastScores(this.userId,3);
  list.forEach((s,i)=>{ const d=new Date(s.fecha); const dd=d.toLocaleDateString(undefined,{day:'2-digit',month:'2-digit',year:'2-digit'}); this.rows[i]?.line.setText(`${dd} / ${this._sep(s.puntos)}`); });
  // Si el perfil trae character, sincronizar selección
  if(p?.character){ this.setCharacter(p.character, true); }
    }catch(e){ console.warn('UserPanel.refresh', e); }
  }
  async _loadAvatar(url){
    const scene=this.scene; const BASE=`avatar_${this.userId}`; const TARGET=80;
    this._avatarLoadSeq = (this._avatarLoadSeq||0)+1; const seq=this._avatarLoadSeq;
    if(url){
      return new Promise(resolve=>{
        const img=new Image(); img.crossOrigin='anonymous';
        img.onload=()=>{
          if(seq!==this._avatarLoadSeq){ return resolve(); } // otro load más nuevo ganó
          const cnv=document.createElement('canvas');
          const size=TARGET; cnv.width=size; cnv.height=size;
          const ctx=cnv.getContext('2d'); ctx.imageSmoothingEnabled=false;
          ctx.beginPath(); ctx.arc(size/2,size/2,size/2,0,Math.PI*2); ctx.closePath(); ctx.clip();
          const r=Math.max(size/img.width,size/img.height); const dw=img.width*r, dh=img.height*r;
          ctx.drawImage(img,(size-dw)/2,(size-dh)/2,dw,dh);
          const dataUrl=cnv.toDataURL('image/png');
          const oldKey=this._currentAvatarKey;
          const newKey = `${BASE}_v${Date.now()}`;
          try { scene.textures.addBase64(newKey, dataUrl); } catch(e){ console.warn('addBase64 fail', e); return resolve(); }
          this._currentAvatarKey=newKey;
          // Aplicar textura cuando exista (casi inmediato)
          if(scene.textures.exists(newKey)){
            this.avatar.setTexture(newKey).setDisplaySize(TARGET,TARGET);
          } else {
            scene.textures.once(Phaser.Textures.Events.ADD, (tex)=>{ if(tex.key===newKey){ this.avatar.setTexture(newKey).setDisplaySize(TARGET,TARGET); } });
          }
          // Borrar la vieja tras un frame para no invalidar glTexture en uso
          if(oldKey && oldKey!==newKey){ scene.time.delayedCall(100, ()=>{ if(scene.textures.exists(oldKey)) scene.textures.remove(oldKey); }); }
          resolve();
        };
        img.onerror=()=>{ console.warn('Avatar load error, usando placeholder'); if(seq===this._avatarLoadSeq) this._loadAvatar(); resolve(); };
        img.src=url;
      });
    }
    // Placeholder (iniciales) tamaño 80
    const initials=(this.nameTxt.text||'J').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
  const g=scene.add.graphics(); g.fillStyle(0x5aa7ff,1).fillCircle(TARGET/2,TARGET/2,TARGET/2);
  const t=scene.add.bitmapText(TARGET/2,18,'casual',initials,24).setOrigin(0.5,0).setTint(0x0e1420);
    const rt=scene.make.renderTexture({width:TARGET,height:TARGET,add:false}); rt.draw(g,0,0); rt.draw(t,0,0); t.destroy(); g.destroy();
  const ph=`avatar_ph_${this.userId}`;
  if(scene.textures.exists(ph)) scene.textures.remove(ph);
  rt.saveTexture(ph); rt.destroy();
    this.avatar.setTexture(ph).setDisplaySize(TARGET,TARGET);
  }
  _sep(n){ return (n??0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  _glyphSafe(s){
    // Si el bitmap font no trae acentos, reemplazar por versiones sin tilde
    if(!s) return s;
    return s
      .replace(/Á/g,'A').replace(/É/g,'E').replace(/Í/g,'I').replace(/Ó/g,'O').replace(/Ú/g,'U')
      .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u');
  }
  toggleCharacterMenu(){
    if(this.charMenu){ this.closeCharacterMenu(); return; }
    const menuW = this.charButton._btnW; const itemH=20; const margin=6;
    const anchorX = this.charButton.x - menuW/2;
    const anchorY = this.charButton.y - this.charButton._btnH/2 - (this.options.length*itemH + margin*2 + 8);
    const g = this.scene.add.graphics();
    g.fillStyle(0x0d141c,0.94).fillRoundedRect(0,0,menuW, this.options.length*itemH + margin*2, 10);
    g.lineStyle(2,0x1f2d3a,1).strokeRoundedRect(0,0,menuW, this.options.length*itemH + margin*2, 10);
    const container = this.scene.add.container(anchorX, anchorY, [g]).setDepth(this.root.depth + 2);
    this.options.forEach((opt,i)=>{
      const txt = this.scene.add.bitmapText(menuW/2, margin + i*itemH, 'casual', opt.toUpperCase(), 16)
        .setOrigin(0.5,0)
        .setTint(0xcfe3ff)
        .setInteractive({ useHandCursor:true })
        .on('pointerover',()=> txt.setTint(0xffffff))
        .on('pointerout',()=> txt.setTint(0xcfe3ff))
        .on('pointerup',()=>{ this.setCharacter(opt); this.closeCharacterMenu(); });
      container.add(txt);
    });
    this.root.add(container); this.charMenu=container;
    this._charOutsideHandler = (pointer)=>{
      if(!this.charMenu) return;
      const b = container.getBounds();
      if(pointer.x < b.x || pointer.x > b.right || pointer.y < b.y || pointer.y > b.bottom){ this.closeCharacterMenu(); }
    };
    this.scene.input.on('pointerdown', this._charOutsideHandler);
  }
  closeCharacterMenu(){
    if(this.charMenu){ this.charMenu.destroy(); this.charMenu=null; }
    if(this._charOutsideHandler){ this.scene.input.off('pointerdown', this._charOutsideHandler); this._charOutsideHandler=null; }
  }
  setCharacter(opt, silent=false){
    const idx = this.options.indexOf(opt);
    if(idx>=0){ this.selIdx=idx; const label = opt.toUpperCase(); this.charButton.list?.forEach?.(c=>{ if(c?.setText && c.text){ /* skip */ } });
      // Cambiar texto del bitmap dentro del botón
      const bmp = this.charButton.list.find(n=> n.type==='BitmapText');
      if(bmp) bmp.setText(label);
      if(!silent){
        saveCharacter(this.userId, opt).catch(e=> console.warn('saveCharacter', e));
      }
      this.scene.events.emit('character:change', opt); }
  }
  async _promptEditName(){
    const current = this.nameTxt.text;
    const nuevo = prompt('Nombre de jugador:', current);
    if(nuevo==null) return;
    try{
      const saved = await saveName(this.userId, nuevo);
      this.nameTxt.setText(this._fit(this._glyphSafe(saved),18));
    }catch(e){ alert('Error guardando nombre'); console.warn(e); }
  }
  _fit(s,max){ return s.length<=max ? s : s.slice(0,max-1)+'…'; }
  setPosition(x,y){ this.root.setPosition(x,y); }
  destroy(){ this.root.destroy(); }
}
