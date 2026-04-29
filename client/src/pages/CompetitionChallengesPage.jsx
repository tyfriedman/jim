import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiGetExercises } from "../api/workouts.js";
import { apiGetFriends } from "../api/friends.js";
import {
  apiCreateChallenge,
  apiGetChallengeLeaderboard,
  apiGetChallenges,
  apiInviteToChallenge,
  apiJoinChallenge,
} from "../api/challenges.js";

function toDateInputValue(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isActiveChallenge(challenge) {
  const now = new Date();
  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= now && now <= end;
}

export default function CompetitionChallengesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, userId } = useAuth();
  const swipeDirection = location.state?.swipeDirection;
  const returnHomeSide =
    location.state?.homeEntrySide ||
    (swipeDirection === "left" ? "right" : swipeDirection === "right" ? "left" : "left");

  const [challenges, setChallenges] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [friends, setFriends] = useState([]);
  const [leaderboards, setLeaderboards] = useState({});
  const [loadingBoards, setLoadingBoards] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningChallengeId, setJoiningChallengeId] = useState(null);
  const [invitingChallengeId, setInvitingChallengeId] = useState(null);
  const [inviteTargets, setInviteTargets] = useState({});

  const [form, setForm] = useState(() => ({
    title: "",
    description: "",
    exercise_id: "",
    target_value: "",
    start_date: "",
    end_date: "",
    is_public: "1",
    invited_user_ids: [],
  }));

  const exerciseOptions = useMemo(
    () =>
      exercises.map((exercise) => ({
        value: String(exercise.exercise_id),
        label: exercise.name,
      })),
    [exercises],
  );

  const activeChallenges = useMemo(() => challenges.filter((challenge) => isActiveChallenge(challenge)), [challenges]);

  async function refreshChallenges() {
    const data = await apiGetChallenges(token);
    setChallenges(Array.isArray(data) ? data : []);
  }

  async function loadLeaderboard(challengeId) {
    if (loadingBoards[challengeId]) {
      return;
    }
    setLoadingBoards((prev) => ({ ...prev, [challengeId]: true }));
    try {
      const data = await apiGetChallengeLeaderboard(token, challengeId);
      setLeaderboards((prev) => ({ ...prev, [challengeId]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      setError(err.message || "Failed to load leaderboard.");
    } finally {
      setLoadingBoards((prev) => ({ ...prev, [challengeId]: false }));
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      setLoading(true);
      setError("");
      try {
        const [challengeData, exerciseData, friendData] = await Promise.all([
          apiGetChallenges(token),
          apiGetExercises(),
          apiGetFriends(token),
        ]);
        if (cancelled) {
          return;
        }
        setChallenges(Array.isArray(challengeData) ? challengeData : []);
        setExercises(Array.isArray(exerciseData) ? exerciseData : []);
        setFriends(Array.isArray(friendData) ? friendData : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load challenges.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    activeChallenges.forEach((challenge) => {
      if (!leaderboards[challenge.challenge_id] && challenge.joined) {
        loadLeaderboard(challenge.challenge_id);
      }
    });
  }, [activeChallenges, leaderboards]);

  async function handleCreateChallenge(ev) {
    ev.preventDefault();
    setError("");
    if (!form.exercise_id || !form.title || !form.target_value || !form.start_date || !form.end_date) {
      setError("Please fill title, exercise, target value, start date, and end date.");
      return;
    }
    if (Number(form.end_date.replaceAll("-", "")) < Number(form.start_date.replaceAll("-", ""))) {
      setError("End date must be on or after start date.");
      return;
    }

    try {
      await apiCreateChallenge(token, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        exercise_id: Number(form.exercise_id),
        target_value: Number(form.target_value),
        start_date: form.start_date,
        end_date: form.end_date,
        is_public: Number(form.is_public),
        invited_user_ids: form.is_public === "0" ? form.invited_user_ids.map(Number) : [],
      });
      setForm({
        title: "",
        description: "",
        exercise_id: "",
        target_value: "",
        start_date: "",
        end_date: "",
        is_public: "1",
        invited_user_ids: [],
      });
      await refreshChallenges();
    } catch (err) {
      setError(err.message || "Failed to create challenge.");
    }
  }

  async function handleJoin(challengeId) {
    setJoiningChallengeId(challengeId);
    setError("");
    try {
      await apiJoinChallenge(token, challengeId);
      await refreshChallenges();
      await loadLeaderboard(challengeId);
    } catch (err) {
      setError(err.message || "Unable to join challenge.");
    } finally {
      setJoiningChallengeId(null);
    }
  }

  async function handleInvite(challengeId) {
    const targetId = Number(inviteTargets[challengeId] || 0);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      setError("Select a friend to invite.");
      return;
    }
    setInvitingChallengeId(challengeId);
    setError("");
    try {
      await apiInviteToChallenge(token, challengeId, targetId);
      await refreshChallenges();
      setInviteTargets((prev) => ({ ...prev, [challengeId]: "" }));
    } catch (err) {
      setError(err.message || "Unable to send invite.");
    } finally {
      setInvitingChallengeId(null);
    }
  }

  return (
    <div
      className={`retro-page retro-section retro-scene ${
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

      <div className="retro-home-hud">
        <p className="retro-brand retro-brand--home">JIM</p>
        <button
          type="button"
          className="retro-btn retro-btn--ghost retro-btn--small"
          onClick={() => navigate("/home", { state: { homeEntrySide: returnHomeSide } })}
        >
          Back
        </button>
      </div>

      <div className="retro-challenges-shell retro-challengehub-shell">
        <h1 className="retro-title">Challenges</h1>

        <div className="retro-panel retro-panel--wide">
          <h2 className="retro-title retro-workout-subtitle">Create Challenge</h2>
          <form className="retro-form" onSubmit={handleCreateChallenge}>
            <label className="retro-field">
              <span className="retro-label">Title</span>
              <input
                className="retro-input"
                value={form.title}
                onChange={(ev) => setForm((prev) => ({ ...prev, title: ev.target.value }))}
              />
            </label>
            <label className="retro-field">
              <span className="retro-label">Description</span>
              <input
                className="retro-input"
                value={form.description}
                onChange={(ev) => setForm((prev) => ({ ...prev, description: ev.target.value }))}
              />
            </label>
            <div className="retro-challengehub-grid">
              <label className="retro-field">
                <span className="retro-label">Exercise</span>
                <select
                  className="retro-input"
                  value={form.exercise_id}
                  onChange={(ev) => setForm((prev) => ({ ...prev, exercise_id: ev.target.value }))}
                >
                  <option value="">Select exercise</option>
                  {exerciseOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="retro-field">
                <span className="retro-label">Target Value</span>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  className="retro-input"
                  value={form.target_value}
                  onChange={(ev) => setForm((prev) => ({ ...prev, target_value: ev.target.value }))}
                />
              </label>
              <label className="retro-field">
                <span className="retro-label">Start Date</span>
                <input
                  type="date"
                  className="retro-input"
                  value={form.start_date}
                  onChange={(ev) => setForm((prev) => ({ ...prev, start_date: ev.target.value }))}
                />
              </label>
              <label className="retro-field">
                <span className="retro-label">End Date</span>
                <input
                  type="date"
                  className="retro-input"
                  value={form.end_date}
                  onChange={(ev) => setForm((prev) => ({ ...prev, end_date: ev.target.value }))}
                />
              </label>
            </div>

            <div className="retro-mode-toggle">
              <button
                type="button"
                className={`retro-tab${form.is_public === "1" ? " retro-tab--active" : ""}`}
                onClick={() => setForm((prev) => ({ ...prev, is_public: "1", invited_user_ids: [] }))}
              >
                Public
              </button>
              <button
                type="button"
                className={`retro-tab${form.is_public === "0" ? " retro-tab--active" : ""}`}
                onClick={() => setForm((prev) => ({ ...prev, is_public: "0" }))}
              >
                Private
              </button>
            </div>

            {form.is_public === "0" ? (
              <label className="retro-field">
                <span className="retro-label">Invite Friends (optional)</span>
                <select
                  multiple
                  className="retro-input"
                  value={form.invited_user_ids}
                  onChange={(ev) => {
                    const values = Array.from(ev.target.selectedOptions).map((option) => option.value);
                    setForm((prev) => ({ ...prev, invited_user_ids: values }));
                  }}
                >
                  {friends.map((friend) => (
                    <option key={friend.user_id} value={String(friend.user_id)}>
                      {friend.username}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="retro-actions">
              <button type="submit" className="retro-btn retro-btn--primary retro-btn--small">
                Create Challenge
              </button>
            </div>
          </form>
        </div>

        {error ? (
          <div className="retro-banner retro-banner--error" role="alert">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="retro-challenges-loading">Loading...</div>
        ) : (
          <div className="retro-challenges-list">
            {challenges.map((challenge) => {
              const board = leaderboards[challenge.challenge_id] || [];
              const userRow = board.find((entry) => Number(entry.user_id) === Number(userId));
              const isActive = isActiveChallenge(challenge);

              return (
                <article key={challenge.challenge_id} className="retro-challenge-card">
                  <div className="retro-challenge-card-header">
                    <div>
                      <p className="retro-challenge-title">{challenge.title}</p>
                      <p className="retro-challenge-desc">
                        {challenge.description || "No description"}
                      </p>
                      <p className="retro-challenge-desc">
                        Exercise: {challenge.exercise_name} | Target: {challenge.target_value}
                      </p>
                      <p className="retro-challenge-desc">
                        {toDateInputValue(challenge.start_date)} to {toDateInputValue(challenge.end_date)}
                      </p>
                    </div>
                    <div className="retro-challenge-meta">
                      <span className={`retro-challenge-badge ${challenge.is_public ? "retro-challenge-badge--easy" : "retro-challenge-badge--hard"}`}>
                        {challenge.is_public ? "Public" : "Private"}
                      </span>
                      <span className="retro-challenge-progress-label">
                        By {challenge.creator_username || "Player"}
                      </span>
                    </div>
                  </div>

                  {!challenge.joined ? (
                    <div className="retro-actions">
                      <button
                        type="button"
                        className="retro-btn retro-btn--primary retro-btn--small"
                        disabled={joiningChallengeId === challenge.challenge_id}
                        onClick={() => handleJoin(challenge.challenge_id)}
                      >
                        {joiningChallengeId === challenge.challenge_id ? "Joining..." : "Join Challenge"}
                      </button>
                    </div>
                  ) : null}

                  {challenge.creator_id === userId && !challenge.is_public ? (
                    <div className="retro-actions">
                      <select
                        className="retro-input"
                        value={inviteTargets[challenge.challenge_id] || ""}
                        onChange={(ev) =>
                          setInviteTargets((prev) => ({ ...prev, [challenge.challenge_id]: ev.target.value }))
                        }
                      >
                        <option value="">Invite friend...</option>
                        {friends.map((friend) => (
                          <option key={friend.user_id} value={String(friend.user_id)}>
                            {friend.username}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="retro-btn retro-btn--ghost retro-btn--small"
                        disabled={invitingChallengeId === challenge.challenge_id}
                        onClick={() => handleInvite(challenge.challenge_id)}
                      >
                        {invitingChallengeId === challenge.challenge_id ? "Inviting..." : "Invite"}
                      </button>
                    </div>
                  ) : null}

                  {isActive && challenge.joined ? (
                    <div className="retro-challengehub-board">
                      <p className="retro-label">Live Leaderboard</p>
                      {loadingBoards[challenge.challenge_id] ? (
                        <p className="retro-hint">Loading leaderboard...</p>
                      ) : board.length === 0 ? (
                        <p className="retro-hint">No scores yet.</p>
                      ) : (
                        board.slice(0, 5).map((entry) => (
                          <p key={`${challenge.challenge_id}-${entry.user_id}`} className="retro-hint">
                            #{entry.rank} {entry.username}: {entry.total_value}
                          </p>
                        ))
                      )}
                      <p className="retro-challenge-progress-label">
                        Your progress: {userRow?.total_value ?? 0} / {challenge.target_value}
                      </p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
