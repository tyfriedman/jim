import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import SpriteAnimator from "../components/SpriteAnimator.jsx";

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

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const swipeDirection = location.state?.swipeDirection;
  const introDirection = swipeDirection === "left" ? -1 : 1;
  const [avatarPhase, setAvatarPhase] = useState(AVATAR_PHASES.INTRO_RUN);
  const [avatarOffsetX, setAvatarOffsetX] = useState(() => INTRO_START_OFFSET_X * introDirection);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [motionDurationMs, setMotionDurationMs] = useState(0);
  const [motionEasing, setMotionEasing] = useState("linear");
  const timeoutRefs = useRef([]);

  const avatarAnimation = AVATAR_PHASE_ANIMATION[avatarPhase] ?? AVATAR_PHASE_ANIMATION.idle;
  const avatarFrameCount =
    HOME_AVATAR_FRAME_COUNTS[avatarAnimation.row] ?? HOME_AVATAR_FRAME_COUNTS[0];
  const avatarEndFrame = Math.max(0, avatarFrameCount - 1);

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
    }, INTRO_RUN_DURATION_MS + INTRO_SKID_DURATION_MS);

    return () => {
      clearQueuedTimeouts();
    };
  }, [introDirection]);

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
      <div className="retro-hill" aria-hidden />

      <div className="retro-home-hud">
        <p className="retro-brand retro-brand--home">Jim</p>
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

      <div className="retro-home-layout">
        <div className="retro-nav-column retro-nav-column--left">
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/workouts", { state: { swipeDirection: "right" } })}
          >
            Workouts
          </button>
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/shop", { state: { swipeDirection: "right" } })}
          >
            Challenges
          </button>
        </div>

        <div className="retro-home-field" aria-label="Sky field">
          <button
            type="button"
            className={avatarWrapClassName}
            style={avatarWrapStyle}
            onClick={handleAvatarPress}
            aria-label="Avatar"
          >
            <SpriteAnimator
              src="/sprites/meepo.png"
              frameWidth={128}
              frameHeight={128}
              row={avatarAnimation.row}
              startFrame={0}
              endFrame={avatarEndFrame}
              fps={avatarAnimation.fps}
              className={avatarClassName}
            />
          </button>
        </div>

        <div className="retro-nav-column retro-nav-column--right">
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/friends", { state: { swipeDirection: "left" } })}
          >
            Friends
          </button>
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/profile", { state: { swipeDirection: "left" } })}
          >
            Shop
          </button>
        </div>
      </div>
    </div>
  );
}
