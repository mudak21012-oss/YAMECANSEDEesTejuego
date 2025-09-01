export function stampPixelLogo(scene, key, finalWidth = 200) {
  if (!scene.textures.exists(key)) return scene.add.container(0,0);
  const src = scene.textures.get(key).getSourceImage();
  const ratio = src.height / src.width;
  const smallW = Math.max(48, Math.round(finalWidth / 4));
  const smallH = Math.round(smallW * ratio);
  const tmp = scene.add.image(0,0,key).setOrigin(0).setDisplaySize(smallW, smallH);
  const rtSmall = scene.make.renderTexture({ width: smallW, height: smallH, add: false });
  rtSmall.draw(tmp, 0, 0); tmp.destroy();
  const pixKey = `logo_px_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  rtSmall.saveTexture(pixKey); rtSmall.destroy();
  return scene.add.image(0,0,pixKey).setOrigin(0.5).setDisplaySize(finalWidth, Math.round(finalWidth * ratio));
}
