#!/usr/bin/env python3
"""Slice Ram Buttons sprite sheet into individual transparent PNGs and manifest.

Requirements:
  pip install pillow

Run:
  python tools/slice_ram_buttons.py

By default it expects the source sheet at assets/ui/Ram Buttons.png
If your file currently lives at assets/botones/Ram Buttons.png adjust INPUT below
or pass an env var: RAM_SHEET=assets/botones/"Ram Buttons.png" python tools/slice_ram_buttons.py
"""
from __future__ import annotations
from PIL import Image
import json, os, sys

INPUT = os.environ.get("RAM_SHEET", "assets/ui/Ram Buttons.png")
OUTDIR = "assets/ui/ram"
BTN_DIR = os.path.join(OUTDIR, "buttons")
ICO_DIR = os.path.join(OUTDIR, "icons")
MANIFEST = os.path.join(OUTDIR, "manifest.json")

MIN_PIXELS = 12        # component area threshold to skip noise
BUTTON_SIZE_THRESHOLD = 40  # classify as button if max(width,height) >= this
ROW_BUCKET_H = 40      # height bucket for ordering (group components into rows)

def main():
    if not os.path.isfile(INPUT):
        alt = "assets/botones/Ram Buttons.png"
        if os.path.isfile(alt):
            print(f"[info] INPUT not found, using fallback {alt}")
            global INPUT
            INPUT = alt
        else:
            print(f"Error: sheet not found: {INPUT}")
            return 2

    os.makedirs(BTN_DIR, exist_ok=True)
    os.makedirs(ICO_DIR, exist_ok=True)

    im = Image.open(INPUT).convert("RGBA")
    W, H = im.size
    px = im.load()

    # Binary mask: True if NOT pure black (#000000)
    mask = [[(px[x, y][0] | px[x, y][1] | px[x, y][2]) != 0 for x in range(W)] for y in range(H)]
    visited = [[False]*W for _ in range(H)]

    sys.setrecursionlimit(1000000)

    def flood(y0:int, x0:int):
        stack=[(y0,x0)]
        visited[y0][x0]=True
        minx=maxx=x0
        miny=maxy=y0
        count=0
        while stack:
            y,x = stack.pop()
            count += 1
            if x<minx: minx=x
            if x>maxx: maxx=x
            if y<miny: miny=y
            if y>maxy: maxy=y
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny, nx = y+dy, x+dx
                if 0<=ny<H and 0<=nx<W and not visited[ny][nx] and mask[ny][nx]:
                    visited[ny][nx]=True
                    stack.append((ny,nx))
        # expand 1px margin
        minx = max(0, minx-1); miny = max(0, miny-1)
        maxx = min(W-1, maxx+1); maxy = min(H-1, maxy+1)
        return (minx, miny, maxx+1, maxy+1, count)

    boxes=[]
    for y in range(H):
        for x in range(W):
            if mask[y][x] and not visited[y][x]:
                minx,miny,maxx,maxy,count = flood(y,x)
                if count >= MIN_PIXELS:
                    boxes.append((minx,miny,maxx,maxy,count))

    if not boxes:
        print("No components detected; aborting.")
        return 1

    # sort into row buckets (top->down) and left->right
    boxes.sort(key=lambda b:(b[1]//ROW_BUCKET_H, b[0]))
    rows={}
    for b in boxes:
        r = b[1]//ROW_BUCKET_H
        rows.setdefault(r,[]).append(b)

    manifest={"buttons":[], "icons":[]}
    row_idx=0
    for r in sorted(rows.keys()):
        col_idx=0
        for (x0,y0,x1,y1,_cnt) in rows[r]:
            w = x1-x0; h = y1-y0
            crop = im.crop((x0,y0,x1,y1)).copy()
            # convert black to transparent
            data = crop.getdata()
            new = []
            for (R,G,B,A) in data:
                if R==0 and G==0 and B==0:
                    new.append((0,0,0,0))
                else:
                    new.append((R,G,B,A))
            crop.putdata(new)
            is_button = max(w,h) >= BUTTON_SIZE_THRESHOLD
            name = f"{'btn' if is_button else 'ico'}_r{row_idx:02d}_c{col_idx:02d}.png"
            outdir = BTN_DIR if is_button else ICO_DIR
            outpath = os.path.join(outdir, name)
            crop.save(outpath, "PNG", optimize=True)
            rec = {"name":name, "w":w, "h":h, "path":f"assets/ui/ram/{'buttons' if is_button else 'icons'}/{name}"}
            (manifest["buttons"] if is_button else manifest["icons"]).append(rec)
            col_idx += 1
        row_idx += 1

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"OK ✓  Exportados {len(manifest['buttons'])} botones y {len(manifest['icons'])} iconos.")
    print(f"Manifest: {MANIFEST}")

if __name__ == "__main__":
    raise SystemExit(main())
