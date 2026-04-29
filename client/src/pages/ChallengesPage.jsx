import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiGetAchievements, apiClaimAchievement } from "../api/achievements.js";

const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };
const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };

function getClaimedKey(userId) {
  return `jim_claimed_${userId}`;
}

function loadClaimed(userId) {
  try {
    const raw = localStorage.getItem(getClaimedKey(userId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveClaimed(userId, claimedSet) {
  localStorage.setItem(getClaimedKey(userId), JSON.stringify([...claimedSet]));
}

export default function ChallengesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, userId, updateCoins } = useAuth();
  const swipeDirection = location.state?.swipeDirection;
  const returnHomeSide =
    location.state?.homeEntrySide ||
    (swipeDirection === "left" ? "right" : swipeDirection === "right" ? "left" : "left");

  const [achievements, setAchievements] = useState([]);
  const [claimed, setClaimed] = useState(() => loadClaimed(userId));
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetAchievements(token)
      .then((data) => { if (!cancelled) { setAchievements(data); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [token]);

  async function handleClaim(achievement) {
    if (claiming) return;
    setClaiming(achievement.id);
    try {
      const data = await apiClaimAchievement(token, achievement.id);
      const next = new Set(claimed);
      next.add(achievement.id);
      saveClaimed(userId, next);
      setClaimed(next);
      updateCoins(data.coins);
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(null);
    }
  }

  const filters = ["all", "easy", "medium", "hard"];

  const visible = achievements
    .filter((a) => activeFilter === "all" || a.difficulty === activeFilter)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? -1 : 1;
      return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
    });

  return (
    <div
      className={`retro-page retro-section retro-goals-page retro-challenges retro-scene ${
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
      <div className="retro-challenges-floor" aria-hidden />

      <div className="retro-home-hud">
        <p className="retro-brand retro-brand--home">Jim</p>
        <button
          type="button"
          className="retro-btn retro-btn--ghost retro-btn--small"
          onClick={() => navigate("/home", { state: { homeEntrySide: returnHomeSide } })}
        >
          Back
        </button>
      </div>

      <div className="retro-challenges-shell">
        <h1 className="retro-title">Goals</h1>

        {error && (
          <div className="retro-banner retro-banner--error" role="alert">
            {error}
          </div>
        )}

        <div className="retro-mode-toggle retro-challenges-filter">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              className={`retro-tab${activeFilter === f ? " retro-tab--active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f === "all" ? "All" : DIFFICULTY_LABEL[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="retro-challenges-loading">Loading...</div>
        ) : (
          <div className="retro-challenges-list">
            {visible.map((a) => {
              const isClaimed = claimed.has(a.id);
              const isClaiming = claiming === a.id;
              const pct = Math.round((a.progress / a.target) * 100);
              return (
                <div
                  key={a.id}
                  className={`retro-challenge-card retro-challenge-card--${a.difficulty}${isClaimed ? " retro-challenge-card--claimed" : ""}`}
                >
                  <div className="retro-challenge-card-header">
                    <div>
                      <p className="retro-challenge-title">{a.title}</p>
                      <p className="retro-challenge-desc">{a.description}</p>
                    </div>
                    <div className="retro-challenge-meta">
                      <span className={`retro-challenge-badge retro-challenge-badge--${a.difficulty}`}>
                        {DIFFICULTY_LABEL[a.difficulty]}
                      </span>
                      <span className="retro-challenge-reward">
                        <img
                          className="retro-coin-inline retro-coin-inline--price"
                          src="/sprites/coin.png"
                          alt=""
                          aria-hidden
                        />{" "}
                        {a.reward}
                      </span>
                    </div>
                  </div>

                  <div className="retro-challenge-progress-wrap">
                    <div className="retro-challenge-progress-bar">
                      <div
                        className="retro-challenge-progress-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="retro-challenge-progress-label">
                      {a.progress} / {a.target}
                    </span>
                  </div>

                  {isClaimed ? (
                    <span className="retro-challenge-claimed-badge">Claimed</span>
                  ) : a.completed ? (
                    <button
                      type="button"
                      className="retro-btn retro-btn--primary retro-btn--small retro-challenge-claim-btn"
                      disabled={isClaiming}
                      onClick={() => handleClaim(a)}
                    >
                      {isClaiming ? (
                        "..."
                      ) : (
                        <>
                          Claim{" "}
                          <img
                            className="retro-coin-inline retro-coin-inline--price"
                            src="/sprites/coin.png"
                            alt=""
                            aria-hidden
                          />{" "}
                          {a.reward}
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
