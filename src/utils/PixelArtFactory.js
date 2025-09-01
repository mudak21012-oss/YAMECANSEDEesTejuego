// PixelArtFactory.js
// Genera sprites "pixel art" por código usando matrices de caracteres.
// Cada carácter mapea a un color. Se dibuja en un Graphics y se vuelca a una RenderTexture.

export class PixelArtFactory {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} px Tamaño del pixel virtual (4~6 recomendado)
   */
  constructor(scene, px = 4) {
    this.scene = scene;
    this.px = px;
    this.palette = {
      '.': null,
      'K': 0x111111,
      'k': 0x252525,
      'W': 0xffffff,
      'G': 0x62e06a,
      'g': 0x35a743,
      'Y': 0xffcf5a,
      'y': 0xd8a84a,
      'R': 0xff6b6b,
      'r': 0xd55454,
      'B': 0x79d0ff,
      'b': 0x4aa1d1,
      'P': 0xc77dff,
      'p': 0x9057c3,
      'S': 0xcdd5df,
      's': 0x9aa4b1,
      'O': 0x9b6b3a,
      'o': 0x6e4a27,
      'M': 0x9bf3f0,
      'm': 0x5cc7c3,
      'X': 0x000000
    };
  }

  // --- núcleo de pintado ---
  drawMatrix(matrix, palette = this.palette) {
    const h = matrix.length;
    if (!h) return null;
    const w = matrix[0].length;
    const g = this.scene.add.graphics();
    for (let y = 0; y < h; y++) {
      const row = matrix[y];
      for (let x = 0; x < w; x++) {
        const c = row[x];
        const color = palette[c];
        if (color == null) continue;
        g.fillStyle(color, 1).fillRect(x * this.px, y * this.px, this.px, this.px);
      }
    }
    const rt = this.scene.make.renderTexture({ width: w * this.px, height: h * this.px, add: false });
    rt.draw(g, 0, 0);
    g.destroy();
    const key = `paf_${Math.random().toString(36).slice(2)}`;
    rt.saveTexture(key);
    rt.destroy();
    const img = this.scene.add.image(0, 0, key).setOrigin(0);
    return img;
  }

  // rectángulo pixelado (botones/barras)
  rectPixel(w, h, theme = 'G') {
    const px = this.px;
    const cols = Math.max(2, Math.floor(w / px));
    const rows = Math.max(2, Math.floor(h / px));
    const face = Array.from({ length: rows }, () => Array(cols).fill('.'));
    const ink = 'K';
    for (let x = 0; x < cols; x++) { face[0][x] = ink; face[rows - 1][x] = ink; }
    for (let y = 0; y < rows; y++) { face[y][0] = ink; face[y][cols - 1] = ink; }
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) face[y][x] = theme;
    }
    if (rows > 3 && cols > 3) {
      const hi = theme === 'R' ? 'r' : theme === 'G' ? 'g' : theme === 'Y' ? 'y' : theme === 'B' ? 'b' : 'k';
      face[1][1] = hi;
      face[1][2] = hi;
      face[2][1] = hi;
      face[rows - 2][cols - 2] = 'k';
      face[rows - 3][cols - 2] = 'k';
      face[rows - 2][cols - 3] = 'k';
    }
    return this.drawMatrix(face.map(r => r.join('')));
  }

  // --- BOTÓN ---
  makeButton(label = 'START', theme = 'green') {
    const color = theme === 'green' ? 'G' : theme === 'yellow' ? 'Y' : theme === 'red' ? 'R' : 'B';
    const padding = 12;
    const tmp = this.scene.add.text(0, 0, label, { fontSize: '16px', color: '#fff' });
    const w = Math.max(120, tmp.width + padding * 2);
    const h = 40;
    tmp.destroy();
    const base = this.rectPixel(w, h, color);
    const txt = this.scene.add.text(base.width / 2, base.height / 2, label, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    const c = this.scene.add.container(0, 0, [base, txt]);
    c.setSize(base.width, base.height);
    c.setInteractive(new Phaser.Geom.Rectangle(0, 0, base.width, base.height), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => base.setTint(0xffffff));
    c.on('pointerout', () => base.clearTint());
    return c;
  }

  // --- BARRA ---
  makeBar(value, max = 100, theme = 'green', width = 160, height = 20) {
    const color = theme === 'green' ? 'G' : theme === 'yellow' ? 'Y' : theme === 'red' ? 'R' : 'B';
    const bg = this.rectPixel(width, height, '.');
    const pct = Phaser.Math.Clamp(value / max, 0, 1);
    const innerW = Math.max(0, Math.floor((width - 6) * pct));
    const fill = this.rectPixel(innerW, height - 6, color);
    fill.setPosition(3, 3);
    const border = this.rectPixel(width, height, 'K').setAlpha(0.55);
    const c = this.scene.add.container(0, 0, [bg, fill, border]);
    c.setSize(width, height);
    return c;
  }

  // --- Corazones ---
  heartMatrix(kind = 'full') {
    const outline = [
      '..KK....KK..',
      '.KRRK..KRRK.',
      'KRRRRKKRRRRK',
      'KRRRRRRRRRRK',
      'KRRRRRRRRRRK',
      '.KRRRRRRRRK.',
      '..KRRRRRRK..',
      '...KRRRRK...',
      '....KRRK....',
      '.....KK.....'
    ];
    const fillMask = [
      '....RRRR....',
      '..RRRRRRRR..',
      '.RRRRRRRRRR.',
      '.RRRRRRRRRR.',
      '.RRRRRRRRRR.',
      '..RRRRRRRR..',
      '...RRRRRR...',
      '....RRRR....',
      '.....RR.....',
      '......R.....'
    ];
    let mat = outline.map((row, y) => {
      const out = row.split('');
      if (kind === 'empty') return out.map(ch => (ch === 'K' ? 'K' : '.')).join('');
      const fill = fillMask[y];
      for (let x = 0; x < out.length; x++) if (fill[x] === 'R') out[x] = 'R';
      return out.join('');
    });
    if (kind === 'half') {
      mat = mat.map(row => {
        const a = row.split('');
        for (let i = Math.floor(a.length / 2); i < a.length; i++) if (a[i] === 'R') a[i] = '.';
        return a.join('');
      });
    }
    return mat;
  }
  makeHeart(kind = 'full') { return this.drawMatrix(this.heartMatrix(kind)); }

  // --- Íconos ---
  iconSword(){
    const m=[
      '.......S.....K.',
      '......SS....K..',
      '.....SSS...K...',
      '....SSSS..K....',
      '...SSSSS.K.....',
      '..SSSSSSK......',
      '..SSSSSSK......',
      '...SSSSSK......',
      '....SSSSK......',
      '.....SSSK......',
      '..O..SSSK......',
      '.OOO..SSK......',
      '.OOO..SSK......',
      '.OOO...SK......',
      '..O....SK......',
      '.......KK......'
    ];
    return this.drawMatrix(m);
  }
  iconShield(){
    const m=[
      '...K.K.K.K...',
      '..KSSSSSSSK..',
      '.KSSSWWWSSSK.',
      '.KSSWWWWSSSK.',
      '.KSSWWWWSSSK.',
      '.KSSSWWWSSSK.',
      '.KSSSSSSSSSK.',
      '..KSSSSSSSK..',
      '...KSSSSSK...',
      '....KSSSK....',
      '.....KSK.....',
      '......K......',
      '.............',
      '.............',
      '.............',
      '.............'
    ];
    return this.drawMatrix(m);
  }
  iconKey(){
    const m=[
      '.....YYYYK.....',
      '...YYYYYYYYK...',
      '..YYYWWWWWYK..',
      '.YYYWWWWWYYK..',
      '.YYYWWWWWYYK..',
      '..YYYWWWWYK...',
      '...YYYYYYYK...',
      '......YYK.....',
      '......YYK..K..',
      '......YYKKK...',
      '......YYK.....',
      '......YYK.....',
      '..............',
      '..............',
      '..............',
      '..............'
    ];
    return this.drawMatrix(m);
  }
  iconStar(){
    const m=[
      '......Y.......',
      '......Y.......',
      '...KYYYYYK....',
      '..KYYYYYYYK...',
      'YYYYYYYYYYYY..',
      '.KYYYYYYYYK...',
      '..KYYYYYYK....',
      '...KYYYYK.....',
      '.....YYY......',
      '......Y.......',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............'
    ];
    return this.drawMatrix(m);
  }
  iconDiamond(){
    const m=[
      '......B.......',
      '.....BBB......',
      '....BBBBB.....',
      '...BBBBBBB....',
      '..BBBBBBBBB...',
      '...BBBBBBB....',
      '....BBBBB.....',
      '.....BBB......',
      '......B.......',
      '......K.......',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............'
    ];
    return this.drawMatrix(m);
  }
  iconPotion(){
    const m=[
      '.......MM.....',
      '......MMMM....',
      '.......MM.....',
      '......KKK.....',
      '.....KWWWK....',
      '....KWWWWWK...',
      '...KWWWWWWWK..',
      '...KWWWWWWWK..',
      '...KWWWWWWWK..',
      '....KWWWWWK...',
      '.....KWWWK....',
      '......KKK.....',
      '......RRR.....',
      '.....RRRRR....',
      '....RRRRRRR...',
      '.....RRRRR....'
    ];
    return this.drawMatrix(m);
  }
  iconSkull(){
    const m=[
      '...KWWWWWWK...',
      '..KWWWWWWWWK..',
      '.KWWWWW..WWWK.',
      '.KWW.WW..WW.K.',
      '.KWWWWW..WWWK.',
      '.KWWWWWWWWWWK.',
      '..KWWWKKKWWW..',
      '...KWK...KWK..',
      '...KWK...KWK..',
      '...KWK...KWK..',
      '....K.....K...',
      '....K.....K...',
      '....K.....K...',
      '..............',
      '..............',
      '..............'
    ];
    return this.drawMatrix(m);
  }
  iconLightning(){
    const m=[
      '......YY......',
      '.....YYY......',
      '....YYY.......',
      '...YYY........',
      '...YY.........',
      '..YYY.........',
      '.YYY..........',
      'YYY...........',
      '..YYY.........',
      '...YYY........',
      '....YYY.......',
      '.....YYY......',
      '......YY......',
      '..............',
      '..............',
      '..............'
    ];
    return this.drawMatrix(m);
  }
  iconTrophy(){
    const m=[
      '....YYYYYY....',
      '...YWWWWWWY...',
      '..YWWWWWWWWY..',
      '..YWWWWWWWWY..',
      '...YWWWWWWY...',
      '....YWWWWY....',
      '.....YYYY.....',
      '.....YOOY.....',
      '.....YOOY.....',
      '....YOOOOY....',
      '...YOOOOOOY...',
      '....YYYYYY....',
      '.....YKKY.....',
      '.....YKKY.....',
      '.....YKKY.....',
      '......YY......'
    ];
    return this.drawMatrix(m);
  }
  iconHourglass(){
    const m=[
      '....KKKKKK....',
      '...KWWWWWWK...',
      '..KW......WK..',
      '.KW........WK.',
      '.KW........WK.',
      '..KW......WK..',
      '...KWWWWWWK...',
      '.....KKKK.....',
      '...KWWWWWWK...',
      '..KW......WK..',
      '.KW........WK.',
      '.KW........WK.',
      '..KW......WK..',
      '...KWWWWWWK...',
      '....KKKKKK....',
      '..............'
    ];
    return this.drawMatrix(m);
  }
  iconDPad(){
    const m=[
      '......K......',
      '.....KSK.....',
      '....KSSSK....',
      '...KSSSSSK...',
      '....KSSSK....',
      '.....KSK.....',
      'KKKKKKKKKKKKK',
      'KSSSSSSSSSSSK',
      'KKKKKKKKKKKKK',
      '.....KSK.....',
      '....KSSSK....',
      '...KSSSSSK...',
      '....KSSSK....',
      '.....KSK.....',
      '......K......',
      '.............'
    ];
    return this.drawMatrix(m);
  }
}
