// Pixel panel v2 (glow más marcado, esquinas redondeadas mayores y header más alto)
export function makePixelPanel(scene, w, h, theme="slate"){
  const P = {
    slate:{ base:0x202932, hi:0x2a3642, edge:0x11161b, glow:0x000000, glowA:0.40 },
    coal: { base:0x141414, hi:0x1e1e1e, edge:0x0a0a0a, glow:0x000000, glowA:0.48 }
  }[theme] || {};
  const g = scene.add.graphics();
  // sombra / glow
  g.fillStyle(P.glow, P.glowA).fillRoundedRect(6,8, w, h, 12);
  // cuerpo
  g.fillStyle(P.base, 1).fillRoundedRect(0,0, w, h, 12);
  // highlight header
  g.fillStyle(P.hi, 1).fillRoundedRect(2,2, w-4, Math.max(12, h*0.18), 10);
  // borde
  g.lineStyle(2, P.edge, 1).strokeRoundedRect(1,1, w-2, h-2, 12);

  const rt = scene.make.renderTexture({ width:w+10, height:h+10, add:false });
  rt.draw(g, 0, 0); g.destroy();
  const key = `pxpanel_${Math.random().toString(36).slice(2)}`;
  rt.saveTexture(key); rt.destroy();
  return scene.add.image(0,0,key).setOrigin(0,0);
}
