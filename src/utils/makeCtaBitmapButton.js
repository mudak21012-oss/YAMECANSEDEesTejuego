import { GradientButtonFactory } from "./GradientButtonFactory.js";
export function makeCtaBitmapButton(scene,x,y,{label="START",theme="green",size=28,letterSpacing=2,onClick=()=>{},w=240,h=48,radius=20}={}){
  const CTA=new GradientButtonFactory(scene);
  const btn=CTA.make(x,y,{label:"",theme,onClick,w,h,radius,fontSize:1});
  btn.list.filter(ch=> ch instanceof Phaser.GameObjects.Text).forEach(ch=>ch.destroy());
  const bmp=scene.add.bitmapText(0,0,"casual",label.toUpperCase(),size).setOrigin(0.5).setLetterSpacing(letterSpacing).setTint(0x0f1116);
  btn.add(bmp);
  return btn;
}
