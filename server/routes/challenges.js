const express = require("express");
const { withConnection, oracledb } = require("../db/connection");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

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

router.get("/", async (req, res, next) => {
  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `SELECT c.challenge_id, c.creator_id, u.username AS creator_username,
                c.exercise_id, e.name AS exercise_name, c.title, c.description,
                c.target_value, c.start_date, c.end_date, c.is_public, c.created_at,
                CASE WHEN cp.user_id IS NULL THEN 0 ELSE 1 END AS joined
         FROM CHALLENGE c
         JOIN EXERCISE e ON e.exercise_id = c.exercise_id
         JOIN USERS u ON u.user_id = c.creator_id
         LEFT JOIN CHALLENGE_PARTICIPANT cp
           ON cp.challenge_id = c.challenge_id AND cp.user_id = :userId
         WHERE c.is_public = 1 OR cp.user_id = :userId
         ORDER BY c.created_at DESC`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    return res.json(
      result.rows.map((row) => ({
        challenge_id: row.CHALLENGE_ID,
        creator_id: row.CREATOR_ID,
        creator_username: row.CREATOR_USERNAME,
        exercise_id: row.EXERCISE_ID,
        exercise_name: row.EXERCISE_NAME,
        title: row.TITLE,
        description: row.DESCRIPTION,
        target_value: row.TARGET_VALUE,
        start_date: row.START_DATE,
        end_date: row.END_DATE,
        is_public: row.IS_PUBLIC,
        created_at: row.CREATED_AT,
        joined: row.JOINED === 1
      }))
    );
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const {
    exercise_id,
    title,
    description,
    target_value,
    start_date,
    end_date,
    is_public = 1,
    invited_user_ids = []
  } = req.body;
  if (!exercise_id || !title || target_value === undefined || !start_date || !end_date) {
    return res.status(400).json({ error: "exercise_id, title, target_value, start_date and end_date are required." });
  }
  const invitedIds = Array.isArray(invited_user_ids)
    ? [...new Set(invited_user_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value)))]
    : [];

  try {
    const challengeId = await withConnection(async (connection) => {
      try {
        const result = await connection.execute(
          `INSERT INTO CHALLENGE (creator_id, exercise_id, title, description, target_value, start_date, end_date, is_public)
           VALUES (:creatorId, :exerciseId, :title, :description, :targetValue,
                   TO_DATE(:startDate, 'YYYY-MM-DD'), TO_DATE(:endDate, 'YYYY-MM-DD'), :isPublic)
           RETURNING challenge_id INTO :challengeId`,
          {
            creatorId: req.user.userId,
            exerciseId: exercise_id,
            title,
            description: description ?? null,
            targetValue: target_value,
            startDate: start_date,
            endDate: end_date,
            isPublic: is_public,
            challengeId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
          }
        );
        const newChallengeId = result.outBinds.challengeId[0];

        await connection.execute(
          `MERGE INTO CHALLENGE_PARTICIPANT cp
           USING (SELECT :challengeId AS challenge_id, :userId AS user_id FROM dual) src
           ON (cp.challenge_id = src.challenge_id AND cp.user_id = src.user_id)
           WHEN NOT MATCHED THEN
             INSERT (challenge_id, user_id, current_value) VALUES (:challengeId, :userId, 0)`,
          { challengeId: newChallengeId, userId: req.user.userId }
        );

        for (const invitedUserId of invitedIds) {
          if (invitedUserId === req.user.userId) {
            continue;
          }
          const canInvite = await areUsersFriends(connection, req.user.userId, invitedUserId);
          if (!canInvite) {
            continue;
          }
          await connection.execute(
            `MERGE INTO CHALLENGE_PARTICIPANT cp
             USING (SELECT :challengeId AS challenge_id, :userId AS user_id FROM dual) src
             ON (cp.challenge_id = src.challenge_id AND cp.user_id = src.user_id)
             WHEN NOT MATCHED THEN
               INSERT (challenge_id, user_id, current_value) VALUES (:challengeId, :userId, 0)`,
            { challengeId: newChallengeId, userId: invitedUserId }
          );
        }

        await connection.commit();
        return newChallengeId;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    return res.status(201).json({ challenge_id: challengeId });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/join", async (req, res, next) => {
  const challengeId = Number(req.params.id);
  if (!Number.isFinite(challengeId)) {
    return res.status(400).json({ error: "Invalid challenge id." });
  }

  try {
    await withConnection(async (connection) => {
      try {
        const challengeRes = await connection.execute(
          `SELECT challenge_id, is_public
           FROM CHALLENGE
           WHERE challenge_id = :challengeId`,
          { challengeId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const challenge = challengeRes.rows[0];
        if (!challenge) {
          throw Object.assign(new Error("Challenge not found."), { statusCode: 404 });
        }

        const participantRes = await connection.execute(
          `SELECT 1
           FROM CHALLENGE_PARTICIPANT
           WHERE challenge_id = :challengeId
             AND user_id = :userId`,
          { challengeId, userId: req.user.userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const alreadyHasAccess = participantRes.rows.length > 0;

        if (Number(challenge.IS_PUBLIC) !== 1 && !alreadyHasAccess) {
          throw Object.assign(new Error("This private challenge requires an invitation."), { statusCode: 403 });
        }

        await connection.execute(
          `MERGE INTO CHALLENGE_PARTICIPANT cp
           USING (SELECT :challengeId AS challenge_id, :userId AS user_id FROM dual) src
           ON (cp.challenge_id = src.challenge_id AND cp.user_id = src.user_id)
           WHEN NOT MATCHED THEN
             INSERT (challenge_id, user_id, current_value) VALUES (:challengeId, :userId, 0)`,
          { challengeId, userId: req.user.userId }
        );
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    return res.json({ success: true });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
});

router.post("/:id/invite", async (req, res, next) => {
  const challengeId = Number(req.params.id);
  const invitedUserId = Number(req.body.user_id);
  if (!Number.isFinite(challengeId) || !Number.isFinite(invitedUserId)) {
    return res.status(400).json({ error: "Valid challenge id and user_id are required." });
  }
  if (invitedUserId === req.user.userId) {
    return res.status(400).json({ error: "Cannot invite yourself." });
  }

  try {
    await withConnection(async (connection) => {
      try {
        const challengeRes = await connection.execute(
          `SELECT challenge_id, creator_id, is_public
           FROM CHALLENGE
           WHERE challenge_id = :challengeId`,
          { challengeId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const challenge = challengeRes.rows[0];
        if (!challenge) {
          throw Object.assign(new Error("Challenge not found."), { statusCode: 404 });
        }
        if (Number(challenge.CREATOR_ID) !== req.user.userId) {
          throw Object.assign(new Error("Only the challenge creator can send invites."), { statusCode: 403 });
        }
        if (Number(challenge.IS_PUBLIC) === 1) {
          throw Object.assign(new Error("Invites are only required for private challenges."), { statusCode: 400 });
        }

        const canInvite = await areUsersFriends(connection, req.user.userId, invitedUserId);
        if (!canInvite) {
          throw Object.assign(new Error("You can only invite accepted friends."), { statusCode: 403 });
        }

        await connection.execute(
          `MERGE INTO CHALLENGE_PARTICIPANT cp
           USING (SELECT :challengeId AS challenge_id, :userId AS user_id FROM dual) src
           ON (cp.challenge_id = src.challenge_id AND cp.user_id = src.user_id)
           WHEN NOT MATCHED THEN
             INSERT (challenge_id, user_id, current_value) VALUES (:challengeId, :userId, 0)`,
          { challengeId, userId: invitedUserId }
        );
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    return res.json({ success: true });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
});

router.post("/:id/log", async (req, res, next) => {
  const challengeId = Number(req.params.id);
  const value = Number(req.body.value);
  if (!Number.isFinite(challengeId)) {
    return res.status(400).json({ error: "Invalid challenge id." });
  }
  if (!Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ error: "value must be a positive number." });
  }

  try {
    await withConnection(async (connection) => {
      try {
        const challengeRes = await connection.execute(
          `SELECT c.challenge_id, c.exercise_id, c.title
           FROM CHALLENGE c
           WHERE c.challenge_id = :challengeId`,
          { challengeId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const challenge = challengeRes.rows[0];
        if (!challenge) {
          throw Object.assign(new Error("Challenge not found."), { statusCode: 404 });
        }

        const participantRes = await connection.execute(
          `SELECT 1 FROM CHALLENGE_PARTICIPANT
           WHERE challenge_id = :challengeId AND user_id = :userId`,
          { challengeId, userId: req.user.userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (participantRes.rows.length === 0) {
          throw Object.assign(new Error("You must join this challenge before logging entries."), { statusCode: 403 });
        }

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

        const logInsert = await connection.execute(
          `INSERT INTO WORKOUT_LOG (user_id, log_date, is_private, title, description, hype_count, comment_count, notes)
           VALUES (:userId, TO_DATE(:logDate, 'YYYY-MM-DD'), 0, :title, NULL, 0, 0, NULL)
           RETURNING log_id INTO :logId`,
          {
            userId: req.user.userId,
            logDate: today,
            title: `Challenge: ${challenge.TITLE}`,
            logId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
          }
        );
        const logId = logInsert.outBinds.logId[0];

        await connection.execute(
          `INSERT INTO WORKOUT_ENTRY (log_id, exercise_id, value, sets, notes)
           VALUES (:logId, :exerciseId, :value, NULL, NULL)`,
          { logId, exerciseId: challenge.EXERCISE_ID, value }
        );

        await connection.execute(
          `UPDATE AVATAR
           SET avatar_level = avatar_level + FLOOR((xp + 10) / 50),
               xp = MOD(xp + 10, 50)
           WHERE user_id = :userId`,
          { userId: req.user.userId }
        );
        await connection.execute(
          "UPDATE USERS SET coins = coins + 2 WHERE user_id = :userId",
          { userId: req.user.userId }
        );

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    return res.json({ success: true });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  const challengeId = Number(req.params.id);
  if (!Number.isFinite(challengeId)) {
    return res.status(400).json({ error: "Invalid challenge id." });
  }

  try {
    await withConnection(async (connection) => {
      try {
        const challengeRes = await connection.execute(
          `SELECT challenge_id, creator_id
           FROM CHALLENGE
           WHERE challenge_id = :challengeId`,
          { challengeId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const challenge = challengeRes.rows[0];
        if (!challenge) {
          throw Object.assign(new Error("Challenge not found."), { statusCode: 404 });
        }
        if (Number(challenge.CREATOR_ID) !== Number(req.user.userId)) {
          throw Object.assign(new Error("Only the challenge creator can delete this challenge."), {
            statusCode: 403
          });
        }

        await connection.execute(
          `DELETE FROM CHALLENGE_PARTICIPANT
           WHERE challenge_id = :challengeId`,
          { challengeId }
        );

        await connection.execute(
          `DELETE FROM CHALLENGE
           WHERE challenge_id = :challengeId`,
          { challengeId }
        );

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    return res.json({ success: true });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
});

router.get("/:id/leaderboard", async (req, res, next) => {
  const challengeId = Number(req.params.id);
  if (!Number.isFinite(challengeId)) {
    return res.status(400).json({ error: "Invalid challenge id." });
  }

  try {
    const challengeRes = await withConnection((connection) =>
      connection.execute(
        `SELECT challenge_id, exercise_id, start_date, end_date
         FROM CHALLENGE
         WHERE challenge_id = :challengeId`,
        { challengeId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const challenge = challengeRes.rows[0];
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found." });
    }

    const leaderboardRes = await withConnection((connection) =>
      connection.execute(
        `SELECT cp.user_id, u.username, NVL(SUM(we.value), 0) AS total_value
         FROM CHALLENGE_PARTICIPANT cp
         JOIN USERS u ON u.user_id = cp.user_id
         LEFT JOIN WORKOUT_LOG wl
           ON wl.user_id = cp.user_id
          AND wl.log_date BETWEEN :startDate AND :endDate
         LEFT JOIN WORKOUT_ENTRY we
           ON we.log_id = wl.log_id
          AND we.exercise_id = :exerciseId
         WHERE cp.challenge_id = :challengeId
         GROUP BY cp.user_id, u.username
         ORDER BY total_value DESC, cp.user_id`,
        {
          challengeId,
          exerciseId: challenge.EXERCISE_ID,
          startDate: challenge.START_DATE,
          endDate: challenge.END_DATE
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    return res.json(
      leaderboardRes.rows.map((row, index) => ({
        rank: index + 1,
        user_id: row.USER_ID,
        username: row.USERNAME,
        total_value: row.TOTAL_VALUE
      }))
    );
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
