const express = require("express");
const { withConnection, oracledb } = require("../db/connection");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function toYmdLocal(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysYmd(ymd, deltaDays) {
  const [year, month, day] = ymd.split("-").map((part) => Number(part));
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + deltaDays);
  return toYmdLocal(d);
}

function todayYmdLocal() {
  return toYmdLocal(new Date());
}

async function areUsersFriends(connection, userIdA, userIdB) {
  const friendshipRes = await connection.execute(
    `SELECT 1
     FROM FRIENDSHIP
     WHERE status = 'accepted'
       AND ((user_id_1 = :userA AND user_id_2 = :userB)
         OR (user_id_1 = :userB AND user_id_2 = :userA))`,
    { userA: userIdA, userB: userIdB },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return friendshipRes.rows.length > 0;
}

async function computeStreakForUser(connection, userId) {
  const daysRes = await connection.execute(
    `SELECT DISTINCT TRUNC(log_date) AS day
     FROM WORKOUT_LOG
     WHERE user_id = :userId
     ORDER BY day DESC`,
    { userId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const daySet = new Set(
    (daysRes.rows || [])
      .map((row) => row.DAY)
      .filter(Boolean)
      .map((value) => toYmdLocal(value))
  );

  const today = todayYmdLocal();
  const start = daySet.has(today) ? today : addDaysYmd(today, -1);
  if (!daySet.has(start)) {
    return { streak: 0, last_day: null };
  }

  let streak = 0;
  let cursor = start;
  while (daySet.has(cursor)) {
    streak += 1;
    cursor = addDaysYmd(cursor, -1);
  }
  return { streak, last_day: start };
}

router.get("/streak", async (req, res, next) => {
  try {
    const result = await withConnection((connection) =>
      computeStreakForUser(connection, req.user.userId)
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/streak/:userId", async (req, res, next) => {
  const targetUserId = Number(req.params.userId);
  if (!Number.isFinite(targetUserId)) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  try {
    const result = await withConnection(async (connection) => {
      if (targetUserId !== req.user.userId) {
        const canView = await areUsersFriends(connection, req.user.userId, targetUserId);
        if (!canView) {
          return null;
        }
      }
      return computeStreakForUser(connection, targetUserId);
    });

    if (!result) {
      return res.status(403).json({ error: "Not allowed." });
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const logsResult = await withConnection((connection) =>
      connection.execute(
        `SELECT log_id, log_date, is_private, title, description, hype_count, comment_count, notes, created_at
         FROM WORKOUT_LOG
         WHERE user_id = :userId
         ORDER BY log_date DESC, log_id DESC`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const entriesResult = await withConnection((connection) =>
      connection.execute(
        `SELECT e.entry_id, e.log_id, e.exercise_id, ex.name AS exercise_name, e.value, e.sets, e.notes
         FROM WORKOUT_ENTRY e
         JOIN WORKOUT_LOG l ON l.log_id = e.log_id
         JOIN EXERCISE ex ON ex.exercise_id = e.exercise_id
         WHERE l.user_id = :userId
         ORDER BY e.entry_id`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const byLog = new Map();
    for (const row of entriesResult.rows) {
      const logId = row.LOG_ID;
      if (!byLog.has(logId)) {
        byLog.set(logId, []);
      }
      byLog.get(logId).push({
        entry_id: row.ENTRY_ID,
        exercise_id: row.EXERCISE_ID,
        exercise_name: row.EXERCISE_NAME,
        value: row.VALUE,
        sets: row.SETS,
        notes: row.NOTES
      });
    }

    return res.json(
      logsResult.rows.map((row) => ({
        log_id: row.LOG_ID,
        log_date: row.LOG_DATE,
        is_private: row.IS_PRIVATE,
        title: row.TITLE,
        description: row.DESCRIPTION,
        hype_count: row.HYPE_COUNT ?? 0,
        comment_count: row.COMMENT_COUNT ?? 0,
        notes: row.NOTES,
        created_at: row.CREATED_AT,
        entries: byLog.get(row.LOG_ID) || []
      }))
    );
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const { log_date, is_private = 0, title, description = null, notes = null, entries = [] } = req.body;
  if (!log_date) {
    return res.status(400).json({ error: "log_date is required." });
  }
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title is required." });
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "entries must be a non-empty array." });
  }

  try {
    const created = await withConnection(async (connection) => {
      try {
        const logInsert = await connection.execute(
          `INSERT INTO WORKOUT_LOG (user_id, log_date, is_private, title, description, hype_count, comment_count, notes)
           VALUES (:userId, TO_DATE(:logDate, 'YYYY-MM-DD'), :isPrivate, :title, :description, 0, 0, :notes)
           RETURNING log_id INTO :logId`,
          {
            userId: req.user.userId,
            logDate: log_date,
            isPrivate: is_private,
            title,
            description,
            notes,
            logId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
          }
        );

        const logId = logInsert.outBinds.logId[0];

        for (const entry of entries) {
          await connection.execute(
            `INSERT INTO WORKOUT_ENTRY (log_id, exercise_id, value, sets, notes)
             VALUES (:logId, :exerciseId, :value, :sets, :notes)`,
            {
              logId,
              exerciseId: entry.exercise_id,
              value: entry.value ?? null,
              sets: entry.sets ?? null,
              notes: entry.notes ?? null
            }
          );
        }

        const xpGain = entries.length * 10;
        const coinGain = entries.length * 2;
        await connection.execute(
          `UPDATE AVATAR
           SET avatar_level = avatar_level + FLOOR((xp + :xpGain) / 50),
               xp           = MOD(xp + :xpGain, 50)
           WHERE user_id = :userId`,
          { xpGain, userId: req.user.userId }
        );
        await connection.execute(
          "UPDATE USERS SET coins = coins + :coinGain WHERE user_id = :userId",
          { coinGain, userId: req.user.userId }
        );

        await connection.commit();
        return { logId, xpGain };
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    return res
      .status(201)
      .json({ log_id: created.logId, xp_awarded: created.xpGain });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/comments", async (req, res, next) => {
  const logId = Number(req.params.id);
  if (!Number.isFinite(logId)) {
    return res.status(400).json({ error: "Invalid log id." });
  }

  try {
    const ownership = await withConnection((connection) =>
      connection.execute(
        `SELECT is_private
         FROM WORKOUT_LOG
         WHERE log_id = :logId
           AND user_id = :userId`,
        { logId, userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    if (!ownership.rows.length) {
      return res.status(404).json({ error: "Workout log not found." });
    }
    if (ownership.rows[0].IS_PRIVATE === 1) {
      return res.json({ comments: [] });
    }

    const comments = await withConnection((connection) =>
      connection.execute(
        `SELECT fc.comment_id, fc.user_id, u.username, u.profile_pic, fc.comment_text, fc.created_at
         FROM FEED_COMMENT fc
         JOIN USERS u ON u.user_id = fc.user_id
         WHERE fc.log_id = :logId
         ORDER BY fc.created_at ASC`,
        { logId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    return res.json({
      comments: comments.rows.map((row) => ({
        comment_id: row.COMMENT_ID,
        user: {
          user_id: row.USER_ID,
          username: row.USERNAME,
          profile_pic: row.PROFILE_PIC
        },
        comment: row.COMMENT_TEXT,
        created_at: row.CREATED_AT
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  const logId = Number(req.params.id);
  const { log_date, is_private, title, description, notes, entries } = req.body;

  if (!Number.isFinite(logId)) {
    return res.status(400).json({ error: "Invalid log id." });
  }
  try {
    const updated = await withConnection(async (connection) => {
      try {
        const ownership = await connection.execute(
          "SELECT log_id FROM WORKOUT_LOG WHERE log_id = :logId AND user_id = :userId",
          { logId, userId: req.user.userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (!ownership.rows.length) {
          await connection.rollback();
          return false;
        }

        await connection.execute(
          `UPDATE WORKOUT_LOG
           SET log_date = COALESCE(TO_DATE(:logDate, 'YYYY-MM-DD'), log_date),
               is_private = COALESCE(:isPrivate, is_private),
               title = COALESCE(:title, title),
               description = COALESCE(:description, description),
               notes = COALESCE(:notes, notes)
           WHERE log_id = :logId`,
          {
            logDate: log_date ?? null,
            isPrivate: is_private ?? null,
            title: title ?? null,
            description: description ?? null,
            notes: notes ?? null,
            logId
          }
        );

        if (Array.isArray(entries)) {
          await connection.execute("DELETE FROM WORKOUT_ENTRY WHERE log_id = :logId", { logId });
          for (const entry of entries) {
            await connection.execute(
              `INSERT INTO WORKOUT_ENTRY (log_id, exercise_id, value, sets, notes)
               VALUES (:logId, :exerciseId, :value, :sets, :notes)`,
              {
                logId,
                exerciseId: entry.exercise_id,
                value: entry.value ?? null,
                sets: entry.sets ?? null,
                notes: entry.notes ?? null
              }
            );
          }
        }

        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    if (!updated) {
      return res.status(404).json({ error: "Workout log not found." });
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  const logId = Number(req.params.id);
  if (!Number.isFinite(logId)) {
    return res.status(400).json({ error: "Invalid log id." });
  }

  try {
    const deleted = await withConnection(async (connection) => {
      try {
        const owned = await connection.execute(
          "SELECT log_id FROM WORKOUT_LOG WHERE log_id = :logId AND user_id = :userId",
          { logId, userId: req.user.userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (!owned.rows.length) {
          await connection.rollback();
          return false;
        }

        await connection.execute("DELETE FROM WORKOUT_ENTRY WHERE log_id = :logId", { logId });
        await connection.execute("DELETE FROM WORKOUT_LOG WHERE log_id = :logId", { logId });
        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    if (!deleted) {
      return res.status(404).json({ error: "Workout log not found." });
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
