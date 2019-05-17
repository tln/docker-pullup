#!/bin/sh
cd /usr/src/app

# Just run node app directly if pubsub set
if [ "$PULLUP_PUBSUB" ]; then
    export PULLUP_PORT=1995
    exec node index.js
fi

# Run the node app if we need to register with the master instance
if [ "$PULLUP_MASTER" ]; then 
    PULLUP_IDLE_EXIT=1 node index.js
fi

# Wait in a low-memory loop until there is necessary activity
busybox nc -ll -p 1995 0.0.0.0 -e ./incoming.sh