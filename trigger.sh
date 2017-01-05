#!/bin/sh
cd /usr/src/app

# Run the node app if we need to register with the master instance
[ "$PULLUP_MASTER" ] && PULLUP_IDLE_EXIT=1 node index.js

# Wait in a low-memory loop until there is necessary activity
nc -lk -s 0.0.0.0 -p 1995 -e ./incoming.sh