import { formatNumber } from "../utils/helpers.js";
import { PixelUiFactory } from "../utils/PixelUiFactory.js";
import { stampPixelLogo } from "../utils/pixelLogo.js";
import { authGetSession } from "../services/AuthFacade.js";
import SupabaseScoreService from "../services/SupabaseScoreService.js";

export default class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }
  init(data) { this.finalScore = data?.score ?? 0; }

  create() {
    this.cameras.main.roundPixels = true;
    const W=this.scale.width, H=this.scale.height;
    // Video fondo
    if (this.cache.video.exists("menu_bg_vid")) {
      this.bg = this.add.video(W/2,H/2,"menu_bg_vid").setOrigin(0.5).setDepth(-15).setMute(true).setLoop(true).play(true);
    } else {
      const g=this.add.graphics().setDepth(-15); g.fillStyle(0x1a1016,1).fillRect(0,0,W,H); this.bg=g; }
    // Viñeta
    this.vignette = this.add.graphics().setDepth(-12);
    // Logo pixelado
    this.logo = stampPixelLogo(this, "logo_mark", Math.min(220, Math.floor(H*0.2))).setDepth(1);
    this.logo.setPosition(W/2, Math.max(32, H*0.12));
    // Título y puntaje
    if (this.cache.bitmapFont.exists("casual")) {
      this.title = this.add.bitmapText(W/2,0,"casual","GAME OVER",48).setOrigin(0.5).setTint(0xffffff);
      this.scoreTxt = this.add.bitmapText(W/2,0,"casual",`PUNTOS: ${formatNumber(this.finalScore)}`,24).setOrigin(0.5).setTint(0xe8eef9);
    } else {
      this.title = this.add.text(W/2,0,"GAME OVER",{fontSize:"40px",color:"#fff"}).setOrigin(0.5);
      this.scoreTxt = this.add.text(W/2,0,`PUNTOS: ${formatNumber(this.finalScore)}`,{fontSize:"20px",color:"#ccc"}).setOrigin(0.5);
    }
    // Botones pixel UI
    const UI = new PixelUiFactory(this,4);
    const maxBtnW=Phaser.Math.Clamp(Math.floor(W*0.33), 220, 300);
    this.btnReplay = UI.makeButton(W/2,0,{ label:"VOLVER A JUGAR", theme:"green", w:maxBtnW, h:44, size:24, onClick:()=> this.scene.start("Game") });
    this.btnMenu   = UI.makeButton(W/2,0,{ label:"VOLVER AL MENÚ", theme:"gray",  w:maxBtnW, h:44, size:22, onClick:()=> this.scene.start("Menu") });
    this.footer = this.add.text(10, H-20, "Creado por: Hoho3D", { fontSize:"12px", color:"#888" });
    this.layout(); this.scale.on("resize", ()=> this.layout());

  // Enviar puntaje a Supabase si hay sesión y servicio disponible
  this.submitScore();
  }
  drawVignette(W,H){ const g=this.vignette; g.clear(); const rings=5; const diag=Math.hypot(W,H)/2; for(let i=0;i<rings;i++){ const a=0.18+i*0.14; g.lineStyle((i+1)*22,0x000000,a).strokeCircle(W/2,H/2,diag);} g.setBlendMode(Phaser.BlendModes.MULTIPLY); }
  layout(){
    const W=this.scale.gameSize.width, H=this.scale.gameSize.height;
    if (this.bg && this.bg.isPlaying !== undefined) {
      const sw=this.bg.video.videoWidth||W, sh=this.bg.video.videoHeight||H; const s=Math.max(W/sw,H/sh); this.bg.setDisplaySize(sw*s, sh*s).setPosition(W/2,H/2);
    } else if (this.bg?.setDisplaySize) this.bg.setDisplaySize(W,H);
    this.drawVignette(W,H);
    // logo
    const newLogoW=Math.min(220, Math.floor(H*0.2));
    const ratio=this.logo.displayHeight/this.logo.displayWidth; this.logo.setDisplaySize(newLogoW, newLogoW*ratio).setPosition(W/2, Math.max(32, H*0.12));
    const gap=Math.max(24, Math.floor(H*0.05));
    const afterLogo=this.logo.y + this.logo.displayHeight/2 + gap*0.6;
    this.title.setPosition(W/2, afterLogo);
    this.scoreTxt.setPosition(W/2, afterLogo + gap);
    this.btnReplay.setPosition(W/2, afterLogo + gap*2);
    this.btnMenu  .setPosition(W/2, afterLogo + gap*3);
    this.footer.setPosition(10, H-20);
  }

  async submitScore(){
    const session = authGetSession();
    if(!session || !session.id){ return; }
    const svc = new SupabaseScoreService();
    if(!svc.available()) return;
    const note = this.add.bitmapText(this.scale.width/2, 0, "casual", "Enviando puntaje...", 16).setOrigin(0.5).setTint(0xaec7dd).setDepth(5);
    const yBase = this.scoreTxt.y + 44; note.setY(yBase);
    const res = await svc.submitScore({ userId: session.id, points: this.finalScore });
    if(res.ok){ note.setText("Puntaje guardado").setTint(0x9bf6a3); }
    else { note.setText("No guardado: "+(res.error||"error")).setTint(0xffb4b4); }
    this.time.delayedCall(3000, ()=> note.destroy());
  }
}
