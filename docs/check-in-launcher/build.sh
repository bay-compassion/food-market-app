#!/bin/zsh
# Builds Check-In Launcher.app from launch.sh: the same bundle Automator's File > Export produces, an
# Automator application stub with a workflow inside. Open the result in Automator to inspect it.
#
#   docs/check-in-launcher/build.sh [output.app] [script]
#
# Defaults to the Desktop and launch.sh. The script argument exists for testing against a local site.

set -euo pipefail

here=${0:A:h}
app=${1:-$HOME/Desktop/Check-In Launcher.app}
script=${2:-$here/launch.sh}
stub='/System/Library/CoreServices/Automator Application Stub.app'

rm -rf "$app"
cp -R "$stub" "$app"

cp "$here/document.wflow" "$app/Contents/document.wflow"
plutil -replace actions.0.action.ActionParameters.COMMAND_STRING -string "$(<"$script")" \
	"$app/Contents/document.wflow"

info="$app/Contents/Info.plist"
plutil -replace CFBundleName -string 'Check-In Launcher' "$info"
plutil -replace CFBundleIdentifier -string 'org.thebaycompassion.check-in-launcher' "$info"

# The Bay Compassion logo, from make-icon.sh. A newer stub also names an icon in its asset catalog
# (CFBundleIconName), which wins over the .icns, so that key goes; El Capitan's stub has none.
cp "$here/icon.icns" "$app/Contents/Resources/AppIcon.icns"
plutil -replace CFBundleIconFile -string 'AppIcon' "$info"
plutil -remove CFBundleIconName "$info" 2>/dev/null || true

# The workflow and plist changes invalidate the stub's signature, and Apple Silicon won't run an app
# with a broken one. Ad hoc is enough on the Mac that built it; see the guide for copying it elsewhere.
codesign --force --deep --sign - "$app"
codesign --verify --deep --strict "$app"

# Finder caches an app's icon; a new modification date makes it look again.
touch "$app"

echo "Built $app"
