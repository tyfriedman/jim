# JIM Technical Scan for Database-Focused Presentation

## Why This Project Is Interesting for a Database Audience

JIM is a fitness-social application with an Oracle-backed API where core business behavior is implemented directly in SQL. The backend does not use an ORM, which makes query patterns, transaction boundaries, and schema constraints visible and reviewable.

Key reasons this codebase is presentation-worthy:

- Oracle-first implementation with route-level SQL (`oracledb` + handwritten queries)
- Strong relational model across workouts, social graph, goals, challenges, and avatar economy
- Heavy use of transactional write paths
- Mix of normalized entities and denormalized counters
- AI-assisted feature (workout generation) constrained by relational data

## Architecture Overview

- **Backend:** `server/` (Node.js + Express)
- **Database access:** `server/db/connection.js` (`oracledb` pool, `withConnection`, explicit commit/rollback)
- **Routes:** `server/routes/*.js` (all SQL lives close to route handlers)
- **Schema scripts:** `create/*.sql` (DDL + seed scripts)
- **Frontend API clients:** `client/src/api/*.js` (token-authenticated calls to `/api/*`)

Request flow:

1. Client calls route under `/api/*`
2. Express route validates input and auth context
3. Route executes Oracle SQL with bound parameters
4. Route maps uppercase Oracle columns to API JSON
5. Route commits/rolls back and returns response

## Database Engine and Connection Strategy

Connection layer: `server/db/connection.js`

- Reads Oracle settings from environment (`ORACLE_CONNECTION_STRING` or host/port/service tuple)
- Creates a small connection pool (`poolMin: 1`, `poolMax: 5`)
- Wraps route work with `withConnection(...)` for per-operation checkout/close
- Uses explicit transaction management for multi-step writes

This design makes transaction control explicit but can lead to repeated connection checkout for endpoints that fan out into multiple reads.

## Schema Deep Dive

## Core Tables

### Identity and User State

- `USERS`
  - PK: `user_id` (identity)
  - Unique: `username`, `email`
  - Fields: password hash, profile data, coin balance, timestamps
  - Constraint: non-negative `coins`

### Avatar and Economy

- `AVATAR`
  - One-to-one with `USERS` (`uq_avatar_user`)
  - Tracks level and XP
- `AVATAR_ITEM`
  - Catalog of purchasable/equippable items
  - Includes `xp_required` and asset URL metadata
- `AVATAR_INVENTORY`
  - Composite PK: `(avatar_id, slot)`
  - Tracks equipped/owned items per avatar slot

### Exercise Catalog

- `EXERCISE_CATEGORY`
  - Unique category names
- `EXERCISE`
  - FK to category
  - Seeded with broad exercise lists from `create/ins_exercises.sql`

### Workout Tracking

- `WORKOUT_LOG`
  - Parent workout row per session
  - Includes privacy flag, title/description, notes, denormalized counters (`hype_count`, `comment_count`)
- `WORKOUT_ENTRY`
  - Child rows (exercise instances) linked to a log and exercise

### Goals

- `GOAL`
  - Goal attached to user + exercise
  - Tracks target, deadline, completion status, completion timestamp

### Social Graph and Feed

- `FRIENDSHIP`
  - Composite PK: `(user_id_1, user_id_2)`
  - Status-driven relationship (`pending`, `accepted`, `declined` in app logic)
- `FEED_HYPE`
  - Composite PK: `(log_id, user_id)` (one hype per user per log)
- `FEED_COMMENT`
  - Identity PK for comments tied to logs/users

### Challenges

- `CHALLENGE`
  - Creator + exercise + target + date window + visibility
  - Date integrity check (`end_date >= start_date`)
- `CHALLENGE_PARTICIPANT`
  - Composite PK: `(challenge_id, user_id)`
  - Includes participant value accumulator and join timestamp

## Constraint Strategy

Observed strengths:

- Extensive FK coverage across domains
- Explicit uniqueness and check constraints for common data integrity rules
- Composite keys where pair uniqueness matters

Observed gaps to discuss:

- No explicit check constraint on `FRIENDSHIP.status` values
- No explicit secondary indexes in DDL scripts (`CREATE INDEX` not present)

## API Routes and Query Behavior

Route registration in `server/index.js` exposes:

- `/api/auth`
- `/api/workouts` (CRUD + AI generation)
- `/api/exercises`
- `/api/goals`
- `/api/friends`
- `/api/feed`
- `/api/challenges`
- `/api/avatar`
- `/api/achievements`

### Auth (`server/routes/auth.js`)

- `POST /register`
  - Inserts `USERS`, then inserts `AVATAR`
  - Wrapped in transaction with rollback on failure
- `POST /login`
  - Reads password hash + updates `last_login`
