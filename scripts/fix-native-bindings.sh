#!/bin/sh
# Work around native .node load failures on Android/arm64 (Termux).
#
# The platform linker refuses to dlopen() native addons whose real path is not
# under a permitted directory. Anything living under /root hits
# ERR_DLOPEN_FAILED, which breaks Tailwind's oxide engine (and lightningcss,
# and Turbopack's native bindings).
#
# Copying the addon to a permitted path fixes it. A symlink does NOT: the
# linker resolves the real path, so the symlink is rejected the same way.
#
# Idempotent; safe to re-run. Sets NAPI_RS_NATIVE_LIBRARY_PATH for oxide, which
# then needs to be present in .env.local (see the note written at the end).

set -eu

PROJECT_DIR=$(cd "$(dirname "$0")/.." && pwd)
STAGE_DIR=/data/local/tmp/sahlafood-native
OXIDE_BIN=tailwindcss-oxide.android-arm64.node
OXIDE_SRC="$PROJECT_DIR/node_modules/@tailwindcss/oxide-android-arm64/$OXIDE_BIN"
OXIDE_DST="$STAGE_DIR/$OXIDE_BIN"

mkdir -p "$STAGE_DIR"

if [ ! -f "$OXIDE_SRC" ]; then
  echo "oxide binary not found at: $OXIDE_SRC" >&2
  echo "run 'npm install' first" >&2
  exit 1
fi

# Re-copy when missing or when the installed version changed.
if [ ! -f "$OXIDE_DST" ] || [ "$OXIDE_SRC" -nt "$OXIDE_DST" ]; then
  cp "$OXIDE_SRC" "$OXIDE_DST"
  echo "staged $OXIDE_DST"
else
  echo "already up to date: $OXIDE_DST"
fi

# Verify the copy actually loads before we tell anyone it is fixed.
if node -e "process.env.NAPI_RS_NATIVE_LIBRARY_PATH='$OXIDE_DST'; require('@tailwindcss/oxide')" 2>/dev/null; then
  echo "verified: @tailwindcss/oxide loads from the staged path"
else
  echo "verification FAILED: oxide still cannot load from $OXIDE_DST" >&2
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