#!/bin/sh
# Proxy between incoming HTTP request on stdin/stdout and node server running on port 1996
# The node server is started when needed.
nc localhost:1996 || {
    PULLUP_IDLE_EXIT=5 node index.js 1>&2 &
    sleep 0.1
    until nc localhost:1996; do
        sleep 0.05;
    done
}
