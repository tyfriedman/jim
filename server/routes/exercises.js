const express = require("express");
const { withConnection, oracledb } = require("../db/connection");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `SELECT e.exercise_id, e.name, e.description, c.category_id, c.name AS category_name
         FROM EXERCISE e
         JOIN EXERCISE_CATEGORY c ON c.category_id = e.category_id
         ORDER BY c.name, e.name`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    return res.json(
      result.rows.map((row) => ({
        exercise_id: row.EXERCISE_ID,
        name: row.NAME,
        description: row.DESCRIPTION,
        category: {
          category_id: row.CATEGORY_ID,
          name: row.CATEGORY_NAME
        }
      }))
    );
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
