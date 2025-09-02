import { getSoundManager } from "../audio/SoundManager.js";

export default class IntroScene extends Phaser.Scene {
  constructor(){ super('Intro'); }
  preload(){
    // Cargar video si falta
    if(!this.cache.video.exists('intro_vid')){
      this.load.video('intro_vid', 'assets/fondo/intro.mp4', 'canplaythrough', false, false);
    }
    // Asegurar fuente bitmap antes de usarla (BootScene aún no corrió)
    if(!this.cache.bitmapFont.exists('casual')){
      this.load.bitmapFont('casual','assets/Fonts/CasualEncounter.png','assets/Fonts/CasualEncounter.fnt');
    }
  }
  create(){
    const W=this.scale.width, H=this.scale.height;
    this.cameras.main.setBackgroundColor('#000');
    // Mute preventivo de BGM (por si venía sonando de un reinicio)
    try { const sm = getSoundManager(this); sm.mute(true); this._soundManager = sm; } catch(_) {}

    this.skipHint = this.makeLabel(W-24, H-22, 'SALTAR', 18, 0xaad7ff)
      .setOrigin(1,1).setAlpha(0.85).setDepth(5)
      .setInteractive({ useHandCursor:true })
      .on('pointerdown', ()=> this.finish());
    this.input.keyboard?.on('keydown-SPACE', ()=> this.finish());

    if(this.cache.video.exists('intro_vid')){
      this.video = this.add.video(W/2, H/2, 'intro_vid').setOrigin(0.5).setDepth(1);
  this.video.once('complete', ()=> this.fadeAndFinish());
      this.video.once('error', ()=> this.finish());
      // Intentar reproducir con audio; si falla (autoplay) mostrar overlay de click
      const playAttempt = this.video.play(false); // no loop
      this.fitCover(this.video, W, H);
      this.scale.on('resize', (sz)=> { this.fitCover(this.video, sz.width, sz.height); this.skipHint.setPosition(sz.width-24, sz.height-22); });
      if(playAttempt && typeof playAttempt.then==='function'){
        playAttempt.catch(()=> this.showClickToStart());
      } else {
        // Algunos navegadores no devuelven promesa -> fallback
        this.time.delayedCall(400, ()=> { if(!this.video.isPlaying()) this.showClickToStart(); });
      }
      // Skip por click general (si hace click sobre el video y quiere saltar)
      this.video.setInteractive().on('pointerdown', ()=> this.finish());
    } else {
      this.finish();
    }
  }
  showClickToStart(){
    if(this._ctsShown) return; this._ctsShown=true;
    const W=this.scale.width, H=this.scale.height;
  const txt = this.makeLabel(W/2, H/2, 'CLICK PARA INICIAR', 26, 0xffffff).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: txt, alpha:{ from:1, to:0.25 }, duration:800, yoyo:true, repeat:-1 });
    this.input.once('pointerdown', ()=> { txt.destroy(); this.tryUnmuteAndPlay(); });
  }
  tryUnmuteAndPlay(){
    if(!this.video) return;
    try { this.video.setMute(false); } catch(_) {}
    try { this.video.play(false); } catch(_) { /* ignore */ }
  }
  makeLabel(x,y,text,size,color){
    if(this.cache.bitmapFont.exists('casual')){
      return this.add.bitmapText(x,y,'casual',text,size).setTint(color);
    } else {
      // Fallback texto normal
      const t = this.add.text(x,y,text,{ fontFamily:'monospace', fontSize: size+'px', color:'#'+color.toString(16).padStart(6,'0') });
      // Simular métodos usados por otras utilidades
      t.getTextBounds = () => ({ local:{ width: t.width, height: t.height } });
      t.setFontSize = (fs)=> { t.setFont(fs+'px monospace'); return t; };
      return t;
    }
  }
  fitCover(video, W, H){
    const vw = video.video ? (video.video.videoWidth||1920) : video.width;
    const vh = video.video ? (video.video.videoHeight||1080) : video.height;
    const s=Math.max(W/vw, H/vh);
    video.setDisplaySize(vw*s, vh*s);
  }
  fadeAndFinish(){
    this.cameras.main.fadeOut(600,0,0,0);
    this.cameras.main.once('camerafadeoutcomplete', ()=> this.finish());
  }
  finish(){
    if(this._finished) return; this._finished=true;
    try { this._soundManager?.mute(false); } catch(_) {}
    this.scene.start('Boot', { fromIntro:true });
  }
}
