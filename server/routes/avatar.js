const express = require("express");
const { withConnection, oracledb } = require("../db/connection");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

async function getAvatarWithItems(userId) {
  const avatarRes = await withConnection((connection) =>
    connection.execute(
      `SELECT a.avatar_id, a.user_id, a.avatar_level, a.xp, u.username, u.profile_pic, u.coins
       FROM AVATAR a
       JOIN USERS u ON u.user_id = a.user_id
       WHERE a.user_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )
  );
  const avatar = avatarRes.rows[0];
  if (!avatar) {
    return null;
  }

  const itemRes = await withConnection((connection) =>
    connection.execute(
      `SELECT ai.slot, ai.equipped, i.item_id, i.name, i.item_type, i.unlock_condition, i.xp_required, i.image_url
       FROM AVATAR_INVENTORY ai
       JOIN AVATAR_ITEM i ON i.item_id = ai.item_id
       WHERE ai.avatar_id = :avatarId
       ORDER BY ai.slot`,
      { avatarId: avatar.AVATAR_ID },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )
  );

  return {
    avatar_id: avatar.AVATAR_ID,
    user_id: avatar.USER_ID,
    username: avatar.USERNAME,
    profile_pic: avatar.PROFILE_PIC,
    coins: avatar.COINS,
    avatar_level: avatar.AVATAR_LEVEL,
    xp: avatar.XP,
    inventory: itemRes.rows.map((row) => ({
      slot: row.SLOT,
      equipped: row.EQUIPPED === 1,
      item: {
        item_id: row.ITEM_ID,
        name: row.NAME,
        item_type: row.ITEM_TYPE,
        unlock_condition: row.UNLOCK_CONDITION,
        xp_required: row.XP_REQUIRED,
        image_url: row.IMAGE_URL
      }
    }))
  };
}

router.get("/", async (req, res, next) => {
  try {
    const avatar = await getAvatarWithItems(req.user.userId);
    if (!avatar) {
      return res.status(404).json({ error: "Avatar not found." });
    }
    return res.json(avatar);
  } catch (error) {
    return next(error);
  }
});

router.post("/equip", async (req, res, next) => {
  const { slot, item_id, equipped = 1 } = req.body;
  if (!slot || !item_id) {
    return res.status(400).json({ error: "slot and item_id are required." });
  }

  try {
    await withConnection(async (connection) => {
      try {
        const avatarRes = await connection.execute(
          "SELECT avatar_id FROM AVATAR WHERE user_id = :userId",
          { userId: req.user.userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const avatar = avatarRes.rows[0];
        if (!avatar) {
          await connection.rollback();
          throw Object.assign(new Error("Avatar not found."), { statusCode: 404 });
        }

        await connection.execute(
          `MERGE INTO AVATAR_INVENTORY ai
           USING (SELECT :avatarId AS avatar_id, :slot AS slot FROM dual) src
           ON (ai.avatar_id = src.avatar_id AND ai.slot = src.slot)
           WHEN MATCHED THEN UPDATE SET ai.item_id = :itemId, ai.equipped = :equipped
           WHEN NOT MATCHED THEN
             INSERT (avatar_id, slot, item_id, equipped)
             VALUES (:avatarId, :slot, :itemId, :equipped)`,
          {
            avatarId: avatar.AVATAR_ID,
            slot,
            itemId: item_id,
            equipped
          }
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

router.get("/items", async (_req, res, next) => {
  try {
    const result = await withConnection((connection) =>
      connection.execute(
        `SELECT item_id, name, item_type, unlock_condition, xp_required, image_url
         FROM AVATAR_ITEM
         ORDER BY xp_required, item_id`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    return res.json(
      result.rows.map((row) => ({
        item_id: row.ITEM_ID,
        name: row.NAME,
        item_type: row.ITEM_TYPE,
        unlock_condition: row.UNLOCK_CONDITION,
        xp_required: row.XP_REQUIRED,
        image_url: row.IMAGE_URL
      }))
    );
  } catch (error) {
    return next(error);
  }
});

router.get("/:userId", async (req, res, next) => {
  const targetUserId = Number(req.params.userId);
  if (!Number.isFinite(targetUserId)) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  try {
    if (targetUserId !== req.user.userId) {
      const friendshipRes = await withConnection((connection) =>
        connection.execute(
          `SELECT 1
           FROM FRIENDSHIP
           WHERE status = 'accepted'
             AND ((user_id_1 = :currentUserId AND user_id_2 = :targetUserId)
               OR (user_id_1 = :targetUserId AND user_id_2 = :currentUserId))`,
          { currentUserId: req.user.userId, targetUserId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        )
      );

      if (!friendshipRes.rows.length) {
        return res.status(403).json({ error: "Friendship required." });
      }
    }

    const avatar = await getAvatarWithItems(targetUserId);
    if (!avatar) {
      return res.status(404).json({ error: "Avatar not found." });
    }

    return res.json(avatar);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
