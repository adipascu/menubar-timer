#!/bin/bash
set -euo pipefail

dist=$1

megabytes() {
  awk -v bytes="$1" 'BEGIN { printf "%.1f MB", bytes / 1000000 }'
}

echo '| Artifact | Size |'
echo '| --- | --- |'
for dmg in "$dist"/*.dmg; do
  echo "| $(basename "$dmg") | $(megabytes "$(stat -f %z "$dmg")") |"
done
for app in "$dist"/mac*/*.app; do
  echo "| $(basename "$app") | $(megabytes "$(( $(du -sk "$app" | cut -f 1) * 1024 ))") |"
done
