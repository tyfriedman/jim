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

sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_users.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_exercise_category.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_exercise.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_workout_log.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_workout_entry.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_goal.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_avatar.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_avatar_item.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_avatar_inventory.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_challenge.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_challenge_participant.sql
sqlplus "${ORACLE_CONNECTION_STRING}" @create/crt_friendship.sql
