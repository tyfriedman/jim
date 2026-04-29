require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { initPool, closePool } = require("./db/connection");

const authRoutes = require("./routes/auth");
const workoutRoutes = require("./routes/workouts");
const exerciseRoutes = require("./routes/exercises");
const goalRoutes = require("./routes/goals");
const friendRoutes = require("./routes/friends");
const feedRoutes = require("./routes/feed");
const challengeRoutes = require("./routes/challenges");
const avatarRoutes = require("./routes/avatar");
const achievementRoutes = require("./routes/achievements");

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN;
if (clientOrigin) {
  const origins = clientOrigin
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: origins.length === 1 ? origins[0] : origins,
      credentials: true
    })
  );
}

app.use(express.json());

app.get("/health", async (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/achievements", achievementRoutes);

app.use((error, _req, res, _next) => {
  // Keep runtime errors server-side, return generic response to clients.
  console.error(error);
  res.status(500).json({ error: "Internal server error." });
});

function validateEnv() {
  const required = ["JWT_SECRET"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

async function start() {
  validateEnv();
  await initPool();

  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