- `GET /me`, `PUT /profile`
  - Reads/updates profile fields and coin state

### Workouts (`server/routes/workouts.js`)

- `GET /`
  - Reads logs and entries separately, then assembles nested JSON in memory
- `POST /`
  - Inserts `WORKOUT_LOG`
  - Inserts many `WORKOUT_ENTRY` rows
  - Updates `AVATAR` XP/level and `USERS.coins`
  - Single transaction
- `PUT /:id`, `DELETE /:id`
  - Ownership checks then mutation
- `GET /:id/comments`
  - Enforces private/public access before comment fetch

### Workout Generation (`server/routes/workout-generation.js`)

- Reads entire exercise catalog + recent user history from Oracle
- Sends context to OpenAI Responses API
- Parses strict JSON schema output
- Normalizes and validates model output against DB exercises
- Rejects unknown exercise names

This is a good example of relational guardrails around an AI feature.

### Feed (`server/routes/feed.js`)

- `GET /`
  - Pulls friend-visible logs + entries + comments + viewer hype state
  - Uses social visibility logic in SQL
- `POST /:logId/comment`
  - Inserts `FEED_COMMENT`
  - Recomputes `WORKOUT_LOG.comment_count`
  - Awards coins to commenter
- `POST /:logId/hype`, `DELETE /:logId/hype`
  - Uses `MERGE` / `DELETE` on `FEED_HYPE`
  - Recomputes `WORKOUT_LOG.hype_count`

### Friends (`server/routes/friends.js`)

- Search, request workflow, accept/decline/cancel, remove friendship
- Uses bidirectional pair logic in joins and predicates
- Uses `MERGE` to upsert relationship request rows

### Challenges (`server/routes/challenges.js`)

- Create/list/join/invite/log/delete/leaderboard
- Private challenge access controlled by participant membership
- Logging challenge progress creates workout rows and awards XP/coins
- Leaderboard aggregates `WORKOUT_ENTRY.value` within challenge date window

### Goals (`server/routes/goals.js`)

- CRUD-ish flow (`get`, `create`, `progress`, `complete`)
- Progress endpoint aggregates values by user and exercise via join + sum
- Completion awards coins transactionally

### Avatar and Shop (`server/routes/avatar.js`)

- Avatar retrieval joins profile + inventory + item metadata
- Item purchase debits `USERS.coins` and upserts inventory ownership slot
- Equipped avatar state is serialized into `USERS.profile_pic` with a prefix and JSON payload

### Achievements (`server/routes/achievements.js`)

- Computes stats via one statement with many correlated subqueries
- Returns progress against hardcoded achievement definitions
- Claim endpoint awards coins if target reached

Potential discussion item: no persisted claim history table is present, so idempotency protections are limited.

## SQL Patterns Worth Highlighting

Oracle-specific features used in production routes:

- `MERGE INTO ... USING dual` for idempotent upsert-style writes
- `RETURNING ... INTO` for generated IDs
- `NVL`, `TO_DATE`, `FETCH FIRST N ROWS ONLY`
- `CASE` expressions for bidirectional friendship mapping

General quality notes:

- Parameter binding is used consistently (helps SQL injection resistance)
- Transactions are explicit for multi-table writes
- Column mapping from Oracle uppercase fields is handled in API layer

## Operational and Data Lifecycle Notes

- `build.sh` executes all `create/crt_*.sql` scripts in dependency order
- Each DDL script drops and recreates its table (`drop table ... cascade constraints`)
- Running full build resets schema data
- `insert.sh` currently seeds exercise catalog (`create/ins_exercises.sql`)

## Risks, Gaps, and Improvement Opportunities

Best topics to "pick on" in a database presentation:

- No explicit non-PK/FK indexes in schema scripts
- Denormalized counters maintained in application writes rather than DB triggers/materialized strategies
- Multi-query read assembly in some endpoints can increase latency and allow minor read skew
- `FRIENDSHIP.status` values not constrained by DB check constraint
- Achievement claims appear to lack persistent anti-replay state
- Possible docs drift between `database/README.md` and current schema/build scripts

## Suggested Slide Outline

1. System overview and Oracle-first architecture
2. ER-style schema walkthrough by domain
3. Transaction-heavy write paths (workout, feed, challenge)
4. Social visibility and access control in SQL
5. Denormalized counters: why and tradeoffs
6. Aggregation endpoints (leaderboards, progress, achievements)
7. AI + relational guardrails for generated workouts
8. Performance and integrity gap analysis
9. Improvement roadmap (indexing, idempotency, tighter constraints)

## Files Referenced

- `server/db/connection.js`
- `server/index.js`
- `server/routes/*.js`
- `create/*.sql`
- `build.sh`
- `insert.sh`
- `database/README.md`
