const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { withConnection, oracledb } = require("../db/connection");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/register", async (req, res, next) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are required." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await withConnection(async (connection) => {
      try {
        const insertUser = await connection.execute(
          `INSERT INTO USERS (username, email, password_hash)
           VALUES (:username, :email, :passwordHash)
           RETURNING user_id INTO :userId`,
          {
            username,
            email,
            passwordHash,
            userId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
          }
        );

        const userId = insertUser.outBinds.userId[0];
        await connection.execute("INSERT INTO AVATAR (user_id) VALUES (:userId)", { userId });
        await connection.commit();

        return userId;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    return res.status(201).json({ token: signToken(result), userId: result, coins: 0 });
  } catch (error) {
    if (error.errorNum === 1) {
      return res.status(409).json({ error: "Username or email already exists." });
    }
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `SELECT user_id, password_hash, coins
         FROM USERS
         WHERE email = :email`,
        { email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const ok = await bcrypt.compare(password, row.PASSWORD_HASH);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    await withConnection((connection) =>
      connection.execute(
        "UPDATE USERS SET last_login = CURRENT_TIMESTAMP WHERE user_id = :userId",
        { userId: row.USER_ID },
        { autoCommit: true }
      )
    );

    return res.json({ token: signToken(row.USER_ID), userId: row.USER_ID, coins: row.COINS });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `SELECT user_id, username, email, coins, bio, profile_pic, created_at, last_login
         FROM USERS
         WHERE user_id = :userId`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({
      user_id: user.USER_ID,
      username: user.USERNAME,
      email: user.EMAIL,
      coins: user.COINS,
      bio: user.BIO,
      profile_pic: user.PROFILE_PIC,
      created_at: user.CREATED_AT,
      last_login: user.LAST_LOGIN
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/profile", requireAuth, async (req, res, next) => {
  const { bio, profile_pic } = req.body;
  if (bio === undefined && profile_pic === undefined) {
    return res.status(400).json({ error: "Nothing to update." });
  }

  try {
    await withConnection((connection) =>
      connection.execute(
        `UPDATE USERS
         SET bio = COALESCE(:bio, bio),
             profile_pic = COALESCE(:profilePic, profile_pic)
         WHERE user_id = :userId`,
        {
          bio: bio ?? null,
          profilePic: profile_pic ?? null,
          userId: req.user.userId
        },
        { autoCommit: true }
      )
    );

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
