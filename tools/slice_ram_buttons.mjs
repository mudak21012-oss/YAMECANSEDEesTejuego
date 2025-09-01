#!/usr/bin/env node
/**
 * Node/Sharp variant of Ram Buttons slicer.
 * Requires: npm i sharp
 * Run: node tools/slice_ram_buttons.mjs
 */
import fs from 'node:fs';
import sharp from 'sharp';

let INPUT = process.env.RAM_SHEET || 'assets/ui/Ram Buttons.png';
if (!fs.existsSync(INPUT)) {
  const alt = 'assets/botones/Ram Buttons.png';
  if (fs.existsSync(alt)) { console.log('[info] Using fallback', alt); INPUT = alt; }
}
const OUTDIR = 'assets/ui/ram';
const BTN = `${OUTDIR}/buttons`; const ICO = `${OUTDIR}/icons`;
fs.mkdirSync(BTN, {recursive:true}); fs.mkdirSync(ICO, {recursive:true});

const MIN_PIXELS = 12;
const BUTTON_SIZE_THRESHOLD = 40;
const ROW_BUCKET_H = 40;

const img = sharp(INPUT).ensureAlpha();
const meta = await img.metadata();
const W = meta.width, H = meta.height;
const raw = await img.raw().toBuffer(); // RGBA

const idx=(x,y)=> (y*W + x)*4;
const isNonBlack=(x,y)=> { const i=idx(x,y); return raw[i]||raw[i+1]||raw[i+2]; };
const visited=new Uint8Array(W*H);

function flood(sx,sy){
  const stack=[sx,sy]; visited[sy*W+sx]=1;
  let minx=sx,maxx=sx,miny=sy,maxy=sy,count=0;
  while(stack.length){
    const y=stack.pop(), x=stack.pop(); count++;
    if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y;
    const nb=[x+1,y, x-1,y, x,y+1, x,y-1];
    for(let i=0;i<nb.length;i+=2){
      const nx=nb[i], ny=nb[i+1];
      if(nx>=0&&ny>=0&&nx<W&&ny<H && !visited[ny*W+nx] && isNonBlack(nx,ny)){
        visited[ny*W+nx]=1; stack.push(ny,nx);
      }
    }
  }
  // expand 1px
  minx=Math.max(0,minx-1); miny=Math.max(0,miny-1);
  maxx=Math.min(W-1,maxx+1); maxy=Math.min(H-1,maxy+1);
  return {minx,miny,maxx,maxy,count};
}

const boxes=[];
for(let y=0;y<H;y++){
  for(let x=0;x<W;x++){
    if(!visited[y*W+x] && isNonBlack(x,y)){
      const b=flood(x,y); if(b.count>=MIN_PIXELS) boxes.push(b);
    }
  }
}
if(!boxes.length){ console.error('No components detected'); process.exit(1); }

boxes.sort((a,b)=> (Math.floor(a.miny/ROW_BUCKET_H)-Math.floor(b.miny/ROW_BUCKET_H)) || (a.minx-b.minx));
const rowMap={};
for(const b of boxes){
  const r=Math.floor(b.miny/ROW_BUCKET_H); (rowMap[r] ||= []).push(b);
}

const manifest={ buttons:[], icons:[] };
let rowIdx=0;
for(const r of Object.keys(rowMap).map(Number).sort((a,b)=>a-b)){
  let colIdx=0;
  for(const b of rowMap[r]){
    const w=b.maxx-b.minx+1, h=b.maxy-b.miny+1;
    const extract = await sharp(INPUT).extract({ left:b.minx, top:b.miny, width:w, height:h }).ensureAlpha();
    const buf = await extract.raw().toBuffer();
    // black -> transparent
    for (let i=0;i<buf.length;i+=4){ if(!buf[i] && !buf[i+1] && !buf[i+2]) buf[i+3]=0; }
    const isBtn = Math.max(w,h) >= BUTTON_SIZE_THRESHOLD;
    const name = `${isBtn?'btn':'ico'}_r${String(rowIdx).padStart(2,'0')}_c${String(colIdx).padStart(2,'0')}.png`;
    const outPath = `${isBtn?BTN:ICO}/${name}`;
    await sharp(buf,{raw:{width:w,height:h,channels:4}}).png({compressionLevel:9}).toFile(outPath);
    const rec={ name, w, h, path:`assets/ui/ram/${isBtn?'buttons':'icons'}/${name}` };
    (isBtn?manifest.buttons:manifest.icons).push(rec);
    colIdx++;
  }
  rowIdx++;
}

fs.writeFileSync(`${OUTDIR}/manifest.json`, JSON.stringify(manifest,null,2), 'utf8');
console.log(`OK ✓ Exportados ${manifest.buttons.length} botones y ${manifest.icons.length} iconos.`);
console.log('Manifest: assets/ui/ram/manifest.json');
