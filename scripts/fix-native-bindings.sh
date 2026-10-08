#!/bin/sh
# Work around native .node load failures on Android/arm64 (Termux).
#
# The platform linker refuses to dlopen() native addons whose real path is not
# under a permitted directory. Anything living under /root hits
# ERR_DLOPEN_FAILED, which breaks Tailwind's oxide engine and lightningcss
# (and Turbopack's native bindings).
#
# Copying the addon to a permitted path fixes it. A symlink to the .node does
# NOT: the linker resolves the real path, so it is rejected the same way. What
# works is replacing the whole installed package directory with a symlink whose
# target lives under /data, since that resolves correctly.
#
# Idempotent; safe to re-run. Run it after every `npm install`, which replaces
# node_modules and undoes the lightningcss link.

set -eu

PROJECT_DIR=$(cd "$(dirname "$0")/.." && pwd)
STAGE_DIR=/data/local/tmp/sahlafood-native

mkdir -p "$STAGE_DIR"

stage_file() {
  # stage_file <source> <staged-filename>
  src=$1
  dst="$STAGE_DIR/$2"
  if [ ! -f "$src" ]; then
    echo "skip (not installed): $src" >&2
    return 0
  fi
  if [ ! -f "$dst" ] || [ "$src" -nt "$dst" ]; then
    cp "$src" "$dst"
    echo "staged $dst"
  else
    echo "already staged: $dst"
  fi
}

# --- Tailwind oxide -------------------------------------------------------
# Reads NAPI_RS_NATIVE_LIBRARY_PATH, so staging the file is enough.
OXIDE_BIN=tailwindcss-oxide.android-arm64.node
OXIDE_SRC="$PROJECT_DIR/node_modules/@tailwindcss/oxide-android-arm64/$OXIDE_BIN"
OXIDE_DST="$STAGE_DIR/$OXIDE_BIN"
stage_file "$OXIDE_SRC" "$OXIDE_BIN"

# --- lightningcss ---------------------------------------------------------
# No environment escape hatch, so the package directory itself is replaced.
LCSS_BIN=lightningcss.android-arm64.node
LCSS_PKG="$PROJECT_DIR/node_modules/lightningcss-android-arm64"
LCSS_STAGE="$STAGE_DIR/lightningcss-android-arm64"

if [ -L "$LCSS_PKG" ]; then
  echo "already linked: $LCSS_PKG -> $(readlink "$LCSS_PKG")"
elif [ -d "$LCSS_PKG" ]; then
  mkdir -p "$LCSS_STAGE"
  cp "$LCSS_PKG/$LCSS_BIN" "$LCSS_STAGE/$LCSS_BIN"
  cp "$LCSS_PKG/package.json" "$LCSS_STAGE/package.json"
  rm -rf "$LCSS_PKG"
  ln -s "$LCSS_STAGE" "$LCSS_PKG"
  echo "linked $LCSS_PKG -> $LCSS_STAGE"
else
  echo "skip lightningcss (package not installed)"
fi

# --- verify ---------------------------------------------------------------
# Confirm both actually load before reporting success.
if node -e "process.env.NAPI_RS_NATIVE_LIBRARY_PATH='$OXIDE_DST'; require('@tailwindcss/oxide')" 2>/dev/null; then
  echo "verified: @tailwindcss/oxide loads"
else
  echo "verification FAILED: oxide cannot load from $OXIDE_DST" >&2
  exit 1
fi

if node -e "require('lightningcss')" 2>/dev/null; then
  echo "verified: lightningcss loads"
else
  echo "verification FAILED: lightningcss cannot load from $LCSS_PKG" >&2
  exit 1
fi

ENV_LOCAL="$PROJECT_DIR/.env.local"
LINE="NAPI_RS_NATIVE_LIBRARY_PATH=$OXIDE_DST"

if [ -f "$ENV_LOCAL" ] && grep -q '^NAPI_RS_NATIVE_LIBRARY_PATH=' "$ENV_LOCAL"; then
  # Rewrite in place rather than appending a duplicate key.
  tmp=$(mktemp)
  sed "s|^NAPI_RS_NATIVE_LIBRARY_PATH=.*|$LINE|" "$ENV_LOCAL" > "$tmp"
  mv "$tmp" "$ENV_LOCAL"
  echo "updated NAPI_RS_NATIVE_LIBRARY_PATH in $ENV_LOCAL"
else
  printf '\n%s\n' "$LINE" >> "$ENV_LOCAL"
  echo "added NAPI_RS_NATIVE_LIBRARY_PATH to $ENV_LOCAL"
fi

echo
echo "Reminders:"
echo "  - re-run this script after any 'npm install'"
echo "  - this is a Termux workaround; it is not needed on Linux/macOS/CI"