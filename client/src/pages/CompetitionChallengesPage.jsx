import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiGetExercises } from "../api/workouts.js";
import { apiGetFriends } from "../api/friends.js";
import {
  apiCreateChallenge,
  apiDeleteChallenge,
  apiGetChallengeLeaderboard,
  apiGetChallenges,
  apiInviteToChallenge,
  apiJoinChallenge,
  apiLogChallengeEntry,
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

function getDefaultChallengeDates() {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  return {
    start_date: toDateInputValue(startDate),
    end_date: toDateInputValue(endDate)
  };
}

function createInitialChallengeForm() {
  const defaults = getDefaultChallengeDates();
  return {
    title: "",
    description: "",
    exercise_id: "",
    target_value: "",
    start_date: defaults.start_date,
    end_date: defaults.end_date,
    is_public: "1",
    invited_user_ids: []
  };
}

function isActiveChallenge(challenge) {
  const now = new Date();
  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= now && now <= end;
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function parseDateParts(value) {
  if (typeof value !== "string") {
    return { year: "", month: "", day: "" };
  }
  const parts = value.split("-");
  if (parts.length !== 3) {
    return { year: "", month: "", day: "" };
  }
  const [year, month, day] = parts;
  if (!year || !month || !day) {
    return { year: "", month: "", day: "" };
  }
  return { year, month, day };
}

function getDaysInMonth(year, month) {
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  if (!Number.isInteger(yearNumber) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return 31;
  }
  return new Date(yearNumber, monthNumber, 0).getDate();
}

function RetroSelect({ value, options, placeholder, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(ev) {
      if (!rootRef.current) {
        return;
      }
      if (!rootRef.current.contains(ev.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selected = options.find((option) => String(option.value) === String(value));
  const label = selected?.label || placeholder;

  return (
    <div className={`retro-select ${open ? "retro-select--open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="retro-select-trigger"
        onMouseDown={(ev) => {
          ev.preventDefault();
          if (!disabled) {
            setOpen((prev) => !prev);
          }
        }}
        disabled={disabled}
      >
        <span>{label}</span>
        <span className="retro-select-caret" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div className="retro-select-menu">
          {options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              className={`retro-select-option ${
                String(option.value) === String(value) ? "retro-select-option--active" : ""
              }`}
              onMouseDown={(ev) => {
                ev.preventDefault();
                onChange(option.value);
                setOpen(false);
              }}
              disabled={option.disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RetroDateSelect({ value, onChange }) {
  const [dateParts, setDateParts] = useState(() => parseDateParts(value));
  const nowYear = new Date().getFullYear();

  useEffect(() => {
    setDateParts(parseDateParts(value));
  }, [value]);

  const yearOptions = [];
  for (let year = nowYear - 1; year <= nowYear + 5; year += 1) {
    yearOptions.push({ value: String(year), label: String(year) });
  }

  const monthOptions = [];
  for (let month = 1; month <= 12; month += 1) {
    monthOptions.push({ value: padDatePart(month), label: padDatePart(month) });
  }

  const dayOptions = [];
  const dayLimit = getDaysInMonth(dateParts.year, dateParts.month);
  for (let day = 1; day <= dayLimit; day += 1) {
    dayOptions.push({ value: padDatePart(day), label: padDatePart(day) });
  }

  function updateDatePart(key, nextValue) {
    const next = { ...dateParts, [key]: String(nextValue) };
    const maxDay = getDaysInMonth(next.year, next.month);
    if (next.day && Number(next.day) > maxDay) {
      next.day = padDatePart(maxDay);
    }
    setDateParts(next);
    if (next.year && next.month && next.day) {
      onChange(`${next.year}-${next.month}-${next.day}`);
      return;
    }
    onChange("");
  }

  return (
    <div className="retro-challengehub-date-selects">
      <RetroSelect
        value={dateParts.year}
        placeholder="Year"
        options={yearOptions}
        onChange={(nextValue) => updateDatePart("year", nextValue)}
      />
      <RetroSelect
        value={dateParts.month}
        placeholder="Month"
        options={monthOptions}
        onChange={(nextValue) => updateDatePart("month", nextValue)}
      />
      <RetroSelect
        value={dateParts.day}
        placeholder="Day"
        options={dayOptions}
        onChange={(nextValue) => updateDatePart("day", nextValue)}
      />
    </div>
  );
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
  const [createSuccessMessage, setCreateSuccessMessage] = useState("");
  const [joiningChallengeId, setJoiningChallengeId] = useState(null);
  const [invitingChallengeId, setInvitingChallengeId] = useState(null);
  const [deletingChallengeId, setDeletingChallengeId] = useState(null);
  const [deleteConfirmChallenge, setDeleteConfirmChallenge] = useState(null);
  const [inviteTargets, setInviteTargets] = useState({});
  const [logValues, setLogValues] = useState({});
  const [loggingChallengeId, setLoggingChallengeId] = useState(null);

  const [activeTab, setActiveTab] = useState("create");

  const [form, setForm] = useState(() => createInitialChallengeForm());

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

  useEffect(() => {
    if (!createSuccessMessage) {
      return undefined;
    }
    const timeoutId = setTimeout(() => {
      setCreateSuccessMessage("");
    }, 2000);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [createSuccessMessage]);

  async function handleCreateChallenge(ev) {
    ev.preventDefault();
    setError("");
    setCreateSuccessMessage("");
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
      setForm(createInitialChallengeForm());
      setCreateSuccessMessage("Challenge created!");
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

  async function handleLogEntry(challengeId) {
    const value = Number(logValues[challengeId]);
    if (!value || value <= 0) {
      setError("Enter a value greater than 0.");
      return;
    }
    setLoggingChallengeId(challengeId);
    setError("");
    try {
      await apiLogChallengeEntry(token, challengeId, value);
      setLogValues((prev) => ({ ...prev, [challengeId]: "" }));
      await loadLeaderboard(challengeId);
    } catch (err) {
      setError(err.message || "Failed to log entry.");
    } finally {
      setLoggingChallengeId(null);
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

  function requestDeleteChallenge(challenge) {
    setDeleteConfirmChallenge({
      challenge_id: challenge.challenge_id,
      title: challenge.title
    });
  }

  function cancelDeleteChallenge() {
    setDeleteConfirmChallenge(null);
  }

  async function confirmDeleteChallenge() {
    if (!deleteConfirmChallenge || deletingChallengeId) {
      return;
    }
    const challengeId = deleteConfirmChallenge.challenge_id;
    setDeletingChallengeId(challengeId);
    setError("");
    setCreateSuccessMessage("");
    try {
      await apiDeleteChallenge(token, challengeId);
      setLeaderboards((prev) => {
        const next = { ...prev };
        delete next[challengeId];
        return next;
      });
      await refreshChallenges();
      setCreateSuccessMessage("Challenge deleted.");
    } catch (err) {
      setError(err.message || "Failed to delete challenge.");
    } finally {
      setDeleteConfirmChallenge(null);
      setDeletingChallengeId(null);
    }
  }

  function toggleInvitedUser(userId) {
    const nextUserId = String(userId);
    setForm((prev) => {
      const isSelected = prev.invited_user_ids.includes(nextUserId);
      return {
        ...prev,
        invited_user_ids: isSelected
          ? prev.invited_user_ids.filter((id) => id !== nextUserId)
          : [...prev.invited_user_ids, nextUserId]
      };
    });
  }

  return (
    <div
      className={`retro-page retro-section retro-scene retro-challengehub-page ${
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

        <div className="retro-mode-toggle">
          <button
            type="button"
            className={`retro-tab${activeTab === "create" ? " retro-tab--active" : ""}`}
            onClick={() => setActiveTab("create")}
          >
            Create
          </button>
          <button
            type="button"
            className={`retro-tab${activeTab === "leaderboard" ? " retro-tab--active" : ""}`}
            onClick={() => setActiveTab("leaderboard")}
          >
            Leaderboard
          </button>
        </div>

        {activeTab === "create" && <div className="retro-panel retro-panel--wide">
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
                <RetroSelect
                  value={form.exercise_id}
                  placeholder="Select exercise"
                  options={exerciseOptions}
                  onChange={(value) => setForm((prev) => ({ ...prev, exercise_id: String(value) }))}
                />
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
                <RetroDateSelect
                  value={form.start_date}
                  onChange={(nextDate) => setForm((prev) => ({ ...prev, start_date: nextDate }))}
                />
              </label>
              <label className="retro-field">
                <span className="retro-label">End Date</span>
                <RetroDateSelect
                  value={form.end_date}
                  onChange={(nextDate) => setForm((prev) => ({ ...prev, end_date: nextDate }))}
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
              <div className="retro-field">
                <span className="retro-label">Invite Friends (optional)</span>
                {friends.length === 0 ? (
                  <p className="retro-hint">No friends available to invite.</p>
                ) : (
                  <div className="retro-challengehub-invite-list">
                    {friends.map((friend) => {
                      const isSelected = form.invited_user_ids.includes(String(friend.user_id));
                      return (
                        <button
                          key={friend.user_id}
                          type="button"
                          className={`retro-btn retro-btn--small ${
                            isSelected ? "retro-btn--primary" : "retro-btn--ghost"
                          }`}
                          onClick={() => toggleInvitedUser(friend.user_id)}
                        >
                          {friend.username}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <div className="retro-actions">
              <button
                type="submit"
                className="retro-btn retro-btn--primary retro-btn--small retro-challengehub-create-btn"
              >
                Create Challenge
              </button>
            </div>
          </form>
        </div>}

        {activeTab === "leaderboard" && (
          loading ? (
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

                  {challenge.creator_id === userId ? (
                    <div className="retro-actions">
                      <button
                        type="button"
                        className="retro-btn retro-btn--danger retro-btn--small"
                        disabled={deletingChallengeId === challenge.challenge_id}
                        onClick={() => requestDeleteChallenge(challenge)}
                      >
                        {deletingChallengeId === challenge.challenge_id
                          ? "Deleting..."
                          : "Delete Challenge"}
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
                      <div className="retro-actions">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          className="retro-input"
                          placeholder={`Log ${challenge.exercise_name} value`}
                          value={logValues[challenge.challenge_id] ?? ""}
                          onChange={(ev) =>
                            setLogValues((prev) => ({ ...prev, [challenge.challenge_id]: ev.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="retro-btn retro-btn--primary retro-btn--small"
                          disabled={loggingChallengeId === challenge.challenge_id}
                          onClick={() => handleLogEntry(challenge.challenge_id)}
                        >
                          {loggingChallengeId === challenge.challenge_id ? "Logging..." : "Log Progress"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ))}

        {error ? (
          <div className="retro-banner retro-banner--error" role="alert">
            {error}
          </div>
        ) : null}
        {createSuccessMessage ? (
          <div className="retro-banner retro-challenges-flash" role="status" aria-live="polite">
            {createSuccessMessage}
          </div>
        ) : null}
      </div>

      {deleteConfirmChallenge ? (
        <div className="retro-modal-backdrop" role="presentation">
          <div
            className="retro-panel retro-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="retro-delete-challenge-title"
          >
            <h2 id="retro-delete-challenge-title" className="retro-title">
              Delete Challenge?
            </h2>
            <p className="retro-hint retro-modal-copy">
              Remove "{deleteConfirmChallenge.title}" permanently?
            </p>
            <div className="retro-actions">
              <button
                type="button"
                className="retro-btn retro-btn--ghost retro-btn--small"
                onClick={cancelDeleteChallenge}
                disabled={deletingChallengeId === deleteConfirmChallenge.challenge_id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="retro-btn retro-btn--danger retro-btn--small"
                onClick={confirmDeleteChallenge}
                disabled={deletingChallengeId === deleteConfirmChallenge.challenge_id}
              >
                {deletingChallengeId === deleteConfirmChallenge.challenge_id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
