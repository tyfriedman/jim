const express = require("express");
const { withConnection, oracledb } = require("../db/connection");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const ACHIEVEMENTS = [
  // Easy 5 coins 
  { id: "workout_1",          title: "First Sweat",          description: "Log your first workout",             difficulty: "easy",   reward: 5,  stat: "workout_count",            target: 1  },
  { id: "workout_2",          title: "Back for More",         description: "Log 2 workouts",                     difficulty: "easy",   reward: 5,  stat: "workout_count",            target: 2  },
  { id: "workout_3",          title: "Third Time's a Charm",  description: "Log 3 workouts",                     difficulty: "easy",   reward: 5,  stat: "workout_count",            target: 3  },
  { id: "workout_5",          title: "Five and Alive",        description: "Log 5 workouts",                     difficulty: "easy",   reward: 5,  stat: "workout_count",            target: 5  },
  { id: "workout_10",         title: "Perfect 10",            description: "Log 10 workouts",                    difficulty: "easy",   reward: 5,  stat: "workout_count",            target: 10 },
  { id: "friend_1",           title: "Squad Forming",         description: "Add your first friend",              difficulty: "easy",   reward: 5,  stat: "friend_count",             target: 1  },
  { id: "friend_2",           title: "Dynamic Duo",           description: "Have 2 friends",                     difficulty: "easy",   reward: 5,  stat: "friend_count",             target: 2  },
  { id: "friend_3",           title: "Triple Threat",         description: "Have 3 friends",                     difficulty: "easy",   reward: 5,  stat: "friend_count",             target: 3  },
  { id: "friend_4",           title: "Growing Squad",         description: "Have 4 friends",                     difficulty: "easy",   reward: 5,  stat: "friend_count",             target: 4  },
  { id: "hype_given_1",       title: "First Hype",            description: "Hype someone's workout",             difficulty: "easy",   reward: 5,  stat: "hypes_given",              target: 1  },
  { id: "hype_given_5",       title: "Hype Train",            description: "Hype 5 workouts",                    difficulty: "easy",   reward: 5,  stat: "hypes_given",              target: 5  },
  { id: "hype_given_10",      title: "Hype Machine",          description: "Hype 10 workouts",                   difficulty: "easy",   reward: 5,  stat: "hypes_given",              target: 10 },
  { id: "hype_given_15",      title: "Hype Lord",             description: "Hype 15 workouts",                   difficulty: "easy",   reward: 5,  stat: "hypes_given",              target: 15 },
  { id: "comment_given_1",    title: "Say Something",         description: "Leave your first comment",           difficulty: "easy",   reward: 5,  stat: "comments_given",           target: 1  },
  { id: "comment_given_3",    title: "Getting Chatty",        description: "Leave 3 comments",                   difficulty: "easy",   reward: 5,  stat: "comments_given",           target: 3  },
  { id: "comment_given_5",    title: "Conversation Starter",  description: "Leave 5 comments",                   difficulty: "easy",   reward: 5,  stat: "comments_given",           target: 5  },
  { id: "hype_recv_1",        title: "Noticed!",              description: "Receive your first hype",            difficulty: "easy",   reward: 5,  stat: "hypes_received",           target: 1  },
  { id: "hype_recv_5",        title: "Getting Popular",       description: "Receive 5 hypes",                    difficulty: "easy",   reward: 5,  stat: "hypes_received",           target: 5  },
  { id: "notes_1",            title: "Note Taker",            description: "Add notes to a workout",             difficulty: "easy",   reward: 5,  stat: "workouts_with_notes",      target: 1  },
  { id: "notes_3",            title: "Detail Oriented",       description: "Add notes to 3 workouts",            difficulty: "easy",   reward: 5,  stat: "workouts_with_notes",      target: 3  },
  { id: "notes_5",            title: "Journaling",            description: "Add notes to 5 workouts",            difficulty: "easy",   reward: 5,  stat: "workouts_with_notes",      target: 5  },
  { id: "entries_5",          title: "Exercise Sampler",      description: "Log 5 exercises total",              difficulty: "easy",   reward: 5,  stat: "total_entries",            target: 5  },
  { id: "entries_10",         title: "Volume Builder",        description: "Log 10 exercises total",             difficulty: "easy",   reward: 5,  stat: "total_entries",            target: 10 },
  { id: "entries_20",         title: "Reps in the Bank",      description: "Log 20 exercises total",             difficulty: "easy",   reward: 5,  stat: "total_entries",            target: 20 },
  { id: "sets_1",             title: "First Set",             description: "Log your first set",                 difficulty: "easy",   reward: 5,  stat: "total_sets",               target: 1  },
  { id: "sets_10",            title: "Set Collector",         description: "Log 10 total sets",                  difficulty: "easy",   reward: 5,  stat: "total_sets",               target: 10 },
  { id: "sets_25",            title: "Set Stacker",           description: "Log 25 total sets",                  difficulty: "easy",   reward: 5,  stat: "total_sets",               target: 25 },
  { id: "big_workout_3",      title: "Variety Pack",          description: "Log 3+ exercises in one workout",    difficulty: "easy",   reward: 5,  stat: "max_entries_per_workout",  target: 3  },
  { id: "big_workout_5",      title: "Full Body Grind",       description: "Log 5+ exercises in one workout",    difficulty: "easy",   reward: 5,  stat: "max_entries_per_workout",  target: 5  },
  { id: "comment_recv_1",     title: "First Feedback",        description: "Receive your first comment",         difficulty: "easy",   reward: 5,  stat: "comments_received",        target: 1  },

  // Medium 10 coins
  { id: "workout_15",         title: "Half Month",            description: "Log 15 workouts",                    difficulty: "medium", reward: 10, stat: "workout_count",            target: 15  },
  { id: "workout_20",         title: "Twenty Strong",         description: "Log 20 workouts",                    difficulty: "medium", reward: 10, stat: "workout_count",            target: 20  },
  { id: "workout_25",         title: "Quarter Century",       description: "Log 25 workouts",                    difficulty: "medium", reward: 10, stat: "workout_count",            target: 25  },
  { id: "friend_5",           title: "Inner Circle",          description: "Have 5 friends",                     difficulty: "medium", reward: 10, stat: "friend_count",             target: 5   },
  { id: "friend_7",           title: "Community Pillar",      description: "Have 7 friends",                     difficulty: "medium", reward: 10, stat: "friend_count",             target: 7   },
  { id: "hype_recv_15",       title: "Rising Star",           description: "Receive 15 hypes",                   difficulty: "medium", reward: 10, stat: "hypes_received",           target: 15  },
  { id: "hype_recv_25",       title: "Crowd Favorite",        description: "Receive 25 hypes",                   difficulty: "medium", reward: 10, stat: "hypes_received",           target: 25  },
  { id: "comment_given_15",   title: "Top Commenter",         description: "Leave 15 comments",                  difficulty: "medium", reward: 10, stat: "comments_given",           target: 15  },
  { id: "comment_given_25",   title: "Super Commenter",       description: "Leave 25 comments",                  difficulty: "medium", reward: 10, stat: "comments_given",           target: 25  },
  { id: "sets_100",           title: "Century Sets",          description: "Log 100 total sets",                 difficulty: "medium", reward: 10, stat: "total_sets",               target: 100 },
  { id: "sets_200",           title: "Set Monster",           description: "Log 200 total sets",                 difficulty: "medium", reward: 10, stat: "total_sets",               target: 200 },
  { id: "entries_50",         title: "Volume Champion",       description: "Log 50 exercises total",             difficulty: "medium", reward: 10, stat: "total_entries",            target: 50  },
  { id: "entries_75",         title: "Marathon Logger",       description: "Log 75 exercises total",             difficulty: "medium", reward: 10, stat: "total_entries",            target: 75  },
  { id: "hype_given_25",      title: "Encourager",            description: "Hype 25 workouts",                   difficulty: "medium", reward: 10, stat: "hypes_given",              target: 25  },
  { id: "comment_recv_10",    title: "Coaching Corner",       description: "Receive 10 comments",                difficulty: "medium", reward: 10, stat: "comments_received",        target: 10  },

  // Hard 20 coins
  { id: "workout_50",         title: "Fifty Sessions",        description: "Log 50 workouts",                    difficulty: "hard",   reward: 20, stat: "workout_count",            target: 50  },
  { id: "friend_10",          title: "Social Legend",         description: "Have 10 friends",                    difficulty: "hard",   reward: 20, stat: "friend_count",             target: 10  },
  { id: "hype_recv_100",      title: "Living Legend",         description: "Receive 100 hypes",                  difficulty: "hard",   reward: 20, stat: "hypes_received",           target: 100 },
  { id: "sets_500",           title: "Iron Volume",           description: "Log 500 total sets",                 difficulty: "hard",   reward: 20, stat: "total_sets",               target: 500 },
  { id: "comment_given_50",   title: "Community Champion",    description: "Leave 50 comments",                  difficulty: "hard",   reward: 20, stat: "comments_given",           target: 50  },
];

