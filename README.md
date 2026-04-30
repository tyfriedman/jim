# JIM

JIM is a fitness-social application with a React frontend and a Node.js/Express backend backed by Oracle. Users can log workouts, track goals, add friends, interact with a social feed, join challenges, and manage avatar progression with coins and XP.

## Project Overview

- **Frontend (`client/`)**: React app that calls backend API endpoints under `/api/*`.
- **Backend (`server/`)**: Express routes for auth, workouts, feed, friends, goals, challenges, avatars/shop, and achievements.
- **Database (`create/`, `database/`)**: Oracle schema DDL and seed scripts.

The backend uses direct SQL via the Oracle driver (`oracledb`) rather than an ORM. Most business behavior is implemented through explicit query logic and transactions in route handlers.

## Core Domains

- **Identity and profiles**: `USERS`
- **Workout tracking**: `WORKOUT_LOG`, `WORKOUT_ENTRY`
- **Exercise catalog**: `EXERCISE_CATEGORY`, `EXERCISE`
- **Goals**: `GOAL`
- **Social graph and feed**: `FRIENDSHIP`, `FEED_HYPE`, `FEED_COMMENT`
- **Challenges**: `CHALLENGE`, `CHALLENGE_PARTICIPANT`
- **Avatar and economy**: `AVATAR`, `AVATAR_ITEM`, `AVATAR_INVENTORY`

## High-Level API Areas

- `/api/auth`
- `/api/workouts`
- `/api/exercises`
- `/api/goals`
- `/api/friends`
- `/api/feed`
- `/api/challenges`
- `/api/avatar`
- `/api/achievements`

## Repository Structure

- `server/`: Backend API and database connection layer
- `client/`: Frontend application
- `create/`: Oracle `CREATE TABLE` and seed SQL scripts
- `database/`: Database setup notes
- `docs/`: Additional documentation placeholders
- `scripts/`: Utility script placeholders

## Local Environment Files

- Root: `.env.example`
- Server: `server/.env`, `server/.env.example`
- Client: `client/.env`, `client/.env.example`

## Database Setup (Oracle)

From the repository root:

1. Configure Oracle connection in `server/.env`
2. Run `./build.sh` to create/reset tables
3. Run `./insert.sh` to seed exercise data

See `database/README.md` for database-specific setup details.
