#!/bin/sh
cd /usr/src/app
nc -lk -s 0.0.0.0 -p 1995 -e ./incoming.sh