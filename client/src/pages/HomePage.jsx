import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import SpriteAnimator from "../components/SpriteAnimator.jsx";
import { apiGetAchievements } from "../api/achievements.js";
import { apiGetFriendRequests } from "../api/friends.js";
import { apiGetAvatar, apiGetEquippedAvatar, apiSaveEquippedAvatar } from "../api/shop.js";

const HOME_AVATAR_FRAME_COUNTS = [5, 8, 2, 2, 2];
const AVATAR_PHASES = {
  INTRO_RUN: "introRun",
  INTRO_SKID: "introSkid",
  IDLE: "idle",
  JUMP_START: "jumpStart",
  JUMP_AIR: "jumpAir",
  JUMP_LAND: "jumpLand",
};
const AVATAR_PHASE_ANIMATION = {
  [AVATAR_PHASES.INTRO_RUN]: { row: 1, fps: 12 },
  [AVATAR_PHASES.INTRO_SKID]: { row: 2, fps: 10 },
  [AVATAR_PHASES.IDLE]: { row: 0, fps: 8 },
  [AVATAR_PHASES.JUMP_START]: { row: 3, fps: 10 },
  [AVATAR_PHASES.JUMP_AIR]: { row: 4, fps: 8 },
  [AVATAR_PHASES.JUMP_LAND]: { row: 3, fps: 10 },
};

const INTRO_START_OFFSET_X = 360;
const INTRO_RUN_DURATION_MS = 900;
const INTRO_SKID_DURATION_MS = 260;
const INTRO_SKID_OFFSET_X = 34;

const JUMP_START_DURATION_MS = 120;
const JUMP_AIR_DURATION_MS = 300;
const JUMP_LAND_DURATION_MS = 180;
const JUMP_CROUCH_OFFSET_Y = 10;
const JUMP_PEAK_OFFSET_Y = -78;
const DEFAULT_EYES_ITEM_ID = "eyes1";
const HOME_SPEECH_VISIBLE_DURATION_MS = 4200;
const HOME_SPEECH_HIDDEN_DURATION_MS = 5200;
const HOME_ENCOURAGEMENT_MESSAGES = [
  "You got this!",
  "Keep pushing forward!",
  "Strong work today!",
  "One rep at a time!",
  "Stay focused, stay fierce!",
  "You are leveling up!",
  "Keep the streak alive!",
  "Small steps, big gains!",
  "Great effort, keep going!",
  "Champion mindset activated!",
];

const EQUIPPED_ITEM_IMAGE_BY_ID = {
  bandana: "/sprites/purchases/Hat-hair/Bandana%20128x128px.png",
  hat1: "/sprites/purchases/Hat-hair/Hat1%20128x128px.png",
  hat2: "/sprites/purchases/Hat-hair/Hat2%20128x128px.png",
  hat3: "/sprites/purchases/Hat-hair/Hat3%20128x128px.png",
  hair1: "/sprites/purchases/Hat-hair/hair1%20128x128px.png",
  hair2: "/sprites/purchases/Hat-hair/hair2%20128x128px.png",
  blackglasses: "/sprites/purchases/Eyes-glasses/Black%20glasses%20128x128px.png",
  eyepatch: "/sprites/purchases/Eyes-glasses/Eye%20patch%20128x128px.png",
  eyes1: "/sprites/purchases/Eyes-glasses/Eyes1%20128x128px.png",
  eyes2: "/sprites/purchases/Eyes-glasses/Eyes2%20128x128px.png",
  eyes3: "/sprites/purchases/Eyes-glasses/Eyes3%20128x128px.png",
  monocle: "/sprites/purchases/Eyes-glasses/Monocle%20128x128px.png",
  cig: "/sprites/purchases/Beard-mouth/Cig%20128x128px.png",
  clownnose: "/sprites/purchases/Beard-mouth/Clown%20nose%20128x128px.png",
  crookedteeth: "/sprites/purchases/Beard-mouth/Crooked%20teeth%20128x128px.png",
  mustache: "/sprites/purchases/Beard-mouth/Mustache%20128x128px.png",
  tongue: "/sprites/purchases/Beard-mouth/Tongue%20128x128px.png",
  yellow: "/sprites/purchases/Body/Yellow%20128x128px.png",
  turquoise: "/sprites/purchases/Body/Turquoise%20128x128px.png",
  purple: "/sprites/purchases/Body/Purple%20128x128px.png",
};

