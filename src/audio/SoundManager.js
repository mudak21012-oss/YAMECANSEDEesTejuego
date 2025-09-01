// Simple Sound Manager centralizing BGM & SFX control.
// Replace placeholder keys with real loaded audio assets.
export class SoundManager {
  constructor(scene){
    this.scene = scene;
    this.sound = scene.sound;
    this.currentBgm = null;
    this.targetVolume = 0.6;
    this.muted = false;
  this._lastNonZero = 0.6;
  }

  // Permite reusar singleton pero apuntar a la nueva escena (para tweens y eventos)
  retarget(scene){
    if(this.scene === scene) return;
    this.scene = scene;
    this.sound = scene.sound; // el gestor de sonido global sigue siendo uno, pero guardamos la ref actual
  }

  playBgm(key, { volume = 0.6, fade = 800 } = {}){
    this.targetVolume = volume;
    if(this.currentBgm?.key === key) return this.currentBgm; // already
    this.fadeOutCurrent(fade*0.7);
    const ctx = this.sound.context;
    if(ctx && ctx.state === 'suspended') {
      ctx.resume().catch(()=>{});
    }
    const doPlay = () => {
      if(!this.sound.get(key)) {
        if(!this.scene.cache.audio.exists(key)) {
          console.warn('[SoundManager] Audio key missing in cache:', key);
          return null;
        }
        const bgm = this.sound.add(key, { loop:true, volume:0 });
        this.currentBgm = bgm;
        bgm.play();
        if(fade>0) this.scene.tweens.add({ targets:bgm, volume: this.muted?0:volume, duration:fade });
        else bgm.setVolume(this.muted?0:volume);
      }
      return this.currentBgm;
    };
    if (this.sound.locked) {
      // Phaser sets locked until first user gesture; queue playback
      this.sound.once('unlocked', () => { doPlay(); });
    } else {
      doPlay();
    }
    return this.currentBgm;
  }

  fadeOutCurrent(duration=600){
    if(!this.currentBgm) return;
    const bgm = this.currentBgm;
    this.scene.tweens.add({ targets:bgm, volume:0, duration, onComplete:()=>{ bgm.stop(); bgm.destroy(); if(this.currentBgm===bgm) this.currentBgm=null; } });
  }

  swapBgm(key, opts={}){ return this.playBgm(key, opts); }

  mute(toggle){
    if(typeof toggle === 'boolean') this.muted = toggle; else this.muted=!this.muted;
    if(this.muted){
      if(this.currentBgm){
        // guardar volumen previo para restaurar
        if(this.targetVolume>0) this._lastNonZero = this.targetVolume;
        this.scene.tweens.add({ targets:this.currentBgm, volume:0, duration:400, onComplete:()=>{
          this.currentBgm && this.currentBgm.setVolume(0);
        }});
      }
      this.sound.mute = false; // mantenemos sfx controlado manualmente si quisieras otra lógica
    } else {
      const restore = this._lastNonZero || 0.3;
      this.targetVolume = restore;
      if(this.currentBgm){
        this.scene.tweens.add({ targets:this.currentBgm, volume:restore, duration:500 });
      }
      this.sound.mute = false;
    }
  }

  setBgmVolume(vol, { fade = 300 } = {}){
    this.targetVolume = vol;
    if(!this.currentBgm) return;
    if(fade>0){
      this.scene.tweens.add({ targets:this.currentBgm, volume: this.muted?0:vol, duration:fade });
    } else {
      this.currentBgm.setVolume(this.muted?0:vol);
    }
  }
}

// Helper singleton via game registry
export function getSoundManager(scene){
  let sm = scene.registry.get('__sm');
  if(!sm){
    sm = new SoundManager(scene);
    scene.registry.set('__sm', sm);
  } else {
    // Actualizar a nueva escena activa (por ejemplo de Menu -> Game)
    sm.retarget(scene);
  }
  return sm;
}
