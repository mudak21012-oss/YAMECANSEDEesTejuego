import { PixelUiFactory } from "../utils/PixelUiFactory.js";
import LeaderboardPanel from "../ui/LeaderboardPanel.js";
import { authGetSession, authLogout } from "../services/AuthFacade.js";
import UserPanel from "../ui/UserPanel.js";
import PixelAuthPanel from "../ui/PixelAuthPanel.js"; // (mantener import para evitar romper dependencias cruzadas)
import { getSupabase } from "../services/supabaseClient.js";
import { stampPixelLogo } from "../utils/pixelLogo.js";
import { getSoundManager } from "../audio/SoundManager.js";
import IntroPlayer from "../ui/IntroPlayer.js";

export default class MenuScene extends Phaser.Scene {
  constructor(){ super("Menu"); }
  _caretBlink = false;
  _caretTimer = null;

  async create(data){
  // Flag para controlar si la sesión persiste entre reloads.
  const PERSIST_SESSION = false; // cambia a true si quieres recordar login
  if(!PERSIST_SESSION){ try { localStorage.removeItem('hoho3d_user'); } catch {} }
    // Nitidez pixel
    this.cameras.main.roundPixels = true;
    // Desactivar smoothing canvas 2D
    try { const ctx = this.game.canvas?.getContext?.('2d'); if(ctx) ctx.imageSmoothingEnabled = false; } catch(_) {}

    const W=this.scale.width, H=this.scale.height;

    // --- VIDEO fondo FULL COVER ---
    if (this.cache.video.exists('menu_bg_vid')) {
      this.bg = this.add.video(W/2, H/2, 'menu_bg_vid')
        .setOrigin(0.5)
        .setDepth(-20)
        .setMute(true)
        .setLoop(true);
      const startPlay = ()=> { try { const p=this.bg.play(true); if(p?.catch) p.catch(()=>{}); } catch(_){} };
      startPlay();
      const applyCover = ()=> this.fitCoverVideo(this.bg, this.scale.width, this.scale.height);
      this.bg.on('play', applyCover);
      this.time.addEvent({ delay:140, repeat:25, callback:()=>{ if(!this.bg) return; if(this.bg.video?.videoWidth){ applyCover(); } } });
      this.scale.on('resize', applyCover);
      applyCover();
      this.bg.on('error', ()=> this.paintFallback(W,H));
    } else {
      this.paintFallback(W,H);
    }

    // --- Dimmer + Viñeta ---
    this.dimmer = this.add.rectangle(0,0,W,H,0x000000,0.34).setOrigin(0).setDepth(-15).setScrollFactor(0); // alpha ya ajustada
    this.vignette = this.add.graphics().setDepth(-12).setScrollFactor(0);
    this.drawVignette(W,H);

    // --- UI ROOT ---
    this.uiRoot = this.add.container(0,0).setDepth(10).setScrollFactor(0);

    // Logo
    const logoW = Math.min(260, Math.floor(H*0.22));
    let logoKey = null;
    if (this.textures.exists('logo_mark')) logoKey = 'logo_mark';
    else if (this.textures.exists('logo_brand')) logoKey = 'logo_brand';
    if (logoKey) {
      this.logo = stampPixelLogo(this, logoKey, logoW);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x78dce8,1).fillRect(0,0,logoW, Math.round(logoW*0.4));
      g.lineStyle(4,0xffffff,0.25).strokeRect(0,0,logoW, Math.round(logoW*0.4));
      g.generateTexture('logo_placeholder_auto', logoW, Math.round(logoW*0.4));
      g.destroy();
      this.logo = this.add.image(0,0,'logo_placeholder_auto').setOrigin(0.5);
    }
    this.uiRoot.add(this.logo);
  // Usuario activo label (se mantiene oculto; reemplazado por UserPanel)
  this.userLabel = this.add.bitmapText(0,0,"casual","",18).setTint(0xa8c6dd).setOrigin(0.5,0).setDepth(11).setVisible(false);
  this.uiRoot.add(this.userLabel);

