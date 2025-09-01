const INTRO_KEY = 'intro_player_seen_until';

export default class IntroPlayer {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} opts { x, y, maxW=0.6*W, maxH=0.45*H, anchor:"top"|"center", rememberMs }
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.opts = opts;
    this.container = scene.add.container(0,0).setDepth(80);
    this._bindResize = () => this.layout();
    scene.scale.on("resize", this._bindResize);

    const W = scene.scale.width, H = scene.scale.height;
    const maxW = Math.min(Math.floor(W * (opts.maxW || 0.6)), 960);
    const maxH = Math.min(Math.floor(H * (opts.maxH || 0.45)), 540);

    // Panel pixel
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.45).fillRoundedRect(-8,-8, maxW+16, maxH+16, 14);
    g.lineStyle(2, 0x0d1217, 1).strokeRoundedRect(-8,-8, maxW+16, maxH+16, 14);
    g.fillStyle(0x1e2833, 0.95).fillRoundedRect(0,0, maxW, maxH, 12);
    this.panel = g;

  // Vídeo (mute, usamos audio separado). No loop.
  this.video = scene.add.video(0, 0, "intro_vid").setOrigin(0,0).setMute(true);
  this.video.setLoop(false);
  this.video.once('play', ()=> { this.layout(); });

    // Hit area para desbloqueo
    this.hit = scene.add.rectangle(0,0, maxW, maxH, 0x000000, 0.0001).setOrigin(0,0).setInteractive({ useHandCursor:true });

    // Botón SALTAR (simple pixel style)
    const bgg = scene.add.graphics();
    bgg.fillStyle(0xf4c361, 1).fillRoundedRect(0, 0, 96, 32, 10);
    bgg.lineStyle(2, 0x8a5f17, 1).strokeRoundedRect(0, 0, 96, 32, 10);
    const lbl = scene.add.bitmapText(48, 8, "casual", "SALTAR", 18).setOrigin(0.5,0).setTint(0x101319);
    this.skipBtn = scene.add.container(0,0,[bgg,lbl]).setSize(96,32).setInteractive({ useHandCursor:true });

    // Hint
    this.hint = scene.add.bitmapText(0,0,"casual","TOCA PARA INICIAR",18).setOrigin(0.5).setTint(0xcfe3ff);

    this.container.add([this.panel, this.video, this.hit, this.skipBtn, this.hint]);

    // Audio mp3
    this.sound = scene.sound.add("intro_bgm", { loop:false, volume:1 });

    this._started = false;
    this._videoStarted = false;
    this._playAttempts = 0;
    const markStarted = () => { this._videoStarted = true; this.hint.setVisible(false); };
    this.video.on('playing', markStarted);
    this.video.on('play', markStarted);
    this.video.on('timeupdate', ()=> { if(!this._videoStarted && this.video.getCurrentTime()>0.05) markStarted(); });
    this.video.on('error', (e)=> console.warn('[IntroPlayer] Video error', e));

    const attemptVideo = () => {
      this._playAttempts++;
      let p;
      try { p = this.video.play(false); } catch(e){ console.warn('[IntroPlayer] video.play throw', e); }
      if(p && p.catch){
        p.catch(err=> console.warn('[IntroPlayer] video.play promise reject', err));
      }
      // Fallback directo al elemento HTMLVideo
      const el = this.video.video;
      if(el){
        if(el.readyState < 2){
          el.addEventListener('loadeddata', ()=> { if(!this._videoStarted) attemptVideo(); }, { once:true });
        } else {
          if(el.paused){
            el.muted = true;
            el.loop = false;
            el.playsInline = true;
            el.play().catch(err=> console.warn('[IntroPlayer] element.play reject', err));
          }
        }
      }
      // Reintento si tras 500ms no avanzó
      this.scene.time.delayedCall(550, ()=> {
        if(!this._videoStarted && this._playAttempts < 4 && !this._closed){
          console.log('[IntroPlayer] Reintentando video intento', this._playAttempts+1);
          attemptVideo();
        } else if(!this._videoStarted && this._playAttempts>=4){
          this.hint.setVisible(true).setText('VIDEO NO DISPONIBLE');
        }
      });
    };

    const startPlayback = () => {
      if (this._started) return;
      this._started = true;
      try { scene.sound.unlock?.(); } catch {}
      this.hint.setText('CARGANDO...').setVisible(true);
      try { this.sound.play(); } catch(e){ console.warn('[IntroPlayer] sound.play error', e); }
      attemptVideo();
    };
    this.hit.on("pointerup", startPlayback);

    // Skip
    this.skipBtn.on("pointerover", ()=> this.skipBtn.setScale(1.04));
    this.skipBtn.on("pointerout",  ()=> this.skipBtn.setScale(1));
    this.skipBtn.on("pointerup",   ()=> this.close("skip"));

    const endAll = () => this.close("end");
    this.video.on("complete", endAll);
    this.video.video?.addEventListener("ended", endAll);
    this.sound.once("complete", endAll);

    this.layout();
  }

  layout(){
    if(this._closed) return;
    const W = this.scene.scale.gameSize.width, H = this.scene.scale.gameSize.height;
    const maxW = Math.min(Math.floor(W * (this.opts.maxW || 0.6)), 960);
    const maxH = Math.min(Math.floor(H * (this.opts.maxH || 0.45)), 540);
    const anchor = this.opts.anchor || "top";
    const x = Math.floor((W - maxW)/2);
    const y = (anchor === "top") ? Math.max(20, Math.floor(H*0.12)) : Math.floor((H - maxH)/2);
    this.container.setPosition(x,y);

    // Redraw panel
    this.panel.clear();
    this.panel.fillStyle(0x000000, 0.45).fillRoundedRect(-8,-8, maxW+16, maxH+16, 14);
    this.panel.lineStyle(2, 0x0d1217, 1).strokeRoundedRect(-8,-8, maxW+16, maxH+16, 14);
    this.panel.fillStyle(0x1e2833, 0.95).fillRoundedRect(0,0, maxW, maxH, 12);

    const vw = this.video.video?.videoWidth || 1280;
    const vh = this.video.video?.videoHeight || 720;
    const s = Math.min(maxW/vw, maxH/vh);
    const w = Math.floor(vw*s), h = Math.floor(vh*s);
    const vx = Math.floor((maxW - w)/2), vy = Math.floor((maxH - h)/2);
    this.video.setDisplaySize(w,h).setPosition(vx,vy);
    this.hit.setSize(maxW, maxH);

    this.skipBtn.setPosition(maxW - 96 - 8, 8);
    this.hint.setPosition(Math.floor(maxW/2), Math.floor(maxH/2));
  }

  close(reason="end"){
    if(this._closed) return;
    this._closed = true;
  const ttl = this.opts.rememberMs ?? 24*60*60*1000;
  try { localStorage.setItem(INTRO_KEY, String(Date.now()+ttl)); } catch {}
    try { this.video.stop(); } catch {}
    try { this.sound.stop(); } catch {}
    this.scene.scale.off("resize", this._bindResize);
    this.container.destroy(true);
    this.scene.events.emit("intro:closed", { reason });
  }

  static shouldShow(force=false){
    if(force) return true;
    try { const until = Number(localStorage.getItem(INTRO_KEY)||"0"); return !(until && Date.now() < until); } catch { return true; }
  }
}
