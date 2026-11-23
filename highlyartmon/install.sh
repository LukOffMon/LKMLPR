#!/usr/bin/env sh
# HighlyArtMon - macOS / Linux installer.
#   curl -fsSL https://raw.githubusercontent.com/LukOffMon/LKMLPR/main/highlyartmon/install.sh | sh
set -e
SRC="https://github.com/LukOffMon/LKMLPR/archive/refs/heads/main.zip#subdirectory=highlyartmon/app"
DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd || true)"
[ -n "$DIR" ] && [ -f "$DIR/app/pyproject.toml" ] && SRC="$DIR/app"

PY=""
for c in python3 python; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)'; then PY="$c"; break; fi
done
[ -z "$PY" ] && { echo "Python 3.9+ is required (macOS: brew install python, Debian/Ubuntu: sudo apt install python3-pip)"; exit 1; }

echo "-> Installing HighlyArtMon"
"$PY" -m pip install --user --upgrade --quiet --disable-pip-version-check "$SRC" 2>/dev/null || \
  "$PY" -m pip install --user --upgrade --quiet --disable-pip-version-check --break-system-packages "$SRC"

PYABS="$("$PY" -c 'import sys; print(sys.executable)')"
if [ "$(uname)" = "Linux" ]; then
  mkdir -p "$HOME/.local/share/applications"
  cat > "$HOME/.local/share/applications/highlyartmon.desktop" <<EOF
[Desktop Entry]
Name=HighlyArtMon
Comment=Pixel-art studio for you and Claude
Exec=$PYABS -m highlyartmon
Terminal=false
Type=Application
Categories=Graphics;
EOF
fi

"$PYABS" -m highlyartmon connect
nohup "$PYABS" -m highlyartmon >/dev/null 2>&1 &
echo "Done. HighlyArtMon is open (run: $PYABS -m highlyartmon). Ask Claude for a sprite."
