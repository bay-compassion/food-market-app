#!/bin/zsh
# Regenerates icon.icns, Check-In Launcher's icon, from the logo in public/. The result is committed,
# so build.sh only copies it and building the launcher needs nothing but macOS. This needs the Xcode
# command line tools, for Swift; run it after the logo changes.
#
#   docs/check-in-launcher/make-icon.sh

set -euo pipefail

here=${0:A:h}
logo=$here/../../public/bay-compassion-icon-digital.svg
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

swift "$here/render-icon.swift" "$logo" "$work/icon-1024.png"

set=$work/icon.iconset
mkdir "$set"
for size in 16 32 128 256 512; do
	sips -z $size $size "$work/icon-1024.png" --out "$set/icon_${size}x${size}.png" >/dev/null
	double=$((size * 2))
	sips -z $double $double "$work/icon-1024.png" --out "$set/icon_${size}x${size}@2x.png" >/dev/null
done

iconutil -c icns -o "$here/icon.icns" "$set"
echo "Wrote $here/icon.icns"