    // UI Factory & sesión
    const UI = new PixelUiFactory(this,4);
    this.UI = UI;
    this.buttons = [];
    this.session = authGetSession();
    this.authInlineMode = null;
    this.authInlineData = { nombre:"", password:"", correo:"" };
    this.authInlineFocus = 0;
    this._inlineKeyHandler = (e)=> this.handleInlineKey(e);
    this.authInlineError='';
    this.authInlinePasswordTouched=false;
    try {
      const qs = new URLSearchParams(location.search);
      if (qs.has('resetAuth')) {
        localStorage.removeItem('hoho3d_user');
        localStorage.removeItem('hoho3d_local_users');
        this.session = null;
      }
    } catch(_) {}
    this.buildButtons();

    // Música
    try {
      const sm = getSoundManager(this);
      const key = this.cache.audio.exists('bgm_menu') ? 'bgm_menu' : (this.cache.audio.exists('bgm_main') ? 'bgm_main' : 'bgm_menu');
      const startBgm = ()=> sm.playBgm(key, { volume:0.3, fade:1000 });
      if(data?.fromIntro){ this.time.delayedCall(550, startBgm); } else { startBgm(); }
      this.input.once('pointerdown', ()=>{ if(!this.sound.get(key) || !this.sound.get(key).isPlaying){ startBgm(); } });
    } catch(e){ console.warn('No BGM menu', e.message); }

    this.createVolumeButton();

  // Nuevo UserPanel Supabase si hay usuario en localStorage
  try { await this.ensureUserPanel(); } catch(e){ console.warn('UserPanel init fail', e); }

  // Leaderboard
    const sideW = 200;
    this.leader = new LeaderboardPanel(this, {
      x: W - sideW - 66,
      y: Math.max(72, this.logo.y - this.logo.displayHeight/2),
      maxW: sideW,
      title: "RANKING SEMANAL",
      subtitle: "",
      mode: 'sideWeekly'
    });
    await this.leader.loadFromSheet(10);
    this.footer = this.add.text(12,H-16,"Hoho3D",{fontSize:"12px",color:"#cbd5e1"}).setDepth(11);

    // Limpieza de rects residuales
    this.children.list.filter(o=> o.type==='Rectangle' && o !== this.dimmer).forEach(o=>{ if(o!==this.dimmer) try{o.destroy();}catch(_){} });

    // Layout inicial
    this.layoutMenu();
    this.updateUserLabel();
    this.ensureZOrder();
  this.raiseMenu();
  this.scale.on('resize', ()=> { this.layoutMenu(); this.ensureZOrder(); this.raiseMenu(); });
    this.input.on('pointerdown', (p)=> console.log('[Input] pointerdown at', p.x, p.y));

    // Badge Supabase
    this.addSupabaseBadge();


