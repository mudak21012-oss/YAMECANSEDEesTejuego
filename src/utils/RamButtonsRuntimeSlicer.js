// Runtime slicer for 'ram_buttons' sheet when pre-generated manifest assets/ui/ram/manifest.json are absent.
// Detects non-black connected regions, creates individual textures, and builds an in-memory manifest.
// Black (#000000) pixels become fully transparent.
export function sliceRamButtonsRuntime(scene, {
  sheetKey = 'ram_buttons',
  buttonSizeThreshold = 40,
  minPixels = 12,
  rowBucketH = 40,
  prefixBtn = 'btn:',
  prefixIco = 'ico:'
} = {}) {
  const tex = scene.textures.get(sheetKey);
  if (!tex || !tex.getSourceImage()) return null;
  const img = tex.getSourceImage();
  const W = img.width, H = img.height;
  const canvas = scene.textures.createCanvas(Phaser.Utils.String.UUID(), W, H).getSourceImage();
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0,0,W,H);
  const data = imgData.data;
  const isNonBlack = (x,y)=>{ const i=(y*W+x)*4; return data[i]||data[i+1]||data[i+2]; };
  const visited = new Uint8Array(W*H);
  const boxes=[];
  const stackX=[], stackY=[];
  function flood(sx,sy){
    stackX.length=0; stackY.length=0;
    stackX.push(sx); stackY.push(sy);
    visited[sy*W+sx]=1;
    let minx=sx,maxx=sx,miny=sy,maxy=sy,count=0;
    while(stackX.length){
      const x=stackX.pop(); const y=stackY.pop(); count++;
      if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y;
      // 4-neigh
      if(x+1<W){ const nx=x+1, ny=y; const idx=ny*W+nx; if(!visited[idx]&&isNonBlack(nx,ny)){visited[idx]=1; stackX.push(nx); stackY.push(ny);} }
      if(x-1>=0){ const nx=x-1, ny=y; const idx=ny*W+nx; if(!visited[idx]&&isNonBlack(nx,ny)){visited[idx]=1; stackX.push(nx); stackY.push(ny);} }
      if(y+1<H){ const nx=x, ny=y+1; const idx=ny*W+nx; if(!visited[idx]&&isNonBlack(nx,ny)){visited[idx]=1; stackX.push(nx); stackY.push(ny);} }
      if(y-1>=0){ const nx=x, ny=y-1; const idx=ny*W+nx; if(!visited[idx]&&isNonBlack(nx,ny)){visited[idx]=1; stackX.push(nx); stackY.push(ny);} }
    }
    // expand 1px margin
    minx=Math.max(0,minx-1); miny=Math.max(0,miny-1);
    maxx=Math.min(W-1,maxx+1); maxy=Math.min(H-1,maxy+1);
    return {minx,miny,maxx,maxy,count};
  }
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const idx=y*W+x;
      if(!visited[idx] && isNonBlack(x,y)){
        const b=flood(x,y);
        if(b.count>=minPixels) boxes.push(b);
      }
    }
  }
  if(!boxes.length) return null;
  boxes.sort((a,b)=> (Math.floor(a.miny/rowBucketH)-Math.floor(b.miny/rowBucketH)) || (a.minx-b.minx));
  const rowMap={};
  boxes.forEach(b=>{ const r=Math.floor(b.miny/rowBucketH); (rowMap[r] ||= []).push(b); });

  const manifest={buttons:[],icons:[]};
  let rowIdx=0;
  for(const r of Object.keys(rowMap).map(Number).sort((a,b)=>a-b)){
    let colIdx=0;
    for(const b of rowMap[r]){
      const w=b.maxx-b.minx+1, h=b.maxy-b.miny+1;
      const sub = ctx.getImageData(b.minx,b.miny,w,h);
      const d=sub.data;
      for(let i=0;i<d.length;i+=4){ if(!d[i] && !d[i+1] && !d[i+2]) d[i+3]=0; }
      const tmpCanvas=document.createElement('canvas'); tmpCanvas.width=w; tmpCanvas.height=h;
      tmpCanvas.getContext('2d').putImageData(sub,0,0);
      const isBtn = Math.max(w,h) >= buttonSizeThreshold;
      const name=`${isBtn?'btn':'ico'}_r${String(rowIdx).padStart(2,'0')}_c${String(colIdx).padStart(2,'0')}.png`;
      const key = (isBtn?prefixBtn:prefixIco)+name;
      // Add as new texture if not already present
      if(!scene.textures.exists(key)) scene.textures.addImage(key, tmpCanvas);
      const rec={name, w, h, path:`<runtime>${key}`};
      (isBtn?manifest.buttons:manifest.icons).push(rec);
      colIdx++;
    }
    rowIdx++;
  }
  // Store manifest in cache for uniform access
  if(!scene.cache.json.exists('ram_manifest')) scene.cache.json.add('ram_manifest', manifest);
  return manifest;
}