async function getStats(userId) {
  const result = await withConnection((connection) =>
    connection.execute(
      `SELECT
         (SELECT COUNT(*) FROM WORKOUT_LOG WHERE user_id = u.pid) AS workout_count,
         (SELECT COUNT(*) FROM WORKOUT_ENTRY e JOIN WORKOUT_LOG wl ON wl.log_id = e.log_id WHERE wl.user_id = u.pid) AS total_entries,
         (SELECT NVL(SUM(e.sets), 0) FROM WORKOUT_ENTRY e JOIN WORKOUT_LOG wl ON wl.log_id = e.log_id WHERE wl.user_id = u.pid) AS total_sets,
         (SELECT COUNT(*) FROM FRIENDSHIP WHERE (user_id_1 = u.pid OR user_id_2 = u.pid) AND status = 'accepted') AS friend_count,
         (SELECT COUNT(*) FROM FEED_HYPE WHERE user_id = u.pid) AS hypes_given,
         (SELECT NVL(SUM(hype_count), 0) FROM WORKOUT_LOG WHERE user_id = u.pid) AS hypes_received,
         (SELECT COUNT(*) FROM FEED_COMMENT WHERE user_id = u.pid) AS comments_given,
         (SELECT NVL(SUM(comment_count), 0) FROM WORKOUT_LOG WHERE user_id = u.pid) AS comments_received,
         (SELECT COUNT(*) FROM WORKOUT_LOG WHERE user_id = u.pid AND notes IS NOT NULL) AS workouts_with_notes,
         (SELECT NVL(MAX(cnt), 0) FROM (SELECT COUNT(*) AS cnt FROM WORKOUT_ENTRY e JOIN WORKOUT_LOG wl ON wl.log_id = e.log_id WHERE wl.user_id = u.pid GROUP BY wl.log_id)) AS max_entries_per_workout
       FROM (SELECT :userId AS pid FROM dual) u`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )
  );

  const row = result.rows[0];
  return {
    workout_count:           Number(row.WORKOUT_COUNT),
    total_entries:           Number(row.TOTAL_ENTRIES),
    total_sets:              Number(row.TOTAL_SETS),
    friend_count:            Number(row.FRIEND_COUNT),
    hypes_given:             Number(row.HYPES_GIVEN),
    hypes_received:          Number(row.HYPES_RECEIVED),
    comments_given:          Number(row.COMMENTS_GIVEN),
    comments_received:       Number(row.COMMENTS_RECEIVED),
    workouts_with_notes:     Number(row.WORKOUTS_WITH_NOTES),
    max_entries_per_workout: Number(row.MAX_ENTRIES_PER_WORKOUT),
  };
}

