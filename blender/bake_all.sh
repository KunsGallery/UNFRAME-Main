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
  done
done
