#!/bin/sh
# Render SRS config with envsubst so $CANDIDATE is replaced at runtime.
# Usage: the docker service sets CANDIDATE to the server's public IP.
set -e

TEMPLATE=/usr/local/srs/conf/srs.conf.tmpl
TARGET=/usr/local/srs/conf/srs.conf

if [ -z "$CANDIDATE" ]; then
  echo "WARN: CANDIDATE not set; WebRTC will not work. Set it to the public IP." >&2
  CANDIDATE="127.0.0.1"
fi

envsubst '$CANDIDATE' < "$TEMPLATE" > "$TARGET"
exec objs/srs -c "$TARGET"