function getEquippedKey(userId) {
  return `jim_equipped_${userId}`;
}

function loadEquipped(userId) {
  try {
    const raw = localStorage.getItem(getEquippedKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      hat: parsed?.hat || null,
      eyes: parsed?.eyes || DEFAULT_EYES_ITEM_ID,
      mouth: parsed?.mouth || null,
      body: parsed?.body || null,
    };
  } catch {
    return { hat: null, eyes: DEFAULT_EYES_ITEM_ID, mouth: null, body: null };
  }
}

function saveEquipped(userId, equipped) {
  localStorage.setItem(getEquippedKey(userId), JSON.stringify(equipped));
}

function normalizeEquipped(raw) {
  return {
    hat: typeof raw?.hat === "string" ? raw.hat : null,
    eyes: typeof raw?.eyes === "string" ? raw.eyes : DEFAULT_EYES_ITEM_ID,
    mouth: typeof raw?.mouth === "string" ? raw.mouth : null,
    body: typeof raw?.body === "string" ? raw.body : null
  };
}

function hasAnyEquipped(equipped) {
  return Boolean(equipped?.hat || equipped?.eyes || equipped?.mouth || equipped?.body);
}

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, coins, userId, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [avatarXp, setAvatarXp] = useState(null);
  const [avatarLevel, setAvatarLevel] = useState(null);
  const swipeDirection = location.state?.swipeDirection;
  const homeEntrySide =
    location.state?.homeEntrySide ||
    (swipeDirection === "left" ? "right" : swipeDirection === "right" ? "left" : "right");
  const introDirection = homeEntrySide === "left" ? -1 : 1;
  const [avatarPhase, setAvatarPhase] = useState(AVATAR_PHASES.INTRO_RUN);
  const [avatarOffsetX, setAvatarOffsetX] = useState(() => INTRO_START_OFFSET_X * introDirection);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [avatarFrame, setAvatarFrame] = useState(0);
  const [speechMessage, setSpeechMessage] = useState("");
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const [pendingIncomingCount, setPendingIncomingCount] = useState(0);
  const [equipped, setEquipped] = useState(() => loadEquipped(userId));
  const [speechLoopReady, setSpeechLoopReady] = useState(false);
  const [motionDurationMs, setMotionDurationMs] = useState(0);
  const [motionEasing, setMotionEasing] = useState("linear");
  const timeoutRefs = useRef([]);

  const avatarAnimation = AVATAR_PHASE_ANIMATION[avatarPhase] ?? AVATAR_PHASE_ANIMATION.idle;
  const avatarFrameCount =
    HOME_AVATAR_FRAME_COUNTS[avatarAnimation.row] ?? HOME_AVATAR_FRAME_COUNTS[0];
  const avatarEndFrame = Math.max(0, avatarFrameCount - 1);
  const equippedImages = useMemo(
    () =>
      [equipped.body, equipped.eyes, equipped.mouth, equipped.hat]
        .map((itemId) => EQUIPPED_ITEM_IMAGE_BY_ID[itemId])
        .filter(Boolean),
    [equipped],
  );
  const uncompletedGoals = useMemo(
    () => goals.filter((goal) => !goal.completed),
    [goals],
  );
  const activeGoal =
    uncompletedGoals.length > 0
      ? uncompletedGoals[Math.min(activeGoalIndex, uncompletedGoals.length - 1)]
      : null;

  const queueTimeout = (callback, delayMs) => {
    const timeoutId = window.setTimeout(callback, delayMs);
    timeoutRefs.current.push(timeoutId);
  };

  const clearQueuedTimeouts = () => {
    timeoutRefs.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    timeoutRefs.current = [];
  };

  useEffect(() => {
    clearQueuedTimeouts();
    setAvatarOffsetX(INTRO_START_OFFSET_X * introDirection);
    setAvatarOffsetY(0);
    setAvatarPhase(AVATAR_PHASES.INTRO_RUN);
    setSpeechMessage("");
    setSpeechLoopReady(false);
    setMotionDurationMs(0);
    setMotionEasing("linear");

    queueTimeout(() => {
      setMotionDurationMs(INTRO_RUN_DURATION_MS);
      setMotionEasing("linear");
      setAvatarOffsetX(INTRO_SKID_OFFSET_X * introDirection);
    }, 0);

    queueTimeout(() => {
      setAvatarPhase(AVATAR_PHASES.INTRO_SKID);
      setMotionDurationMs(INTRO_SKID_DURATION_MS);
      setMotionEasing("ease-out");
      setAvatarOffsetX(0);
    }, INTRO_RUN_DURATION_MS);

    queueTimeout(() => {
      setAvatarPhase(AVATAR_PHASES.IDLE);
      setMotionDurationMs(0);
      setMotionEasing("linear");
      setAvatarOffsetX(0);
      setAvatarOffsetY(0);
      setSpeechLoopReady(true);
    }, INTRO_RUN_DURATION_MS + INTRO_SKID_DURATION_MS);

    return () => {
      clearQueuedTimeouts();
    };
  }, [introDirection]);

  useEffect(() => {
    if (!speechLoopReady) {
      setSpeechMessage("");
      return undefined;
    }

    let cancelled = false;
    let showTimerId = 0;
    let hideTimerId = 0;

    const pickMessage = () =>
      HOME_ENCOURAGEMENT_MESSAGES[
        Math.floor(Math.random() * HOME_ENCOURAGEMENT_MESSAGES.length)
      ];

    const runLoop = () => {
      if (cancelled) {
        return;
      }
      setSpeechMessage(pickMessage());
      showTimerId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        setSpeechMessage("");
        hideTimerId = window.setTimeout(runLoop, HOME_SPEECH_HIDDEN_DURATION_MS);
      }, HOME_SPEECH_VISIBLE_DURATION_MS);
    };

    runLoop();

    return () => {
      cancelled = true;
      window.clearTimeout(showTimerId);
      window.clearTimeout(hideTimerId);
    };
  }, [speechLoopReady]);

  useEffect(() => {
    const frameDurationMs = Math.max(40, Math.round(1000 / avatarAnimation.fps));
    let frameCursor = 0;
    let previousTickMs = performance.now();
    let animationFrameId = 0;

    setAvatarFrame(0);

    const tick = (currentTickMs) => {
      if (currentTickMs - previousTickMs >= frameDurationMs) {
        frameCursor = frameCursor >= avatarEndFrame ? 0 : frameCursor + 1;
        setAvatarFrame(frameCursor);
        previousTickMs = currentTickMs;
      }
      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [avatarAnimation.fps, avatarAnimation.row, avatarEndFrame]);

  useEffect(() => {
    let cancelled = false;
    setGoalsLoading(true);
    apiGetAchievements(token)
      .then((data) => {
        if (!cancelled) {
          setGoals(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGoals([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGoalsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    apiGetAvatar(token)
      .then((data) => { if (!cancelled && data) { setAvatarXp(data.xp ?? 0); setAvatarLevel(data.avatar_level ?? 1); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const localEquipped = normalizeEquipped(loadEquipped(userId));
    apiGetEquippedAvatar(token, userId)
      .then((data) => {
        if (cancelled) {
          return;
        }
        const backendEquipped = normalizeEquipped(data?.equipped || {});
        if (!hasAnyEquipped(backendEquipped) && hasAnyEquipped(localEquipped)) {
          setEquipped(localEquipped);
          saveEquipped(userId, localEquipped);
          apiSaveEquippedAvatar(token, localEquipped).catch(() => {});
          return;
        }
        setEquipped(backendEquipped);
        saveEquipped(userId, backendEquipped);
      })
      .catch(() => {
        if (!cancelled) {
          setEquipped(localEquipped);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  useEffect(() => {
    let cancelled = false;
    apiGetFriendRequests(token)
      .then((data) => {
        if (!cancelled) {
          const incoming = Array.isArray(data?.incoming) ? data.incoming : [];
          setPendingIncomingCount(incoming.length);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPendingIncomingCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (uncompletedGoals.length === 0) {
      setActiveGoalIndex(0);
      return undefined;
    }

    if (activeGoalIndex > uncompletedGoals.length - 1) {
      setActiveGoalIndex(0);
    }

    const intervalId = window.setInterval(() => {
      setActiveGoalIndex((prev) => (prev + 1) % uncompletedGoals.length);
    }, 6000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeGoalIndex, uncompletedGoals.length]);

  const handleAvatarPress = () => {
    if (avatarPhase !== AVATAR_PHASES.IDLE) {
      return;
    }

    clearQueuedTimeouts();
    setAvatarPhase(AVATAR_PHASES.JUMP_START);
    setMotionDurationMs(JUMP_START_DURATION_MS);
    setMotionEasing("ease-out");
    setAvatarOffsetY(JUMP_CROUCH_OFFSET_Y);

    queueTimeout(() => {
      setAvatarPhase(AVATAR_PHASES.JUMP_AIR);
      setMotionDurationMs(JUMP_AIR_DURATION_MS);
      setMotionEasing("cubic-bezier(0.2, 0.85, 0.35, 1)");
      setAvatarOffsetY(JUMP_PEAK_OFFSET_Y);
    }, JUMP_START_DURATION_MS);

    queueTimeout(() => {
      setAvatarPhase(AVATAR_PHASES.JUMP_LAND);
      setMotionDurationMs(JUMP_LAND_DURATION_MS);
      setMotionEasing("ease-in");
      setAvatarOffsetY(0);
    }, JUMP_START_DURATION_MS + JUMP_AIR_DURATION_MS);

    queueTimeout(() => {
      setAvatarPhase(AVATAR_PHASES.IDLE);
      setMotionDurationMs(0);
      setMotionEasing("linear");
      setAvatarOffsetY(0);
    }, JUMP_START_DURATION_MS + JUMP_AIR_DURATION_MS + JUMP_LAND_DURATION_MS);
  };

  const avatarWrapClassName = useMemo(
    () => `retro-home-avatar-wrap retro-home-avatar-wrap--${avatarPhase}`,
    [avatarPhase],
  );
  const avatarClassName = useMemo(
    () =>
      `retro-home-avatar retro-home-avatar--${avatarPhase} ${
        introDirection === -1 &&
        (avatarPhase === AVATAR_PHASES.INTRO_RUN || avatarPhase === AVATAR_PHASES.INTRO_SKID)
          ? "retro-home-avatar--mirrored"
          : ""
      }`,
    [avatarPhase, introDirection],
  );
  const avatarWrapStyle = useMemo(
    () => ({
      transform: `translate(${avatarOffsetX}px, ${avatarOffsetY}px)`,
      transition: `transform ${motionDurationMs}ms ${motionEasing}`,
    }),
    [avatarOffsetX, avatarOffsetY, motionDurationMs, motionEasing],
  );

  return (
    <div
      className={`retro-page retro-home retro-scene ${
        swipeDirection === "left"
          ? "retro-scene--swipe-left"
          : swipeDirection === "right"
            ? "retro-scene--swipe-right"
            : ""
      }`}
    >
      <div className="retro-cloud retro-cloud--1" aria-hidden />
      <div className="retro-cloud retro-cloud--2" aria-hidden />
      <div className="retro-cloud retro-cloud--3" aria-hidden />
      <div className="retro-cloud retro-cloud--4" aria-hidden />
      <div className="retro-cloud retro-cloud--5" aria-hidden />
      <div className="retro-cloud retro-cloud--6" aria-hidden />
      <div className="retro-cloud retro-cloud--7" aria-hidden />
      <div className="retro-cloud retro-cloud--8" aria-hidden />
      <div className="retro-hill" aria-hidden />
      <img
        src="/sprites/gym_equipment/bench.png"
        alt=""
        aria-hidden
        className="retro-gym-prop retro-gym-prop--home retro-gym-prop--home-bench"
      />
      <img
        src="/sprites/gym_equipment/treadmill.png"
        alt=""
        aria-hidden
        className="retro-gym-prop retro-gym-prop--home retro-gym-prop--home-treadmill"
      />
      <img
        src="/sprites/gym_equipment/weight.png"
        alt=""
        aria-hidden
        className="retro-gym-prop retro-gym-prop--home retro-gym-prop--home-squat"
      />
      <img
        src="/sprites/gym_equipment/dumbell.png"
        alt=""
        aria-hidden
        className="retro-gym-prop retro-gym-prop--home retro-gym-prop--home-dumbbell"
      />
      <img
        src="/sprites/gym_equipment/jumprope.png"
        alt=""
        aria-hidden
        className="retro-gym-prop retro-gym-prop--home retro-gym-prop--home-jumprope"
      />

      <button
        type="button"
        className="retro-btn retro-btn--ghost retro-btn--small retro-theme-toggle-screen"
        onClick={toggleTheme}
      >
        {theme === "night" ? "Night" : "Day"}
      </button>

      <div className="retro-home-hud">
        <p className="retro-brand retro-brand--home">JIM</p>
        {avatarLevel !== null && (
          <div className="retro-xp-hud">
            <span className="retro-xp-level">Lv.{avatarLevel}</span>
            <div className="retro-xp-bar">
              <div className="retro-xp-bar-fill" style={{ width: `${((avatarXp ?? 0) / 50) * 100}%` }} />
            </div>
            <span className="retro-xp-label">{avatarXp ?? 0}/50</span>
          </div>
        )}
        <div className="retro-home-hud-actions">
          <span className="retro-coins-badge">
            <img className="retro-coin-inline retro-coin-inline--hud" src="/sprites/coin.png" alt="" aria-hidden />
            <span className="retro-coins-count">x{coins ?? 0}</span>
          </span>
          <button
            type="button"
            className="retro-btn retro-btn--ghost retro-btn--small"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            Log out
          </button>
        </div>
      </div>

      <div className="retro-home-goals-box" aria-live="polite">
        <p className="retro-home-goals-title">Keep working towards your goals!</p>
        {goalsLoading ? (
          <p className="retro-hint">Loading goals...</p>
        ) : !activeGoal ? (
          <p className="retro-hint">You have completed all current goals.</p>
        ) : (
          (() => {
            const target = Number(activeGoal.target) || 1;
            const progress = Number(activeGoal.progress) || 0;
            const pct = Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
            return (
              <div className="retro-home-goal-item">
                <p className="retro-home-goal-name">{activeGoal.title}</p>
                <p className="retro-home-goal-desc">
                  {activeGoal.description || "Keep going. You are making progress."}
                </p>
                <div className="retro-challenge-progress-wrap">
                  <div className="retro-challenge-progress-bar">
                    <div className="retro-challenge-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="retro-challenge-progress-label">
                    {progress} / {target}
                  </span>
                </div>
              </div>
            );
          })()
        )}
      </div>

      <div className="retro-home-layout">
        <div className="retro-nav-column retro-nav-column--left">
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/workouts", { state: { homeEntrySide: "left" } })}
          >
            Workouts
          </button>
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/achievements", { state: { homeEntrySide: "left" } })}
          >
            Achievements
          </button>
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/challenges", { state: { homeEntrySide: "left" } })}
          >
            Challenges
          </button>
        </div>

        <div className="retro-home-field" aria-label="Sky field">
          <div className="retro-home-avatar-stage">
            {speechMessage ? (
              <p className="retro-home-speech" role="status" aria-live="polite">
                {speechMessage}
              </p>
            ) : null}
            <button
              type="button"
              className={avatarWrapClassName}
              style={avatarWrapStyle}
              onClick={handleAvatarPress}
              aria-label="Avatar"
            >
              <span className="retro-home-avatar-layer" aria-hidden>
                <SpriteAnimator
                  src="/sprites/meepo.png"
                  frameWidth={128}
                  frameHeight={128}
                  row={avatarAnimation.row}
                  frame={avatarFrame}
                  className={`${avatarClassName} retro-home-avatar--base`}
                />
                {equippedImages.map((imageSrc) => (
                  <SpriteAnimator
                    key={imageSrc}
                    src={imageSrc}
                    frameWidth={128}
                    frameHeight={128}
                    row={avatarAnimation.row}
                    frame={avatarFrame}
                    className={`${avatarClassName} retro-home-avatar--overlay`}
                  />
                ))}
              </span>
            </button>
          </div>
        </div>

        <div className="retro-nav-column retro-nav-column--right">
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/friends", { state: { homeEntrySide: "right" } })}
          >
            <span className="retro-home-nav-label">
              <span>Friends</span>
              {pendingIncomingCount > 0 ? (
                <span className="retro-home-nav-badge" aria-label={`${pendingIncomingCount} pending friend requests`}>
                  {pendingIncomingCount}
                </span>
              ) : null}
            </span>
          </button>
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/shop", { state: { homeEntrySide: "right" } })}
          >
            Shop
          </button>
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/closet", { state: { homeEntrySide: "right" } })}
          >
            Closet
          </button>
        </div>
      </div>
    </div>
  );
}
