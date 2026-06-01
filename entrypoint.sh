#!/bin/sh
set -e
node /app/node_modules/prisma/build/index.js migrate deploy --schema=/app/prisma/schema.prisma
exec node /app/server.js
