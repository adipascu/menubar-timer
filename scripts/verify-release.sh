#!/bin/bash
set -euo pipefail

tag=$1
built_dmg=$2
name=$(basename "$built_dmg")
expected_identifier=$(node -p "require('./electron-builder.json').appId")
work=$(mktemp -d)
mount_point="$work/mount"

gh release download "$tag" --pattern "$name" --dir "$work"
published_dmg="$work/$name"

built_sum=$(shasum -a 256 "$built_dmg" | cut -d ' ' -f 1)
published_sum=$(shasum -a 256 "$published_dmg" | cut -d ' ' -f 1)
if [ "$built_sum" != "$published_sum" ]; then
  echo "published $name has checksum $published_sum, the built one has $built_sum" >&2
  exit 1
fi
echo "published $name matches the built one: $built_sum"

hdiutil attach "$published_dmg" -quiet -readonly -nobrowse -mountpoint "$mount_point"
trap 'hdiutil detach "$mount_point"' EXIT

app=$(echo "$mount_point"/*.app)
codesign --verify --strict --verbose=2 "$app"
identifier=$(codesign -d "$app" 2>&1 | sed -n 's/^Identifier=//p')
if [ "$identifier" != "$expected_identifier" ]; then
  echo "$app is signed as $identifier, expected $expected_identifier" >&2
  exit 1
fi
echo "$app is signed as $identifier"
