# Database Setup (Oracle)

This project uses Oracle and SQL*Plus scripts to create all tables.

## Prerequisites

- Oracle client tools installed (`sqlplus` available in your PATH)
- Network access to your Oracle instance
- `server/.env` configured with a valid `ORACLE_CONNECTION_STRING`

## Configure Connection

Set the connection string in `server/.env`:

`ORACLE_CONNECTION_STRING=username/password@host:port/service_name`

Example:

`ORACLE_CONNECTION_STRING=guest/guest@54.173.197.171:1521/xepdb1`

## Create the Database Tables

From the repository root:

`./build.sh`

This will run the scripts in `create/` in dependency-safe order and create:

- `USERS`
- `EXERCISE_CATEGORY`
- `EXERCISE`
- `WORKOUT_LOG`
- `WORKOUT_ENTRY`
- `GOAL`
- `AVATAR`
- `AVATAR_ITEM`
- `AVATAR_INVENTORY`
- `CHALLENGE`
- `CHALLENGE_PARTICIPANT`
- `FRIENDSHIP`

## Notes

- Scripts use `drop table ... cascade constraints;` before each `create table`.
- Running `./build.sh` resets these tables each time.
- No CSV loading is included in this setup.
