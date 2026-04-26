const express = require("express");
const { withConnection, oracledb } = require("../db/connection");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

async function canAccessLogForFeed(userId, logId) {
  const result = await withConnection((connection) =>
    connection.execute(
      `SELECT 1
       FROM WORKOUT_LOG wl
       WHERE wl.log_id = :logId
         AND (
           wl.user_id = :userId
           OR (
             wl.is_private = 0
             AND EXISTS (
               SELECT 1
               FROM FRIENDSHIP f
               WHERE f.status = 'accepted'
                 AND (
                   (f.user_id_1 = :userId AND f.user_id_2 = wl.user_id)
                   OR (f.user_id_2 = :userId AND f.user_id_1 = wl.user_id)
                 )
             )
           )
         )`,
      { userId, logId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )
  );

  return result.rows.length > 0;
}

router.get("/", async (req, res, next) => {
  try {
    const logs = await withConnection((connection) =>
      connection.execute(
        `SELECT wl.log_id, wl.user_id, wl.log_date, wl.notes, wl.created_at, u.username, u.profile_pic
         FROM WORKOUT_LOG wl
         JOIN USERS u ON u.user_id = wl.user_id
         WHERE wl.is_private = 0
           AND wl.user_id IN (
             SELECT CASE WHEN f.user_id_1 = :userId THEN f.user_id_2 ELSE f.user_id_1 END
             FROM FRIENDSHIP f
             WHERE (f.user_id_1 = :userId OR f.user_id_2 = :userId)
               AND f.status = 'accepted'
           )
         ORDER BY wl.log_date DESC, wl.created_at DESC`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const entries = await withConnection((connection) =>
      connection.execute(
        `SELECT we.entry_id, we.log_id, we.exercise_id, ex.name AS exercise_name, we.value, we.sets, we.notes
         FROM WORKOUT_ENTRY we
         JOIN WORKOUT_LOG wl ON wl.log_id = we.log_id
         JOIN EXERCISE ex ON ex.exercise_id = we.exercise_id
         WHERE wl.is_private = 0
           AND wl.user_id IN (
             SELECT CASE WHEN f.user_id_1 = :userId THEN f.user_id_2 ELSE f.user_id_1 END
             FROM FRIENDSHIP f
             WHERE (f.user_id_1 = :userId OR f.user_id_2 = :userId)
               AND f.status = 'accepted'
           )
         ORDER BY we.entry_id`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const comments = await withConnection((connection) =>
      connection.execute(
        `SELECT fc.comment_id, fc.log_id, fc.user_id, u.username, u.profile_pic, fc.comment_text, fc.created_at
         FROM FEED_COMMENT fc
         JOIN WORKOUT_LOG wl ON wl.log_id = fc.log_id
         JOIN USERS u ON u.user_id = fc.user_id
         WHERE wl.is_private = 0
           AND wl.user_id IN (
             SELECT CASE WHEN f.user_id_1 = :userId THEN f.user_id_2 ELSE f.user_id_1 END
             FROM FRIENDSHIP f
             WHERE (f.user_id_1 = :userId OR f.user_id_2 = :userId)
               AND f.status = 'accepted'
           )
         ORDER BY fc.created_at ASC`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const hypeCounts = await withConnection((connection) =>
      connection.execute(
        `SELECT fh.log_id, COUNT(*) AS hype_count
         FROM FEED_HYPE fh
         JOIN WORKOUT_LOG wl ON wl.log_id = fh.log_id
         WHERE wl.is_private = 0
           AND wl.user_id IN (
             SELECT CASE WHEN f.user_id_1 = :userId THEN f.user_id_2 ELSE f.user_id_1 END
             FROM FRIENDSHIP f
             WHERE (f.user_id_1 = :userId OR f.user_id_2 = :userId)
               AND f.status = 'accepted'
           )
         GROUP BY fh.log_id`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const byLog = new Map();
    for (const row of entries.rows) {
      if (!byLog.has(row.LOG_ID)) {
        byLog.set(row.LOG_ID, []);
      }
      byLog.get(row.LOG_ID).push({
        entry_id: row.ENTRY_ID,
        exercise_id: row.EXERCISE_ID,
        exercise_name: row.EXERCISE_NAME,
        value: row.VALUE,
        sets: row.SETS,
        notes: row.NOTES
      });
    }

    const commentsByLog = new Map();
    for (const row of comments.rows) {
      if (!commentsByLog.has(row.LOG_ID)) {
        commentsByLog.set(row.LOG_ID, []);
      }
      commentsByLog.get(row.LOG_ID).push({
        comment_id: row.COMMENT_ID,
        user: {
          user_id: row.USER_ID,
          username: row.USERNAME,
          profile_pic: row.PROFILE_PIC
        },
        comment: row.COMMENT_TEXT,
        created_at: row.CREATED_AT
      });
    }

    const hypeCountByLog = new Map();
    for (const row of hypeCounts.rows) {
      hypeCountByLog.set(row.LOG_ID, row.HYPE_COUNT);
    }

    return res.json(
      logs.rows.map((row) => ({
        log_id: row.LOG_ID,
        user: {
          user_id: row.USER_ID,
          username: row.USERNAME,
          profile_pic: row.PROFILE_PIC
        },
        log_date: row.LOG_DATE,
        notes: row.NOTES,
        created_at: row.CREATED_AT,
        entries: byLog.get(row.LOG_ID) || [],
        engagement: {
          hype_count: hypeCountByLog.get(row.LOG_ID) || 0,
          comment_count: (commentsByLog.get(row.LOG_ID) || []).length,
          comments: commentsByLog.get(row.LOG_ID) || []
        }
      }))
    );
  } catch (error) {
    return next(error);
  }
});

router.post("/:logId/comment", async (req, res, next) => {
  const logId = Number(req.params.logId);
  const { comment } = req.body;

  if (!Number.isFinite(logId)) {
    return res.status(400).json({ error: "Invalid log id." });
  }
  if (!comment || typeof comment !== "string") {
    return res.status(400).json({ error: "comment is required." });
  }

  try {
    const allowed = await canAccessLogForFeed(req.user.userId, logId);
    if (!allowed) {
      return res.status(403).json({ error: "You cannot comment on this log." });
    }

    const result = await withConnection((connection) =>
      connection.execute(
        `INSERT INTO FEED_COMMENT (log_id, user_id, comment_text)
         VALUES (:logId, :userId, :commentText)
         RETURNING comment_id INTO :commentId`,
        {
          logId,
          userId: req.user.userId,
          commentText: comment,
          commentId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        },
        { autoCommit: true }
      )
    );

    return res.status(201).json({ comment_id: result.outBinds.commentId[0] });
  } catch (error) {
    return next(error);
  }
});

router.post("/:logId/hype", async (req, res, next) => {
  const logId = Number(req.params.logId);
  if (!Number.isFinite(logId)) {
    return res.status(400).json({ error: "Invalid log id." });
  }

  try {
    const allowed = await canAccessLogForFeed(req.user.userId, logId);
    if (!allowed) {
      return res.status(403).json({ error: "You cannot hype this log." });
    }

    await withConnection((connection) =>
      connection.execute(
        `MERGE INTO FEED_HYPE fh
         USING (SELECT :logId AS log_id, :userId AS user_id FROM dual) src
         ON (fh.log_id = src.log_id AND fh.user_id = src.user_id)
         WHEN NOT MATCHED THEN
           INSERT (log_id, user_id) VALUES (:logId, :userId)`,
        { logId, userId: req.user.userId },
        { autoCommit: true }
      )
    );

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
