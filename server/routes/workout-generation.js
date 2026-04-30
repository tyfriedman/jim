const express = require("express");
const { withConnection, oracledb } = require("../db/connection");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const SYSTEM_PROMPT = `You are an experienced personal trainer and an expert in exercise science and programming. Your job is to design workouts for people based on what they are looking for in the moment.

Guidelines:
- Only use exercises from the provided list. Never invent or suggest exercises not on the list.
- Tailor the workout to the user's request (e.g., muscle group focus, intensity, duration, goals).
- Consider the user's recent workout history to avoid overtraining the same muscle groups two sessions in a row, and to understand their preferences and fitness level.
- Structure workouts logically: order exercises from compound to isolation movements, or by energy demand.
- Assign realistic sets, reps, and rest periods appropriate to the stated goal (e.g., hypertrophy, strength, endurance, HIIT).
- Keep the workout achievable in a typical gym session (30-75 minutes) unless the user specifies otherwise.

You must always respond with valid JSON only - no explanation, no markdown, no prose.`;

function normalizeString(value) {
  return String(value || "").trim();
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload?.output)) {
    return "";
  }

  for (const item of payload.output) {
    if (item?.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }
    for (const contentItem of item.content) {
      if (contentItem?.type === "output_text" && typeof contentItem.text === "string") {
        const text = contentItem.text.trim();
        if (text) {
          return text;
        }
      }
      if (contentItem?.type === "text" && typeof contentItem.text === "string") {
        const text = contentItem.text.trim();
        if (text) {
          return text;
        }
      }
    }
  }

  return "";
}

function buildWorkoutHistory(rows) {
  const byLogId = new Map();
  for (const row of rows) {
    const logId = row.LOG_ID;
    if (!byLogId.has(logId)) {
      byLogId.set(logId, {
        log_id: logId,
        title: row.TITLE || "Untitled workout",
        log_date: row.LOG_DATE,
        exercises: []
      });
    }
    if (row.EXERCISE_NAME) {
      byLogId.get(logId).exercises.push(row.EXERCISE_NAME);
    }
  }
  return Array.from(byLogId.values());
}

function toIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return date.toISOString().slice(0, 10);
}

function normalizeGeneratedWorkout(parsed, exerciseByName) {
  const title = normalizeString(parsed?.workout_title);
  const description = normalizeString(parsed?.workout_description);
  const rawSections = Array.isArray(parsed?.sections) ? parsed.sections : [];
  if (!title) {
    throw new Error("Generated workout title is missing.");
  }
  if (!description) {
    throw new Error("Generated workout description is missing.");
  }
  if (!rawSections.length) {
    throw new Error("Generated workout sections are missing.");
  }

  const sections = [];
  const unknownExercises = new Set();
  for (const rawSection of rawSections) {
    const sectionName = normalizeString(rawSection?.section_name);
    const rawExercises = Array.isArray(rawSection?.exercises) ? rawSection.exercises : [];
    if (!sectionName || !rawExercises.length) {
      continue;
    }

    const exercises = [];
    for (const rawExercise of rawExercises) {
      const requestedName = normalizeString(rawExercise?.exercise_name);
      const matchedExercise = exerciseByName.get(requestedName.toLowerCase());
      if (!matchedExercise) {
        if (requestedName) {
          unknownExercises.add(requestedName);
        }
        continue;
      }

      const sets = Number(rawExercise?.sets);
      const repsValue = rawExercise?.reps;
      const restValue = rawExercise?.rest;
      const reps = normalizeString(
        typeof repsValue === "number" ? String(repsValue) : repsValue
      );
      const rest = normalizeString(
        typeof restValue === "number" ? `${restValue} sec` : restValue
      );
      if (!Number.isFinite(sets) || sets <= 0 || !reps || !rest) {
        continue;
      }

      exercises.push({
        exercise_id: matchedExercise.exercise_id,
        exercise_name: matchedExercise.name,
        category: matchedExercise.category,
        sets: Math.floor(sets),
        reps,
        rest
      });
    }

    if (exercises.length > 0) {
      sections.push({
        section_name: sectionName,
        exercises
      });
    }
  }

  if (!sections.length) {
    if (unknownExercises.size > 0) {
      throw new Error(
        `Generated workout used exercises not in your database: ${Array.from(unknownExercises).join(", ")}`
      );
    }
    throw new Error("Generated workout had no valid exercises.");
  }

  return {
    workout_title: title,
    workout_description: description,
    sections
  };
}

