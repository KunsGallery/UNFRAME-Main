# Baked gallery rooms (Blender)

The virtual gallery's room shell can be modelled, lit and baked in Blender, then shown on the web
unlit (fast on phones). Artworks are not baked: the web hangs them as before and draws a
pre-rendered light pool behind each one, scaled to the work.

## Files

- `export-scene.mjs` writes the room size, the sample artworks and camera views as JSON, using the
  site's own layout and tour camera code, so Blender matches the web.
- `build_gallery.py` builds the room from that JSON (walls, beams, window, rails, bench, garden),
  with Poly Haven CC0 assets, and renders the camera views.
  Options: `floor=concrete|parquet`, `lighting=general|museum`, `light=frame|wide`,
  `views=a,b`, `prefix=name-`.
- `bake_room.py` runs after it in the same Blender session and writes `room.glb`, `room.jpg`
  (lighting), `garden.jpg` (360° view for the window) and `pool-*.png` (artwork light shapes).
- `bake_all.sh` bakes small, medium and large in both lighting modes (about 30–40 minutes).

Assets (`assets/`, about 185 MB) and renders (`out/`) are not committed. Download the Poly Haven
files listed in `build_gallery.py` and `bake_room.py` into `assets/polyhaven/` first.

## Run

```sh
node blender/export-scene.mjs large > blender/scene.json
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
  --python blender/build_gallery.py -- blender/scene.json blender/out 128
sh blender/bake_all.sh 256 4096
```

Copy each `out/bake-<size>-<lighting>/` (room.glb, room.jpg, garden.jpg) to
`site/assets/virtual/baked/<size>-<lighting>/`, and the `pool-*.png` once to
`site/assets/virtual/baked/pools/`. Preview with `?room=baked&light=frame|wide` on a gallery.
