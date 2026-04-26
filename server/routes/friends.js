const express = require("express");
const { withConnection, oracledb } = require("../db/connection");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function normalizePair(a, b) {
  return a < b ? [a, b] : [b, a];
}

router.post("/request", async (req, res, next) => {
  const targetUserId = Number(req.body.user_id);
  if (!Number.isFinite(targetUserId)) {
    return res.status(400).json({ error: "user_id is required." });
  }
  if (targetUserId === req.user.userId) {
    return res.status(400).json({ error: "Cannot friend yourself." });
  }

  const [user1, user2] = normalizePair(req.user.userId, targetUserId);

  try {
    await withConnection((connection) =>
      connection.execute(
        `MERGE INTO FRIENDSHIP f
         USING (SELECT :user1 AS user_id_1, :user2 AS user_id_2 FROM dual) src
         ON (f.user_id_1 = src.user_id_1 AND f.user_id_2 = src.user_id_2)
         WHEN MATCHED THEN UPDATE SET status = 'pending'
         WHEN NOT MATCHED THEN
           INSERT (user_id_1, user_id_2, status) VALUES (:user1, :user2, 'pending')`,
        { user1, user2 },
        { autoCommit: true }
      )
    );

    return res.status(201).json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/accept", async (req, res, next) => {
  const otherUserId = Number(req.params.id);
  if (!Number.isFinite(otherUserId)) {
    return res.status(400).json({ error: "Invalid user id." });
  }
  const [user1, user2] = normalizePair(req.user.userId, otherUserId);

  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `UPDATE FRIENDSHIP
         SET status = 'accepted'
         WHERE user_id_1 = :user1 AND user_id_2 = :user2 AND status = 'pending'`,
        { user1, user2 },
        { autoCommit: true }
      )
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: "Pending friend request not found." });
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/decline", async (req, res, next) => {
  const otherUserId = Number(req.params.id);
  if (!Number.isFinite(otherUserId)) {
    return res.status(400).json({ error: "Invalid user id." });
  }
  const [user1, user2] = normalizePair(req.user.userId, otherUserId);

  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `UPDATE FRIENDSHIP
         SET status = 'declined'
         WHERE user_id_1 = :user1 AND user_id_2 = :user2 AND status = 'pending'`,
        { user1, user2 },
        { autoCommit: true }
      )
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: "Pending friend request not found." });
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `SELECT
           CASE WHEN f.user_id_1 = :userId THEN f.user_id_2 ELSE f.user_id_1 END AS friend_id,
           u.username,
           u.profile_pic,
           f.created_at
         FROM FRIENDSHIP f
         JOIN USERS u
           ON u.user_id = CASE WHEN f.user_id_1 = :userId THEN f.user_id_2 ELSE f.user_id_1 END
         WHERE (f.user_id_1 = :userId OR f.user_id_2 = :userId)
           AND f.status = 'accepted'
         ORDER BY f.created_at DESC`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    return res.json(
      result.rows.map((row) => ({
        user_id: row.FRIEND_ID,
        username: row.USERNAME,
        profile_pic: row.PROFILE_PIC,
        friends_since: row.CREATED_AT
      }))
    );
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