router.post("/generate", async (req, res, next) => {
  const prompt = normalizeString(req.body?.prompt);
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });
  }

  try {
    const exercisesResult = await withConnection((connection) =>
      connection.execute(
        `SELECT e.exercise_id, e.name, c.name AS category_name
         FROM EXERCISE e
         JOIN EXERCISE_CATEGORY c ON c.category_id = e.category_id
         ORDER BY c.name, e.name`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const exercises = exercisesResult.rows.map((row) => ({
      exercise_id: row.EXERCISE_ID,
      name: row.NAME,
      category: row.CATEGORY_NAME
    }));
    if (exercises.length === 0) {
      return res.status(400).json({ error: "No exercises are available to generate from." });
    }

    const historyResult = await withConnection((connection) =>
      connection.execute(
        `SELECT l.log_id, l.title, l.log_date, ex.name AS exercise_name
         FROM (
           SELECT log_id, title, log_date
           FROM WORKOUT_LOG
           WHERE user_id = :userId
           ORDER BY log_date DESC, log_id DESC
           FETCH FIRST 10 ROWS ONLY
         ) l
         LEFT JOIN WORKOUT_ENTRY e ON e.log_id = l.log_id
         LEFT JOIN EXERCISE ex ON ex.exercise_id = e.exercise_id
         ORDER BY l.log_date DESC, l.log_id DESC, e.entry_id`,
        { userId: req.user.userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const workoutHistory = buildWorkoutHistory(historyResult.rows);
    const exerciseList = exercises
      .map((exercise) => `${exercise.name} - ${exercise.category}`)
      .join("\n");
    const historyText =
      workoutHistory.length === 0
        ? "No recent workouts available."
        : workoutHistory
            .map((workout) => {
              const exerciseNames =
                workout.exercises.length > 0 ? workout.exercises.join(", ") : "No exercises";
              return `- ${workout.title} (${toIsoDate(workout.log_date)}): ${exerciseNames}`;
            })
            .join("\n");

    const userMessage = [
      `The user is looking for: "${prompt}"`,
      "Available exercises (name - category):",
      exerciseList,
      "The user's last 10 workouts:",
      historyText,
      "Please generate a complete workout plan. For each exercise, include: exercise name, number of sets, reps per set, and rest time between sets. Group exercises logically (e.g., warm-up, main sets, cool-down if appropriate). Only use exercises from the available list above."
    ].join("\n");

    const openAiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_WORKOUT_MODEL || "gpt-5-mini",
        store: false,
        instructions: SYSTEM_PROMPT,
        input: userMessage,
        text: {
          format: {
            type: "json_schema",
            name: "generated_workout",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                workout_title: { type: "string", minLength: 1 },
                workout_description: { type: "string", minLength: 1 },
                sections: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      section_name: { type: "string", minLength: 1 },
                      exercises: {
                        type: "array",
                        minItems: 1,
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            exercise_name: { type: "string", minLength: 1 },
                            sets: { type: "integer", minimum: 1 },
                            reps: { type: "string", minLength: 1 },
                            rest: { type: "string", minLength: 1 }
                          },
                          required: ["exercise_name", "sets", "reps", "rest"]
                        }
                      }
                    },
                    required: ["section_name", "exercises"]
                  }
                }
              },
              required: ["workout_title", "workout_description", "sections"]
            }
          }
        }
      })
    });

    const openAiData = await openAiRes.json();
    if (!openAiRes.ok) {
      const message =
        openAiData?.error?.message || "OpenAI request failed while generating workout.";
      return res.status(502).json({ error: message });
    }

    const outputText = extractResponseText(openAiData);
    if (!outputText) {
      return res.status(502).json({ error: "OpenAI response did not include workout JSON." });
    }

    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      return res.status(502).json({ error: "OpenAI returned invalid JSON for workout generation." });
    }

    const exerciseByName = new Map(
      exercises.map((exercise) => [exercise.name.toLowerCase(), exercise])
    );
    const normalized = normalizeGeneratedWorkout(parsed, exerciseByName);

    return res.json(normalized);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
