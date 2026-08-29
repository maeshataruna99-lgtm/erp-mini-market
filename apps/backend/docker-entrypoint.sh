#!/bin/sh
set -e

echo "Menjalankan migrasi Prisma..."
npm run prisma:deploy

echo "Menjalankan backend..."
exec node dist/main.js
