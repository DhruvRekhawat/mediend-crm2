#!/bin/sh
set -e
# Run pending migrations before starting the app
node ./node_modules/prisma/build/index.js migrate deploy
exec node server.js
