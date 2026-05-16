#!/usr/bin/env bash
set -e
UUID="pin-window@eltaweel068"
SRC="$(dirname "$(readlink -f "$0")")/$UUID"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

rm -rf "$DEST"
mkdir -p "$DEST"
cp -a "$SRC"/. "$DEST"/

glib-compile-schemas "$DEST/schemas"

echo "Installed to $DEST"
echo
echo "Next steps:"
echo "  1. Log out and back in (or on Xorg: Alt+F2, type 'r', Enter)."
echo "  2. Enable:   gnome-extensions enable $UUID"
echo "  3. Focus a window and press Control+Super+Z to pin it."