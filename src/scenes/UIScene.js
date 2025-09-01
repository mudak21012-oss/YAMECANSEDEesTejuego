export default class UIScene extends Phaser.Scene {
  constructor(){ super('UI'); }
  create(){
    const W = this.scale.width;
    this.scoreText = this.add.text(12, 8, 'Puntos: 0', { fontSize: '16px', color:'#fff' });
  this.waveText = this.add.text(W/2, 8, 'Oleada 1/5', { fontSize:'16px', color:'#fff' }).setOrigin(0.5,0);
  this.timerText = this.add.text(W/2, 28, '00:30', { fontSize:'14px', color:'#bbb' }).setOrigin(0.5,0);
    this.heartsGfx = this.add.graphics();
    this.cdText = this.add.text(W - 12, 8, '', { fontSize: '14px', color:'#bbb' }).setOrigin(1,0);

    // Boss bar
    this.bossGroup = this.add.container(W/2, 60).setVisible(false);
    this.bossBarBg = this.add.rectangle(0,0, 260, 18, 0x111111).setStrokeStyle(1,0xffffff,0.4).setOrigin(0.5);
    this.bossBarFill = this.add.rectangle(-130,0, 260, 14, 0xff4444).setOrigin(0,0.5);
  this.bossLabel = this.add.text(0, -14,'JEFE FINAL',{ fontSize:'12px', color:'#ffcf66' }).setOrigin(0.5,1);
    this.bossGroup.add([this.bossBarBg, this.bossBarFill, this.bossLabel]);

    const game = this.scene.get('Game');
    // Guardar handlers para desuscribir en SHUTDOWN
    this._handlers = {
      hud: d => this.renderHUD(d),
      waveStart: ({ index, total, durationMs })=>{ this.waveText.setText(`Oleada ${index}/${total}`); this.timerText.setText(this.fmt(durationMs)); },
      waveTick: ({ remainingMs })=>{ this.timerText.setText(this.fmt(remainingMs)); },
      bossStart: ()=>{ this.showBossBar(true); },
      bossHp: ({ hp, max })=> this.updateBossBar(hp,max)
    };
    game.events.on('hud:update', this._handlers.hud);
    game.events.on('wave:start', this._handlers.waveStart);
    game.events.on('wave:tick', this._handlers.waveTick);
    game.events.on('boss:start', this._handlers.bossStart);
    game.events.on('boss:hp', this._handlers.bossHp);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, ()=>{
      try {
        game.events.off('hud:update', this._handlers.hud);
        game.events.off('wave:start', this._handlers.waveStart);
        game.events.off('wave:tick', this._handlers.waveTick);
        game.events.off('boss:start', this._handlers.bossStart);
        game.events.off('boss:hp', this._handlers.bossHp);
      } catch(_){ }
      this._handlers = null;
    });

  // Botón de volumen (arriba derecha)
  this.createVolumeButton();
  }

  fmt(ms){
    const s = Math.ceil(ms/1000);
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    return `${mm}:${ss}`;
  }

  showBossBar(v){ this.bossGroup.setVisible(v); }
  updateBossBar(hp,max){
    if (!this.bossGroup.visible) this.bossGroup.setVisible(true);
    const ratio = Phaser.Math.Clamp(hp/max,0,1);
    this.bossBarFill.width = 260*ratio;
    this.bossBarFill.fillColor = ratio>0.5? 0xff4444 : (ratio>0.25? 0xffaa33 : 0xffee33);
  }

  renderHUD({ healthHalves, maxHalves, score, shieldCD, specialCD }){
    this.scoreText.setText(`Puntos: ${score}`);
    const x0 = 12, y = 34, heartW = 20, pad = 6;
    this.heartsGfx.clear();
    for (let i=0;i<maxHalves/2;i++){
      const halves = Math.max(0, Math.min(2, healthHalves - i*2));
      const x = x0 + i*(heartW+pad);
      this.heartsGfx.lineStyle(1,0xffffff,0.6).strokeRoundedRect(x,y,heartW,16,4);
      if (halves>0) this.heartsGfx.fillStyle(0xff5a5a,1).fillRect(x+1,y+1,(heartW-2)*(halves/2),14);
    }
    const s = ms=> ms<=0? 'OK': (Math.ceil(ms/1000)+'s');
    this.cdText.setText(`Escudo: ${s(shieldCD)} | Especial: ${s(specialCD)}`);
  }

  createVolumeButton(){
    const size = 38;
    const g = this.add.graphics().setDepth(3000).setScrollFactor(0);
    const draw=(muted)=>{
      g.clear();
      g.fillStyle(0xeff4f8,0.22).fillRoundedRect(-size/2,-size/2,size,size,11);
      g.lineStyle(2,0xffffff,0.75).strokeRoundedRect(-size/2,-size/2,size,size,11);
      g.lineStyle(1,0x000000,0.35).strokeRoundedRect(-size/2+1,-size/2+1,size-2,size-2,9);
      if(muted){
        // PLAY TRIANGLE (para resumir música)
        g.fillStyle(0xffffff,1);
        g.beginPath();
        g.moveTo(-6,-10);
        g.lineTo(12,0);
        g.lineTo(-6,10);
        g.closePath();
        g.fillPath();
      } else {
        // ALTAVOZ CON ONDAS
        g.fillStyle(0xffffff,1);
        const bx=-10, by=-8; g.fillRect(bx,by,8,16);
        g.beginPath(); g.moveTo(bx+8,by); g.lineTo(bx+17,by+8); g.lineTo(bx+8,by+16); g.closePath(); g.fillPath();
        g.lineStyle(2,0xffffff,0.9);
        [12,18].forEach(r=>{ g.beginPath(); g.arc(bx+9,by+8,r,-Math.PI/4,Math.PI/4); g.strokePath(); });
      }
    };
    const container = this.add.container(0,0,[g]).setSize(size,size).setDepth(3001).setScrollFactor(0).setInteractive({useHandCursor:true});
    const place=()=> container.setPosition(79,49);
    place(); this.scale.on('resize', place);
    const sm = this.scene.get('Game')?.soundManager;
    let muted = sm?.muted || false;
    draw(muted);
    const toggle=()=>{ if(!sm) return; muted=!muted; sm.mute(muted); draw(muted); };
    container.on('pointerdown', toggle);
    container.on('pointerover', ()=> container.setScale(1.05));
    container.on('pointerout', ()=> container.setScale(1));
    this._volBtn = container;
  }
}
