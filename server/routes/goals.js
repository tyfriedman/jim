const express = require("express");
const { withConnection, oracledb } = require("../db/connection");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `SELECT g.goal_id, g.exercise_id, e.name AS exercise_name, g.title, g.target_value, g.deadline,
                g.is_completed, g.completed_at, g.created_at
         FROM GOAL g
         JOIN EXERCISE e ON e.exercise_id = g.exercise_id
         WHERE g.user_id = :userId
         ORDER BY g.created_at DESC`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    return res.json(
      result.rows.map((row) => ({
        goal_id: row.GOAL_ID,
        exercise_id: row.EXERCISE_ID,
        exercise_name: row.EXERCISE_NAME,
        title: row.TITLE,
        target_value: row.TARGET_VALUE,
        deadline: row.DEADLINE,
        is_completed: row.IS_COMPLETED === 1,
        completed_at: row.COMPLETED_AT,
        created_at: row.CREATED_AT
      }))
    );
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const { exercise_id, title, target_value, deadline } = req.body;
  if (!exercise_id || !title || target_value === undefined) {
    return res.status(400).json({ error: "exercise_id, title and target_value are required." });
  }

  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `INSERT INTO GOAL (user_id, exercise_id, title, target_value, deadline)
         VALUES (:userId, :exerciseId, :title, :targetValue, TO_DATE(:deadline, 'YYYY-MM-DD'))
         RETURNING goal_id INTO :goalId`,
        {
          userId: req.user.userId,
          exerciseId: exercise_id,
          title,
          targetValue: target_value,
          deadline: deadline || null,
          goalId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        },
        { autoCommit: true }
      )
    );

    return res.status(201).json({ goal_id: result.outBinds.goalId[0] });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/progress", async (req, res, next) => {
  const goalId = Number(req.params.id);
  if (!Number.isFinite(goalId)) {
    return res.status(400).json({ error: "Invalid goal id." });
  }

  try {
    const goalResult = await withConnection((connection) =>
      connection.execute(
        `SELECT goal_id, user_id, exercise_id, title, target_value
         FROM GOAL
         WHERE goal_id = :goalId AND user_id = :userId`,
        { goalId, userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const goal = goalResult.rows[0];
    if (!goal) {
      return res.status(404).json({ error: "Goal not found." });
    }

    const progressResult = await withConnection((connection) =>
      connection.execute(
        `SELECT NVL(SUM(we.value), 0) AS current_value
         FROM WORKOUT_ENTRY we
         JOIN WORKOUT_LOG wl ON wl.log_id = we.log_id
         WHERE wl.user_id = :userId
           AND we.exercise_id = :exerciseId`,
        { userId: req.user.userId, exerciseId: goal.EXERCISE_ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const currentValue = progressResult.rows[0].CURRENT_VALUE;
    const targetValue = goal.TARGET_VALUE;
    const percent = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;

    return res.json({
      goal_id: goal.GOAL_ID,
      title: goal.TITLE,
      target_value: targetValue,
      current_value: currentValue,
      progress_percent: Number(percent.toFixed(2))
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/complete", async (req, res, next) => {
  const goalId = Number(req.params.id);
  if (!Number.isFinite(goalId)) {
    return res.status(400).json({ error: "Invalid goal id." });
  }

  try {
    const result = await withConnection(async (connection) => {
      try {
        const updateRes = await connection.execute(
          `UPDATE GOAL
           SET is_completed = 1,
               completed_at = CURRENT_TIMESTAMP
           WHERE goal_id = :goalId
             AND user_id = :userId
             AND is_completed = 0`,
          { goalId, userId: req.user.userId }
        );

        if (updateRes.rowsAffected === 0) {
          await connection.rollback();
          return false;
        }

        await connection.execute(
          "UPDATE USERS SET coins = coins + :coinAward WHERE user_id = :userId",
          { coinAward: 25, userId: req.user.userId }
        );

        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    if (!result) {
      return res.status(404).json({ error: "Goal not found or already completed." });
    }

    return res.json({ success: true, coins_awarded: 25 });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
