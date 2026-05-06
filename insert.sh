#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="."
ENV_FILE="${ROOT_DIR}/server/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

if [[ -z "${ORACLE_CONNECTION_STRING:-}" ]]; then
  echo "ORACLE_CONNECTION_STRING is not set in ${ENV_FILE}" >&2
  exit 1
fi

# sqlplus "${ORACLE_CONNECTION_STRING}" @create/ins_exercises.sql
# sqlplus "$ORACLE_CONNECTION_STRING" @create/upd_avatar_item_xp_required.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/add_coins.sql