    // IntroPlayer (tarjeta flotante) si corresponde mostrar
    try {
      let force = false;
      try { const qs = new URLSearchParams(location.search); force = qs.get('intro')==='1'; } catch {}
      if (IntroPlayer.shouldShow(force) && this.cache.video.exists('intro_vid') && this.cache.audio.exists('intro_bgm')) {
        this.introPlayer = new IntroPlayer(this, { anchor:'top', maxW:0.58, maxH:0.42, rememberMs:24*60*60*1000 });
        this.events.once('intro:closed', ()=> { /* opcional: reactivar efectos */ });
      }
    } catch(e){ console.warn('IntroPlayer init fallo', e); }
  }

  async ensureUserPanel(){
    // Detectar sesión y crear o actualizar panel
    let rawUser=null; try{ rawUser = JSON.parse(localStorage.getItem('hoho3d_user')||'null'); }catch{}
    const userId = rawUser?.user_id || rawUser?.id;
    if(!userId){ if(this.userPanel){ try{ this.userPanel.root?.destroy(true); }catch{} this.userPanel=null; } return; }
    if(this.userPanel && this.userPanel.userId===userId){
      // refrescar datos en lugar de recrear
      try { await this.userPanel.refresh(); } catch(e){ console.warn('UserPanel refresh fail', e); }
      return;
    }
    // destruir antiguo si usuario cambia
    if(this.userPanel){ try{ this.userPanel.root?.destroy(true); }catch{} this.userPanel=null; }
  // Posición final deseada (antes era dinámica causando "salto" visual). La fijamos.
    const finalY = Math.max(40, Math.floor(this.scale.gameSize.height * 0.18));
    this.userPanel = new UserPanel(this, { userId, x:24, y:finalY, w:300 });
    // Pre-cargar avatar de la sesión (si existe) para feedback inmediato antes del fetch remoto.
    try {
      const ses = JSON.parse(localStorage.getItem('hoho3d_user')||'null');
      if(ses?.avatar_url){ this.userPanel._loadAvatar(ses.avatar_url); }
    } catch {}
    await this.userPanel.refresh();
  // Sin listener de resize para que permanezca estático.
  }

  // (Lógica de intro eliminada completamente)

  createVolumeButton(){
    const size=38;
    const g = this.add.graphics().setDepth(5000).setScrollFactor(0);
    const draw=(muted)=>{
      g.clear();
      // fondo con borde doble para resaltar
      g.fillStyle(0xeff4f8,0.22).fillRoundedRect(-size/2,-size/2,size,size,11);
      g.lineStyle(2,0xffffff,0.75).strokeRoundedRect(-size/2,-size/2,size,size,11);
      g.lineStyle(1,0x000000,0.35).strokeRoundedRect(-size/2+1,-size/2+1,size-2,size-2,9);
      if(muted){
        // PLAY ICON
        g.fillStyle(0xffffff,1);
        g.beginPath();
        g.moveTo(-6,-10);
        g.lineTo(12,0);
        g.lineTo(-6,10);
        g.closePath();
        g.fillPath();
      } else {
        // SPEAKER
        g.fillStyle(0xffffff,1);
        const bx=-10, by=-8; g.fillRect(bx,by,8,16);
        g.beginPath(); g.moveTo(bx+8,by); g.lineTo(bx+17,by+8); g.lineTo(bx+8,by+16); g.closePath(); g.fillPath();
        g.lineStyle(2,0xffffff,0.9);
        [12,18].forEach(r=>{ g.beginPath(); g.arc(bx+9,by+8,r,-Math.PI/4,Math.PI/4); g.strokePath(); });
      }
    };
    const container = this.add.container(0,0,[g]).setSize(size,size).setInteractive({useHandCursor:true}).setDepth(5001);
    const place=()=> container.setPosition(79,49);
    place(); this.scale.on('resize', place);
    const sm = getSoundManager(this);
    let muted = sm.muted;
    draw(muted);
    const toggle=()=>{ muted = !muted; sm.mute(muted); draw(muted); };
    container.on('pointerdown', toggle);
    container.on('pointerover', ()=> container.setScale(1.05));
    container.on('pointerout', ()=> container.setScale(1));
    this._volBtn = container;
  }

  async addSupabaseBadge(){
    const sb = getSupabase();
    let txt='SB no-client', ok=false;
    if(sb){
      try {
        const { error } = await sb.from('users').select('id',{ head:true, count:'exact' }).limit(1);
        if(!error){ ok=true; txt='SB OK'; }
        else if(/permission denied/i.test(error.message)) txt='SB rls-denied';
        else if(/does not exist/i.test(error.message)) txt='SB table-missing';
        else txt='SB '+error.message.slice(0,22);
      } catch(e){ txt='SB '+e.message.slice(0,18); }
    }
    const color = ok? '#0fa' : '#faa';
    const div = document.createElement('div');
    div.textContent = txt;
    div.style.cssText = `position:fixed;bottom:6px;right:8px;background:#08131dcc;padding:4px 8px;font:11px monospace;color:${color};border:1px solid #1f4258;border-radius:6px;z-index:9999;`; 
    document.body.appendChild(div);
    setTimeout(()=> div.remove(), 6000);
  }

  fitSpriteMax(sprite, maxW, maxH, maxScale=1){
    if (!sprite || !sprite.width) return; const s = Math.min(maxW/sprite.width, maxH/sprite.height, maxScale); sprite.setScale(s);
  }

  layoutMenu(){
    const W=this.scale.gameSize.width, H=this.scale.gameSize.height;
    // Fondo video cover & fallback
    if (this.bg && this.bg.isPlaying !== undefined) {
      this.bg.setPosition(W/2,H/2); this.fitCoverVideo(this.bg,W,H);
    } else if (this.bg?.setDisplaySize) {
      this.bg.setDisplaySize(W,H).setPosition(W/2,H/2);
    }
    this.dimmer.setSize(W,H);
    this.drawVignette(W,H);
    this.footer.setPosition(12, H-16);

  const centerX = W/2;
  const topPad  = Math.max(60, H*0.15); // bajar el bloque principal
    const logoW   = Math.min(260, Math.floor(H*0.22));
    if (this.logo.setDisplaySize) {
      const ratio = this.logo.displayHeight / this.logo.displayWidth;
      this.logo.setDisplaySize(logoW, logoW * ratio);
    }
  this.logo.setPosition(centerX, topPad + this.logo.displayHeight/2);
  // Usuario activo label
  this.userLabel.setPosition(centerX, this.logo.y + this.logo.displayHeight/2 + 6);

  // Mayor separación entre botones
  const gap = Math.max(34, Math.floor(H*0.07));
  const firstY = this.userLabel.text? (this.userLabel.y + this.userLabel.height + gap*0.35) : (this.logo.y + this.logo.displayHeight/2 + gap*0.8);
  // Ajuste solicitado: mantener COMUNIDAD (y siguientes) donde estaban y mover JUGAR hacia abajo justo encima.
  const extraAfterFirst = Math.round(gap * 1.05); // misma distancia usada antes
  this.buttons.forEach((b,i)=> {
    let y;
    if(i === 0){
      // Mover sólo JUGAR hacia abajo para que quede inmediatamente antes que COMUNIDAD sin desplazar COMUNIDAD.
      y = firstY + extraAfterFirst; 
    } else {
      // Mantener posición previa de COMUNIDAD y demás (incluye el offset extra original)
      y = firstY + gap * i + extraAfterFirst;
    }
    b.setPosition(centerX, y);
  });

  // Reposicionar botón SALIR en modo inline encima del primer campo
  if(this.authInlineMode){
    const exitBtn = this.buttons.find(b=> b._isExit);
    const firstField = this.buttons[0];
    if(exitBtn && firstField){
      exitBtn.setPosition(firstField.x - (firstField._btnW/2) + (exitBtn._btnW/2) + 4, firstField.y - firstField._btnH - 14);
    }
  }

  // Colocar título estable relativamente alto y sólo bajar la tabla para mayor separación
  if (this.leader){
    if (this.leader.mode === 'sideWeekly'){
      // Calcular ancho base según título
      let baseW = 170;
      try {
        const tBounds = this.leader.title.getTextBounds().local;
        const needed = tBounds.width + 14;
        if (needed > baseW) baseW = Math.min(needed, W - 40);
      } catch(_) {}
      baseW = Phaser.Math.Clamp(baseW, 150, 200);
  // Posición fija solicitada por el usuario para el inicio (top-left) del panel
  let sideW = Math.min(baseW * 2, W - 60, 420);
  const fixedX = 1028;
  const fixedY = 288.2179199834489; // punto exacto provisto
  this.leader.layout(fixedX, fixedY, sideW);
    } else {
      const panelW = Math.min(720, Math.floor(W*0.62));
      const panelY = Math.min(H - 280, firstY + gap*2 + 72);
      this.leader.layout((W - panelW)/2, panelY, panelW);
    }
  }

  }

  buildButtons(){
    // Limpia botones previos
    this.buttons.forEach(b=> b.destroy());
    this.buttons.length=0;
    const W=this.scale.width;
    const baseW = Phaser.Math.Clamp(Math.floor(W * 0.30), 160, 280);
    const baseH = 38; const radius = 12;
    const UI = this.UI;
    const session = this.session;
    // Log bounds
    this.buttons.forEach(b=>{ console.log('[BtnCreated]', b._btnLabel, 'size', b._btnW, b._btnH); });
    if(!session){
    // INLINE AUTH MODES
    if(this.authInlineMode){
      const mode = this.authInlineMode;
      const data = this.authInlineData;
      const mask = (t)=> '*'.repeat(t.length||0);
      const fieldDefs = mode==='login'
        ? [ {k:'nombre', hint:'USUARIO'}, {k:'password', hint:'CONTRASEÑA', secret:true} ]
        : [ {k:'nombre', hint:'USUARIO'}, {k:'password', hint:'CONTRASEÑA', secret:true}, {k:'correo', hint:'CORREO'} ];
      // Limpiar carets previos
      if(this._inlineCarets){ this._inlineCarets.forEach(c=> c.destroy()); }
      this._inlineCarets = [];
      fieldDefs.forEach((fd,idx)=>{
        const raw = data[fd.k]||'';
        const isFocus = (this.authInlineFocus===idx);
        // placeholder sólo si NO foco y vacío
        let shown;
        if(!raw && !isFocus) shown = fd.hint; else if(!raw && isFocus) shown = ''; else shown = fd.secret? mask(raw) : raw.toUpperCase();
        const theme = isFocus? (fd.secret? 'cobalt':'mint') : (fd.secret? 'slate':'amber');
        const btn = UI.makeButton(0,0,{ label: shown, theme, w:baseW, h:baseH, radius, size:18, paddingX:14, paddingY:6, letterSpacing:1, onClick:()=>{ 
          this.authInlineFocus = idx; 
          if(fd.k==='password' && !this.authInlinePasswordTouched){ this.authInlineData.password=''; this.authInlinePasswordTouched=true; }
          this.buildButtons(); this.layoutMenu(); 
        } });
        // Caret independiente para evitar cambio de ancho
        if(isFocus){
          const txtNode = btn.list.find(n=> n.type==='BitmapText');
          const caret = this.add.bitmapText(0,0,'casual','_',18).setOrigin(0,0.5);
          if(txtNode){
            caret.x = txtNode.x + (txtNode.width/2) + 2; // colocar a la derecha del texto
            caret.y = txtNode.y;
          } else {
            // campo vacío: colocar a la izquierda donde empieza el texto
            caret.x = -btn._btnW/2 + 14; // paddingX aproximado
            caret.y = 0;
          }
          caret.setAlpha(this._caretBlink? 1:0);
          btn.add(caret);
          this._inlineCarets.push(caret);
        }
        this.buttons.push(btn);
      });
      if(mode==='login'){
    // Botón ENTRAR + estado de error credenciales
        const submitLabel = this.authInlineError? 'INVALIDO' : (this._submitting? '...' : 'ENTRAR');
    const submitTheme = this.authInlineError? 'cobalt':'slate';
    const submitBtn = UI.makeButton(0,0,{ label: submitLabel, theme: submitTheme, w:baseW, h:baseH, radius, size:18, paddingX:14, paddingY:6, letterSpacing:1, onClick:()=> this.inlineSubmit() });
    const siteBtn = UI.makeButton(0,0,{ label:"HOHO3D.COM.AR", theme:"amber", w:baseW, h:baseH, radius, size:18, paddingX:14, paddingY:6, letterSpacing:1, onClick:()=> window.open("https://hoho3d.com.ar","_blank") });
    this.buttons.push(submitBtn, siteBtn);
      } else {
        // Botón acción REGISTRAR
        const submitLabel = this.authInlineError? 'INVALIDO' : (this._submitting? '...' : 'REGISTRAR');
        const submitTheme = this.authInlineError? 'cobalt':'slate';
        const submitBtn = UI.makeButton(0,0,{ label: submitLabel, theme: submitTheme, w:baseW, h:baseH, radius, size:18, paddingX:14, paddingY:6, letterSpacing:1, onClick:()=> this.inlineSubmit() });
        this.buttons.push(submitBtn);
      }
      // Botón EXIT / SALIR
      const exitBtn = UI.makeButton(0,0,{ label:"SALIR", theme:"slate", w:baseW, h:baseH, radius, size:16, paddingX:14, paddingY:6, letterSpacing:1, onClick:()=> this.exitInlineMode() });
      this.buttons.push(exitBtn);
      if(!this._inlineKeysActive){ window.addEventListener('keydown', this._inlineKeyHandler); this._inlineKeysActive=true; }
      this.uiRoot.add(this.buttons);
      return;
    }
    this.input.topOnly = false;
    // Fallback manual
    this.input.on('pointerdown', (p)=>{
      for(const b of this.buttons){
        const hw=(b._btnW||0)/2, hh=(b._btnH||0)/2;
        if(p.x>=b.x-hw && p.x<=b.x+hw && p.y>=b.y-hh && p.y<=b.y+hh){
          console.log('[FallbackClickTrigger]', b._btnLabel);
          // Emitir evento para cualquier listener (pointerdown ya dispara onClick en botones simplificados)
          b.emit('pointerdown', p);
        }
      }
    });
  const btnLogin = UI.makeButton(0,0,{ label:"LOGIN", theme:"mint", w:baseW, h:baseH, radius, size:22, paddingX:14, paddingY:6, letterSpacing:1, onClick:()=>{ this.enterInlineMode('login'); }, pulseLight:false });
  const btnReg   = UI.makeButton(0,0,{ label:"REGISTRO", theme:"cobalt", w:baseW, h:baseH, radius, size:20, paddingX:14, paddingY:6, letterSpacing:1, onClick:()=>{ this.enterInlineMode('register'); }, pulseLight:false });
      const btnSite  = UI.makeButton(0,0,{ label:"HOHO3D.COM.AR", theme:"amber", w:baseW, h:baseH, radius, size:18, paddingX:14, paddingY:6, letterSpacing:1, onClick:()=> window.open("https://hoho3d.com.ar","_blank"), pulseLight:false });
      this.buttons.push(btnLogin, btnReg, btnSite);
    } else {
      const startGame = ()=> this.scene.start("Game");
      const btnStart = UI.makeButton(0,0,{ label:"JUGAR", theme:"mint", w:baseW, h:baseH, radius, size:22, paddingX:14, paddingY:6, letterSpacing:1, onClick:startGame, pulseLight:false });
      const btnComm  = UI.makeButton(0,0,{ label:"COMUNIDAD", theme:"cobalt", w:baseW, h:baseH, radius, size:20, paddingX:14, paddingY:6, letterSpacing:1, onClick:()=> window.open("https://chat.whatsapp.com/EuOXrDjV6rPHiW29NFuK8F","_blank"), pulseLight:false });
      const btnSite  = UI.makeButton(0,0,{ label:"HOHO3D.COM.AR", theme:"amber", w:baseW, h:baseH, radius, size:18, paddingX:14, paddingY:6, letterSpacing:1, onClick:()=> window.open("https://hoho3d.com.ar","_blank"), pulseLight:false });
  const btnLogout = UI.makeButton(0,0,{ label:"SALIR", theme:"slate", w:baseW, h:baseH-4, radius, size:18, paddingX:14, paddingY:4, letterSpacing:1, onClick:()=>{
        authLogout();
        this.session=null;
        // Destruir panel usuario si existe
        if(this.userPanel){ try{ this.userPanel.root?.destroy(true); }catch(_){} this.userPanel=null; }
        // Reset modos inline / datos
        this.authInlineMode=null; this.authInlineData={ nombre:"", password:"", correo:"" }; this.authInlineError='';
        this.buildButtons(); this.updateUserLabel(); this.layoutMenu();
      }, pulseLight:false });
      this.buttons.push(btnStart, btnComm, btnSite, btnLogout);
    }
    this.uiRoot.add(this.buttons);
  this.raiseMenu();
  }

  updateUserLabel(){
  // Sincronizar panel de usuario
  // Mantener compat si panel viejo existe (ya reemplazado)
  if(this.userPanel?.refresh && this.userPanel.userId){ /* noop for now */ }
  }

  // Forzar que los botones del menú queden al frente si algo los tapa
  raiseMenu(){
    if(!this.buttons) return;
  // No hace falta subir cada botón si el contenedor completo (uiRoot) está encima del userPanel.
  // Aseguramos orden correcto:
  if(this.userPanel?.root){ this.userPanel.root.setDepth(8); }
  if(this.uiRoot){ this.uiRoot.setDepth(40); }
  }

  fitCoverVideo(video,W,H){
    if(!video) return;
    let vw = video.video?.videoWidth || video.width || 1920;
    let vh = video.video?.videoHeight|| video.height|| 1080;
    if(!vw || !vh){ vw=1920; vh=1080; }
    const s = Math.max(W/vw, H/vh);
    video.setDisplaySize(vw*s, vh*s).setPosition(W/2,H/2);
  }

  drawVignette(W,H){
    const g=this.vignette; g.clear();
  const rings=4; const diag=Math.hypot(W,H)/2;
  for(let i=0;i<rings;i++){ const a=0.12 + i*0.10; g.lineStyle((i+1)*20,0x000000,a).strokeCircle(W/2,H/2,diag); }
    g.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  paintFallback(W,H){
    if (this._fallback) { this._fallback.clear(); this._fallback.fillStyle(0x0e1420,1).fillRect(0,0,W,H); return; }
    const g=this.add.graphics().setDepth(-21); this._fallback=g;
    for(let i=0;i<H;i+=2) g.fillStyle(i%4?0x0e1420:0x0a0f19,1).fillRect(0,i,W,2);
  }

  ensureZOrder(){
    if (this.bg?.setDepth) this.bg.setDepth(-20);
    this.dimmer.setDepth(-15);
    this.vignette.setDepth(-12);
    this.uiRoot.setDepth(10);
    this.footer.setDepth(11);
  }

  // === INLINE AUTH (LOGIN / REGISTER) ===
  enterInlineMode(mode){
    this.authInlineMode = mode; this._submitting=false;
    if(mode==='login'){ this.authInlineData.password=''; }
    if(mode==='register'){ this.authInlineData.password=''; this.authInlineData.correo=''; }
  this.authInlineError=''; this.authInlinePasswordTouched=false;
    this.authInlineFocus = 0;
    // Iniciar parpadeo caret
    if(!this._caretTimer){
      this._caretTimer = this.time.addEvent({ delay:500, loop:true, callback:()=>{
        if(!this.authInlineMode){ this._caretTimer.remove(false); this._caretTimer=null; return; }
        this._caretBlink = !this._caretBlink; this.buildButtons(); this.layoutMenu();
      }});
    }
    this.buildButtons(); this.layoutMenu();
  }
  exitInlineMode(){
    if(this._inlineKeysActive){ window.removeEventListener('keydown', this._inlineKeyHandler); this._inlineKeysActive=false; }
    this.authInlineMode=null; this.buildButtons(); this.layoutMenu();
  if(this.authInlineMsg){ this.authInlineMsg.destroy(); this.authInlineMsg=null; }
    if(this._caretTimer){ this._caretTimer.remove(false); this._caretTimer=null; }
  }
  // Caret timer eliminado (se reemplaza por cambio de alpha del texto)
  async inlineSubmit(){
    if(this._submitting) return;
    if(this.authInlineMode==='login'){
      const { nombre, password } = this.authInlineData;
      if(!nombre || !password) return;
      this._submitting=true; this.buildButtons(); this.layoutMenu();
      try {
        const { authLogin } = await import('../services/AuthFacade.js');
        const res = await authLogin({ nombre, password });
  if(res.ok){
            this.authInlineError='';
            this.session=res.user;
            // Crear / refrescar panel de usuario en vivo
            await this.ensureUserPanel();
            this.exitInlineMode();
            this.updateUserLabel();
            this.buildButtons();
            this.layoutMenu();
          }
  else { this.authInlineError = res.error||'Error'; this.buildButtons(); this.layoutMenu(); }
      } finally { this._submitting=false; this.buildButtons(); this.layoutMenu(); }
    } else if(this.authInlineMode==='register'){
      const { nombre, password, correo } = this.authInlineData;
      if(!nombre || !password || !correo) return;
      const email = correo.trim();
      // Validación básica de correo realista
      const emailOk = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
      if(!emailOk){ this.authInlineError='Correo inválido'; this.buildButtons(); this.layoutMenu(); return; }
      this._submitting=true; this.buildButtons(); this.layoutMenu();
      try {
        const { authRegister } = await import('../services/AuthFacade.js');
        const res = await authRegister({ nombre, password, contacto: email.toLowerCase() });
  if(res.ok){
            this.authInlineError='';
            this.session=res.user;
            await this.ensureUserPanel();
            this.exitInlineMode();
            this.updateUserLabel();
          }
  else { this.authInlineError=res.error||'Error'; }
      } finally { this._submitting=false; this.buildButtons(); this.layoutMenu(); }
    }
  }
  handleInlineKey(e){
    if(!this.authInlineMode) return;
    if(e.key==='Escape'){ this.exitInlineMode(); return; }
    const mode=this.authInlineMode;
    const fields = mode==='login'? ['nombre','password'] : ['nombre','password','correo'];
  if(e.key==='Tab'){ e.preventDefault(); this.authInlineFocus = (this.authInlineFocus+1)%fields.length; const k=fields[this.authInlineFocus]; if(k==='password' && !this.authInlinePasswordTouched){ this.authInlineData.password=''; this.authInlinePasswordTouched=true; } this.buildButtons(); this.layoutMenu(); return; }
    if(e.key==='Enter'){
      if(mode==='login'){ this.inlineSubmit(); }
      else if(mode==='register' && this.authInlineFocus===fields.length-1){ this.inlineSubmit(); }
      else { this.authInlineFocus = Math.min(fields.length-1, this.authInlineFocus+1); this.buildButtons(); this.layoutMenu(); }
      return;
    }
    if(e.key==='Backspace'){
      const k=fields[this.authInlineFocus];
      this.authInlineData[k] = (this.authInlineData[k]||'').slice(0,-1);
      this.buildButtons(); this.layoutMenu(); return;
    }
    if(e.key.length===1 && !e.metaKey && !e.ctrlKey && !e.altKey){
      if(/[^\s]/.test(e.key) || e.key===' '){
        const k=fields[this.authInlineFocus];
        const cur=this.authInlineData[k]||'';
        if(cur.length<40){ this.authInlineData[k]=cur+e.key; this.buildButtons(); this.layoutMenu(); }
      }
    }
  }
}
