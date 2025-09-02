import { UI_ASSETS, LOGO_URL } from "../config/gameConfig.js";
import { sliceRamButtonsRuntime } from "../utils/RamButtonsRuntimeSlicer.js";
import { getSession } from "../services/gsheetsAuth.js"; // aún disponible para futuros preloads, no redirigimos ya a Auth

export default class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }
  preload() {
    const w = this.scale.width, h = this.scale.height;
    // Fondo de carga
    const g = this.add.graphics();
    g.fillStyle(0x161616, 1).fillRect(0, 0, w, h);
    const barBg = this.add.rectangle(w/2, h/2, 320, 18, 0x2a2a2a);
    const bar = this.add.rectangle(w/2 - 160, h/2, 1, 12, 0x78dce8).setOrigin(0, 0.5);
    this.load.on("progress", p => (bar.width = 320 * p));

  // Generar placeholders en vez de intentar cargar imágenes opcionales que pueden faltar
  this.makePlaceholders();

  // Logo principal (ruta original no existe actualmente; se omitirá y se hará fallback a logo_mark)
  // Logo mark (nueva ubicación assets/ui/logo/logo_mark.png)
  this.load.image("logo_mark", "assets/ui/logo/logo_mark.png");
  // Video de fondo (loop + mute para autoplay). Si falta, se usará fallback gráfico.
  this.load.video("menu_bg_vid", "assets/fondo/fondo.mp4", "canplaythrough", true, true);

  // Imagen única con todos los botones (Ram Buttons.png)
  this.load.image("ram_buttons", "assets/botones/Ram Buttons.png");
  // Manifest JSON no se carga aquí para evitar error 404 -> HTML -> parse fail. Se intentará runtime slicing.

    // Bitmap font CasualEncounter (png + fnt)
    // Bitmap font (asegurar ruta correcta con F mayúscula)
    this.load.bitmapFont(
      "casual",
      "assets/Fonts/CasualEncounter.png",
      "assets/Fonts/CasualEncounter.fnt"
    );

  // Fondo CTA opcional real: comentar si no existe; mantenemos placeholder si no
  // this.load.image("ui_cta_bg", "assets/ui/cta_pack_bg.jpg");

  // Logo remoto eliminado para evitar spam CORS

    this.load.on("loaderror", () => {}); // ignorar errores para no romper

  // --- AUDIO REAL ---
  // Claves limpias: bgm_menu (menu.mp3) y bgm_gameplay (gameplay.mp3)
  this.load.audio('bgm_menu', 'assets/audio/menu.mp3');
  this.load.audio('bgm_gameplay', 'assets/audio/gameplay.mp3');
  // IntroPlayer assets (nuevo componente): video (streaming, loop false) + audio separado
  this.load.video('intro_vid', 'assets/fondo/intro.mp4', 'canplaythrough', false, true);
  this.load.audio('intro_bgm', ['assets/audio/intro.mp3']);
  }
  create(data) {
    // Fallback si la fuente bitmap no cargó: crear una simulada usando canvas
    if(!this.cache.bitmapFont.exists('casual')){
      try {
        const key='casual_fallback_tmp';
        // Crear una textura básica con letras A-Z (no es un bitmapFont real, así que usaremos monkey patch)
        // En vez de registrar fuente, haremos wrapper para add.bitmapText.
        const orig = this.add.bitmapText.bind(this.add);
        if(!this.game._bitmapPatched){
          this.game._bitmapPatched = true;
          const sceneAdd = this.add;
          this.add.bitmapText = function(x,y,font,text,size,align){
            if(font==='casual' && !this.scene.cache.bitmapFont.exists('casual')){
              // usar Text normal como sustituto
              const txt = this.scene.add.text(x,y,text, { fontFamily:'monospace', fontSize: (size||24)+'px', color:'#ffffff' }).setOrigin(0.5);
              // simular API mínima usada (getTextBounds, setFontSize)
              txt.getTextBounds = () => ({ local:{ width: txt.width, height: txt.height } });
              txt.setFontSize = (fs)=> { txt.setFont(fs+'px monospace'); return txt; };
              return txt;
            }
            return orig(x,y,font,text,size,align);
          };
        }
        console.warn('[FontFallback] Bitmap font "casual" no cargó. Usando fallback de texto estándar.');
      } catch(e){ console.warn('[FontFallback] Error creando fallback', e); }
    }
    // Si existe manifest, cargar dinámicamente cada slice antes de ir a Menu
    // Intentar slicing runtime (si falla, sólo se mantiene textura ram_buttons completa)
  try { sliceRamButtonsRuntime(this); } catch(err){ console.warn("Slicer error", err); }
    // Fallback: duplicar logo_brand desde logo_mark si falta
    if (!this.textures.exists("logo_brand") && this.textures.exists("logo_mark")) {
      const source = this.textures.get("logo_mark").getSourceImage();
      this.textures.addImage("logo_brand", source);
    }
    // Crear silencios si los BGM no se cargaron correctamente (evita warnings y permite llamadas playBgm)
    this.ensureSilentBgm('bgm_main');
    this.ensureSilentBgm('bgm_boss');
  // Siempre vamos a Menu; ahí se mostrarán botones Login / Registro si no hay sesión
  this.scene.start("Menu", { fromIntro: data?.fromIntro });
  }

  ensureSilentBgm(key, seconds=1){
    if(this.cache.audio.exists(key)) return; // ya hay (aunque sea real)
    if(!this.sound.context){ return; }
    try {
      const ctx = this.sound.context;
      const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
      // Añadir objeto de cache similar al formato interno ({ src:[], data:AudioBuffer })
      this.cache.audio.add(key, { src: [], data: buffer });
      // Opcional: precalentar un sound para normalizar propiedades
      const s = this.sound.add(key, { loop:true, volume:0 });
      s.stop();
      console.info('[AudioFallback] Silent buffer created for', key);
    } catch(e){ console.warn('[AudioFallback] Failed to create silent buffer for', key, e); }
  }

  makePlaceholders() {
    const addBG = (key, c1, c2) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      const W = 64, H = 64;
      for (let y=0;y<H;y++) {
        const t = y/(H-1);
        const col = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(c1),
          Phaser.Display.Color.ValueToColor(c2),
          H-1, y
        );
        const hex = (col.r<<16)|(col.g<<8)|col.b;
        g.fillStyle(hex,1).fillRect(0,y,W,1);
      }
      g.generateTexture(key, W, H); g.destroy();
    };
    addBG("ui_menu_bg", 0x1a2330, 0x0d1116);
    addBG("ui_gameover_bg", 0x301a1a, 0x160d0d);
    const simple = (key,color)=> {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      g.fillStyle(color,1).fillRect(0,0,48,48);
      g.lineStyle(3,0xffffff,0.15).strokeRect(1,1,46,46);
      g.generateTexture(key,48,48); g.destroy();
    };
    simple("ui_start_sprite",0x3bbf58);
    simple("ui_end_sprite",0xd95757);
    simple("ui_logo_local",0x78dce8);
    simple("ui_cta_bg",0x222a33);
  }
}
