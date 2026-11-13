#!/bin/sh
# Bakes every room size in both lighting modes into out/bake-<size>-<lighting>/.
# Usage: sh blender/bake_all.sh [samples] [bake_size]
cd "$(dirname "$0")"
BLENDER=/Applications/Blender.app/Contents/MacOS/Blender
SAMPLES=${1:-256}; SIZE=${2:-4096}
for room in small medium large; do
  node export-scene.mjs "$room" > "scene-$room.json" || exit 1
  for lighting in general museum; do
    echo "== $room $lighting"
    "$BLENDER" -b --factory-startup --python build_gallery.py --python bake_room.py -- \
      "scene-$room.json" "out/bake-$room-$lighting" "$SAMPLES" views=none bake_size="$SIZE" lighting="$lighting" \
      > "out/bake-$room-$lighting.log" 2>&1 || { echo "FAILED $room $lighting"; exit 1; }
    grep -E "BAKE DONE|DENOISE" "out/bake-$room-$lighting.log"
    # Copy what the web loads into the site.
    site="../site/assets/virtual/baked/$room-$lighting"
    rm -rf "$site" && mkdir -p "$site"
    (cd "out/bake-$room-$lighting" && cp room.glb room.jpg garden.jpg garden.glb garden-ground.jpg garden.json card-*.webp strip-*.webp "../../$site/")
  done
done
mkdir -p ../site/assets/virtual/baked/pools && cp out/bake-large-general/pool-*.png ../site/assets/virtual/baked/pools/
