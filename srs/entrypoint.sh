#!/bin/sh
# Render SRS config: substitute $CANDIDATE at runtime.
# Uses sed instead of envsubst because the ossrs/srs image does not ship
# gettext. The docker service sets CANDIDATE to the server's public IP.
set -e

TEMPLATE=/usr/local/srs/conf/srs.conf.tmpl
TARGET=/usr/local/srs/conf/srs.conf

if [ -z "$CANDIDATE" ]; then
  echo "WARN: CANDIDATE not set; WebRTC will not work. Set it to the public IP." >&2
  CANDIDATE="127.0.0.1"
fi

sed "s|\$CANDIDATE|${CANDIDATE}|g" "$TEMPLATE" > "$TARGET"

# Fail fast with a clear message if the rendered config is invalid.
if ! objs/srs -t -c "$TARGET"; then
  echo "ERROR: rendered SRS config is invalid ($TARGET):" >&2
  cat "$TARGET" >&2
  exit 1
fi

exec objs/srs -c "$TARGET"
