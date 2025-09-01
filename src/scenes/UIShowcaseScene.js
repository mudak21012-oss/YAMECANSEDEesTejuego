import { PixelArtFactory } from "../utils/PixelArtFactory.js";

export default class UIShowcaseScene extends Phaser.Scene {
  constructor(){ super("UIShowcase"); }
  create(){
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor(0x0d0d0f);

    const fx = new PixelArtFactory(this, 4);

    // Fila 1: botones
    const btnG = fx.makeButton("START", "green");
    const btnY = fx.makeButton("MENU", "yellow");
    const btnR = fx.makeButton("GAME OVER", "red");
    const btnB = fx.makeButton("LOGIN", "blue");
    Phaser.Actions.GridAlign([btnG, btnY, btnR, btnB], { width:4, cellWidth:200, cellHeight:60, x:80, y:60 });

    // Fila 2: barras
    const barG = fx.makeBar(70, 100, "green", 180, 20);
    const barY = fx.makeBar(45, 100, "yellow", 180, 20);
    const barR = fx.makeBar(20, 100, "red", 180, 20);
    const barB = fx.makeBar(85, 100, "blue", 180, 20);
    Phaser.Actions.GridAlign([barG, barY, barR, barB], { width:4, cellWidth:220, cellHeight:50, x:90, y:140 });

    // Fila 3: corazones
    const h1 = fx.makeHeart("full");
    const h2 = fx.makeHeart("half");
    const h3 = fx.makeHeart("empty");
    Phaser.Actions.GridAlign([h1,h2,h3], { width:3, cellWidth:60, cellHeight:60, x:120, y:210 });

    // Fila 4: íconos
    const icons = [
      fx.iconSword(), fx.iconShield(), fx.iconKey(), fx.iconStar(),
      fx.iconDiamond(), fx.iconPotion(), fx.iconSkull(), fx.iconLightning(),
      fx.iconTrophy(), fx.iconHourglass(), fx.iconDPad()
    ];
    Phaser.Actions.GridAlign(icons, { width:8, cellWidth:70, cellHeight:70, x:60, y:280 });

    // Texto info
    this.add.text(12, H - 40, "ESC: volver al menú", { fontSize:"14px", color:"#bbb" });

    this.input.keyboard.on("keydown-ESC", ()=> this.scene.start("Menu"));
  }
}
