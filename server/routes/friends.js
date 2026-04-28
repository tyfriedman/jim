const express = require("express");
const { withConnection, oracledb } = require("../db/connection");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/search", async (req, res, next) => {
  const username = String(req.query.username || "").trim().toLowerCase();
  if (!username) {
    return res.json([]);
  }

  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `SELECT
           u.user_id,
           u.username,
           u.profile_pic,
           f.status AS friendship_status
         FROM USERS u
         LEFT JOIN FRIENDSHIP f
           ON (
             (f.user_id_1 = :userId AND f.user_id_2 = u.user_id)
             OR (f.user_id_2 = :userId AND f.user_id_1 = u.user_id)
           )
         WHERE u.user_id <> :userId
           AND LOWER(u.username) LIKE :usernamePattern
           AND (f.status IS NULL OR f.status <> 'accepted')
         ORDER BY u.username ASC
         FETCH FIRST 20 ROWS ONLY`,
        {
          userId: req.user.userId,
          usernamePattern: `${username}%`
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    return res.json(
      result.rows.map((row) => ({
        user_id: row.USER_ID,
        username: row.USERNAME,
        profile_pic: row.PROFILE_PIC,
        friendship_status: row.FRIENDSHIP_STATUS || null
      }))
    );
  } catch (error) {
    return next(error);
  }
});

router.get("/requests", async (req, res, next) => {
  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `SELECT
           f.user_id_1,
           f.user_id_2,
           f.created_at,
           u.user_id,
           u.username,
           u.profile_pic
         FROM FRIENDSHIP f
         JOIN USERS u
           ON u.user_id = CASE WHEN f.user_id_1 = :userId THEN f.user_id_2 ELSE f.user_id_1 END
         WHERE (f.user_id_1 = :userId OR f.user_id_2 = :userId)
           AND f.status = 'pending'
         ORDER BY f.created_at DESC`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const incoming = [];
    const outgoing = [];

    for (const row of result.rows) {
      const request = {
        user_id: row.USER_ID,
        username: row.USERNAME,
        profile_pic: row.PROFILE_PIC,
        created_at: row.CREATED_AT
      };
      if (row.USER_ID_2 === req.user.userId) {
        incoming.push(request);
      } else {
        outgoing.push(request);
      }
    }

    return res.json({ incoming, outgoing });
  } catch (error) {
    return next(error);
  }
});

router.post("/request", async (req, res, next) => {
  const targetUserId = Number(req.body.user_id);
  if (!Number.isFinite(targetUserId)) {
    return res.status(400).json({ error: "user_id is required." });
  }
  if (targetUserId === req.user.userId) {
    return res.status(400).json({ error: "Cannot friend yourself." });
  }

  try {
    await withConnection((connection) =>
      connection.execute(
        `MERGE INTO FRIENDSHIP f
         USING (SELECT :sender AS user_id_1, :recipient AS user_id_2 FROM dual) src
         ON (
           (f.user_id_1 = src.user_id_1 AND f.user_id_2 = src.user_id_2)
           OR (f.user_id_1 = src.user_id_2 AND f.user_id_2 = src.user_id_1)
         )
         WHEN MATCHED THEN UPDATE SET
           f.user_id_1 = src.user_id_1,
           f.user_id_2 = src.user_id_2,
           f.status = 'pending',
           f.created_at = current_timestamp
         WHEN NOT MATCHED THEN
           INSERT (user_id_1, user_id_2, status) VALUES (:sender, :recipient, 'pending')`,
        { sender: req.user.userId, recipient: targetUserId },
        { autoCommit: true }
      )
    );

    return res.status(201).json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id/request", async (req, res, next) => {
  const otherUserId = Number(req.params.id);
  if (!Number.isFinite(otherUserId)) {
    return res.status(400).json({ error: "Invalid user id." });
  }
  if (otherUserId === req.user.userId) {
    return res.status(400).json({ error: "Cannot friend yourself." });
  }

  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `DELETE FROM FRIENDSHIP
         WHERE user_id_1 = :userId
           AND user_id_2 = :otherUserId
           AND status = 'pending'
        `,
        { userId: req.user.userId, otherUserId },
        { autoCommit: true }
      )
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: "Outgoing friend request not found." });
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  const otherUserId = Number(req.params.id);

  if (!Number.isFinite(otherUserId)) {
    return res.status(400).json({ error: "Invalid user id." });
  }
  if (otherUserId === req.user.userId) {
    return res.status(400).json({ error: "Cannot friend yourself." });
  }

  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `DELETE FROM FRIENDSHIP
         WHERE (
             (user_id_1 = :userId AND user_id_2 = :otherUserId)
             OR (user_id_1 = :otherUserId AND user_id_2 = :userId)
           )
           AND status = 'accepted'`,
        { userId: req.user.userId, otherUserId },
        { autoCommit: true }
      )
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: "Friendship not found." });
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/accept", async (req, res, next) => {
  const otherUserId = Number(req.params.id);
  if (!Number.isFinite(otherUserId)) {
    return res.status(400).json({ error: "Invalid user id." });
  }
  if (otherUserId === req.user.userId) {
    return res.status(400).json({ error: "Cannot friend yourself." });
  }

  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `UPDATE FRIENDSHIP
         SET status = 'accepted'
         WHERE user_id_1 = :otherUserId
           AND user_id_2 = :userId
           AND status = 'pending'`,
        { userId: req.user.userId, otherUserId },
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
  if (otherUserId === req.user.userId) {
    return res.status(400).json({ error: "Cannot friend yourself." });
  }

  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `UPDATE FRIENDSHIP
         SET status = 'declined'
         WHERE user_id_1 = :otherUserId
           AND user_id_2 = :userId
           AND status = 'pending'`,
        { userId: req.user.userId, otherUserId },
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
