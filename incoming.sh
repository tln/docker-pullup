#!/bin/sh
# Proxy between incoming HTTP request on stdin/stdout and node server running on port 1996
# The node server is started when needed.
busybox nc localhost:1996 2>/dev/null || {
    PULLUP_IDLE_EXIT=5 node index.js 1>&2 &
    sleep 0.1
    until busybox nc localhost:1996 2>/dev/null; do
        sleep 0.05;
    done
}