router.get("/", async (req, res, next) => {
  try {
    const stats = await getStats(req.user.userId);
    return res.json(
      ACHIEVEMENTS.map((a) => ({
        ...a,
        progress: Math.min(stats[a.stat] ?? 0, a.target),
        completed: (stats[a.stat] ?? 0) >= a.target,
      }))
    );
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/claim", async (req, res, next) => {
  const achievement = ACHIEVEMENTS.find((a) => a.id === req.params.id);
  if (!achievement) {
    return res.status(404).json({ error: "Achievement not found." });
  }

  try {
    const stats = await getStats(req.user.userId);
    if ((stats[achievement.stat] ?? 0) < achievement.target) {
      return res.status(400).json({ error: "Achievement not yet completed." });
    }

    const newCoins = await withConnection(async (connection) => {
      try {
        const coinRes = await connection.execute(
          "SELECT coins FROM USERS WHERE user_id = :userId",
          { userId: req.user.userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const current = Number(coinRes.rows[0]?.COINS) || 0;
        const updated = current + achievement.reward;
        await connection.execute(
          "UPDATE USERS SET coins = :coins WHERE user_id = :userId",
          { coins: updated, userId: req.user.userId }
        );
        await connection.commit();
        return updated;
      } catch (err) {
        await connection.rollback();
        throw err;
      }
    });

    return res.json({ coins: newCoins });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
