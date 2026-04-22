#!/bin/sh
set -a
. ./.env
set +a
exec npx prisma "$@"
