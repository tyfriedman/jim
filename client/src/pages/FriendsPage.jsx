import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  apiAddFeedComment,
  apiAddFeedHype,
  apiGetFeed,
  apiRemoveFeedHype
} from "../api/feed.js";
import {
  apiAcceptFriendRequest,
  apiCancelFriendRequest,
  apiDeclineFriendRequest,
  apiGetFriendRequests,
  apiGetFriends,
  apiRemoveFriend,
  apiSearchUsers,
  apiSendFriendRequest
} from "../api/friends.js";
import SpriteAnimator from "../components/SpriteAnimator.jsx";
import { apiGetAvatar, apiGetEquippedAvatar } from "../api/shop.js";
import { apiGetUserStreak } from "../api/workouts.js";

const EQUIPPED_ITEM_IMAGE_BY_ID = {
  yellow: "/sprites/purchases/Body/Yellow%20128x128px.png",
  turquoise: "/sprites/purchases/Body/Turquoise%20128x128px.png",
  purple: "/sprites/purchases/Body/Purple%20128x128px.png",
  eyes1: "/sprites/purchases/Eyes-glasses/Eyes1%20128x128px.png",
  eyes2: "/sprites/purchases/Eyes-glasses/Eyes2%20128x128px.png",
  eyes3: "/sprites/purchases/Eyes-glasses/Eyes3%20128x128px.png",
  blackglasses: "/sprites/purchases/Eyes-glasses/Black%20glasses%20128x128px.png",
  eyepatch: "/sprites/purchases/Eyes-glasses/Eye%20patch%20128x128px.png",
  monocle: "/sprites/purchases/Eyes-glasses/Monocle%20128x128px.png",
  cig: "/sprites/purchases/Beard-mouth/Cig%20128x128px.png",
  clownnose: "/sprites/purchases/Beard-mouth/Clown%20nose%20128x128px.png",
  crookedteeth: "/sprites/purchases/Beard-mouth/Crooked%20teeth%20128x128px.png",
  mustache: "/sprites/purchases/Beard-mouth/Mustache%20128x128px.png",
  tongue: "/sprites/purchases/Beard-mouth/Tongue%20128x128px.png",
  bandana: "/sprites/purchases/Hat-hair/Bandana%20128x128px.png",
  hat1: "/sprites/purchases/Hat-hair/Hat1%20128x128px.png",
  hat2: "/sprites/purchases/Hat-hair/Hat2%20128x128px.png",
  hat3: "/sprites/purchases/Hat-hair/Hat3%20128x128px.png",
  hair1: "/sprites/purchases/Hat-hair/hair1%20128x128px.png",
  hair2: "/sprites/purchases/Hat-hair/hair2%20128x128px.png"
};
const EQUIPPED_PROFILE_PREFIX = "jim-equipped:";
const DEFAULT_EYES_ITEM_ID = "eyes1";

function normalizeEquipped(raw) {
  return {
    body: typeof raw?.body === "string" ? raw.body : null,
    eyes: typeof raw?.eyes === "string" ? raw.eyes : DEFAULT_EYES_ITEM_ID,
    mouth: typeof raw?.mouth === "string" ? raw.mouth : null,
    hat: typeof raw?.hat === "string" ? raw.hat : null
  };
}

function hasAnyEquipped(equipped) {
  return Boolean(equipped?.body || equipped?.eyes || equipped?.mouth || equipped?.hat);
}

function parseEquippedFromProfilePic(profilePic) {
  const value = String(profilePic || "");
  if (!value.startsWith(EQUIPPED_PROFILE_PREFIX)) {
    return normalizeEquipped({});
  }
  try {
    return normalizeEquipped(JSON.parse(value.slice(EQUIPPED_PROFILE_PREFIX.length)));
  } catch {
    return normalizeEquipped({});
  }
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString();
}

function summarizeExercises(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "No exercises";
  }
  const names = entries.map((entry) => entry.exercise_name).filter(Boolean);
  if (names.length <= 3) {
    return names.join(", ");
  }
  return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
}

function normalizeCount(value) {
  return Number.isFinite(value) ? value : Number(value) || 0;
}

export default function FriendsPage() {
  const { token, userId, username } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const swipeDirection = location.state?.swipeDirection;
  const returnHomeSide =
    location.state?.homeEntrySide ||
    (swipeDirection === "left" ? "right" : swipeDirection === "right" ? "left" : "right");

  const [feed, setFeed] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [activeHubTab, setActiveHubTab] = useState("friends");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [commentByLogId, setCommentByLogId] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [socialError, setSocialError] = useState("");
  const [friendRunStarted, setFriendRunStarted] = useState(false);
  const [friendAvatarMode, setFriendAvatarMode] = useState("run");
  const [equippedByFriendId, setEquippedByFriendId] = useState({});
  const [ownAvatar, setOwnAvatar] = useState(null);
  const [streakByUserId, setStreakByUserId] = useState({});

  useEffect(() => {
    let cancelled = false;
    apiGetAvatar(token)
      .then((data) => { if (!cancelled && data) setOwnAvatar(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  const isBusy = useMemo(
    () => (key) => Boolean(actionLoading[key]),
    [actionLoading]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setLoading(true);
      setError("");
      try {
        const [feedData, friendsData, requestData] = await Promise.all([
          apiGetFeed(token),
          apiGetFriends(token),
          apiGetFriendRequests(token)
        ]);
        if (cancelled) {
          return;
        }
        setFeed(Array.isArray(feedData) ? feedData : []);
        setFriends(Array.isArray(friendsData) ? friendsData : []);
        setRequests({
          incoming: Array.isArray(requestData?.incoming) ? requestData.incoming : [],
          outgoing: Array.isArray(requestData?.outgoing) ? requestData.outgoing : []
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load friends page.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    setFriendRunStarted(false);
    setFriendAvatarMode("run");

    const startTimer = window.setTimeout(() => {
      setFriendRunStarted(true);
    }, 20);

    const settleDelayMs = 900 + Math.max(0, friends.length - 1) * 120 + 120;
    const idleTimer = window.setTimeout(() => {
      setFriendAvatarMode("idle");
    }, settleDelayMs);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(idleTimer);
    };
  }, [friends.length]);

  useEffect(() => {
    let cancelled = false;
    async function loadFriendsEquipped() {
      const next = {};
      const targetIds = [
        ...new Set([
          ...friends.map((friend) => Number(friend.user_id)),
          ...feed.map((log) => Number(log.user?.user_id))
        ])
      ].filter((id) => Number.isFinite(id));
      await Promise.all(
        targetIds.map(async (friendUserId) => {
          try {
            const data = await apiGetEquippedAvatar(token, friendUserId);
            next[friendUserId] = normalizeEquipped(data?.equipped || {});
          } catch {
            next[friendUserId] = normalizeEquipped({});
          }
        })
      );
      if (!cancelled) {
        setEquippedByFriendId(next);
      }
    }
    if (friends.length > 0 || feed.length > 0) {
      loadFriendsEquipped();
    } else {
      setEquippedByFriendId({});
    }
    return () => {
      cancelled = true;
    };
  }, [friends, feed, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadStreaks() {
      const ids = [userId, ...friends.map((friend) => Number(friend.user_id))].filter((id) =>
        Number.isFinite(id)
      );

      if (ids.length === 0) {
        setStreakByUserId({});
        return;
      }

      const next = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const data = await apiGetUserStreak(token, id);
            next[id] = Number(data?.streak) || 0;
          } catch {
            next[id] = 0;
          }
        })
      );

      if (!cancelled) {
        setStreakByUserId(next);
      }
    }

    if (token) {
      loadStreaks();
    }

    return () => {
      cancelled = true;
    };
  }, [token, userId, friends]);

  function setLoadingKey(key, nextValue) {
    setActionLoading((prev) => {
      if (!nextValue && !prev[key]) {
        return prev;
      }
      return { ...prev, [key]: nextValue };
    });
  }

  async function refreshSocialData() {
    const [friendsData, requestData] = await Promise.all([
      apiGetFriends(token),
      apiGetFriendRequests(token)
    ]);
    setFriends(Array.isArray(friendsData) ? friendsData : []);
    setRequests({
      incoming: Array.isArray(requestData?.incoming) ? requestData.incoming : [],
      outgoing: Array.isArray(requestData?.outgoing) ? requestData.outgoing : []
    });
  }

  async function handleSearch(ev) {
    ev.preventDefault();
    setSearchLoading(true);
    setSocialError("");
    try {
      const term = searchTerm.trim();
      if (!term) {
        setSearchResults([]);
        return;
      }
      const results = await apiSearchUsers(token, term);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      setSocialError(err.message || "Could not search users.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSendRequest(userId) {
    const key = `send-${userId}`;
    setLoadingKey(key, true);
    setSocialError("");
    try {
      await apiSendFriendRequest(token, userId);
      await refreshSocialData();
      setSearchResults((prev) =>
        prev.map((user) =>
          user.user_id === userId ? { ...user, friendship_status: "pending" } : user
        )
      );
    } catch (err) {
      setSocialError(err.message || "Failed to send friend request.");
    } finally {
      setLoadingKey(key, false);
    }
  }

  async function handleRespondToRequest(type, userId) {
    const key = `${type}-${userId}`;
    setLoadingKey(key, true);
    setSocialError("");
    try {
      if (type === "accept") {
        await apiAcceptFriendRequest(token, userId);
      } else {
        await apiDeclineFriendRequest(token, userId);
      }
      await refreshSocialData();
      if (type === "accept") {
        const updatedFeed = await apiGetFeed(token);
        setFeed(Array.isArray(updatedFeed) ? updatedFeed : []);
      }
    } catch (err) {
      setSocialError(err.message || "Failed to update friend request.");
    } finally {
      setLoadingKey(key, false);
    }
  }

  async function handleCancelRequest(userId) {
    const key = `cancel-${userId}`;
    setLoadingKey(key, true);
    setSocialError("");
    try {
      await apiCancelFriendRequest(token, userId);
      await refreshSocialData();
    } catch (err) {
      setSocialError(err.message || "Failed to cancel request.");
    } finally {
      setLoadingKey(key, false);
    }
  }

  async function handleRemoveFriend(userId) {
    const key = `remove-${userId}`;
    setLoadingKey(key, true);
    setSocialError("");
    try {
      await apiRemoveFriend(token, userId);
      await refreshSocialData();
      const updatedFeed = await apiGetFeed(token);
      setFeed(Array.isArray(updatedFeed) ? updatedFeed : []);
    } catch (err) {
      setSocialError(err.message || "Failed to remove friend.");
    } finally {
      setLoadingKey(key, false);
    }
  }

  async function handleToggleHype(log) {
    const key = `hype-${log.log_id}`;
    if (isBusy(key)) {
      return;
    }
    setLoadingKey(key, true);
    setError("");
    try {
      const hasHyped = Boolean(log.engagement?.viewer_has_hyped);
      if (hasHyped) {
        await apiRemoveFeedHype(token, log.log_id);
      } else {
        await apiAddFeedHype(token, log.log_id);
      }
      setFeed((prev) =>
        prev.map((item) => {
          if (item.log_id !== log.log_id) {
            return item;
          }
          const currentCount = normalizeCount(item.engagement?.hype_count);
          const nextCount = hasHyped ? Math.max(0, currentCount - 1) : currentCount + 1;
          return {
            ...item,
            engagement: {
              ...(item.engagement || {}),
              hype_count: nextCount,
              viewer_has_hyped: !hasHyped
            }
          };
        })
      );
    } catch (err) {
      setError(err.message || "Failed to update hype.");
    } finally {
      setLoadingKey(key, false);
    }
  }

  async function handleCommentSubmit(ev, logId) {
    ev.preventDefault();
    const commentText = (commentByLogId[logId] || "").trim();
    if (!commentText) {
      return;
    }
    const key = `comment-${logId}`;
    if (isBusy(key)) {
      return;
    }
    setLoadingKey(key, true);
    setError("");
    try {
      const response = await apiAddFeedComment(token, logId, commentText);
      const commentId = response?.comment_id || Date.now();
      setFeed((prev) =>
        prev.map((item) => {
          if (item.log_id !== logId) {
            return item;
          }
          const currentCount = normalizeCount(item.engagement?.comment_count);
          const existingComments = Array.isArray(item.engagement?.comments)
            ? item.engagement.comments
            : [];
          return {
            ...item,
            engagement: {
              ...(item.engagement || {}),
              comment_count: currentCount + 1,
              comments: [
                ...existingComments,
                {
                  comment_id: commentId,
                  comment: commentText,
                  created_at: new Date().toISOString(),
                  user: { username: "You" }
                }
              ]
            }
          };
        })
      );
      setCommentByLogId((prev) => ({ ...prev, [logId]: "" }));
    } catch (err) {
      setError(err.message || "Failed to post comment.");
    } finally {
      setLoadingKey(key, false);
    }
  }

  function renderLeaderboardTab() {
    const selfEntry = ownAvatar
      ? { user_id: userId, username: username ?? "You", avatar_level: ownAvatar.avatar_level ?? 1, xp: ownAvatar.xp ?? 0, isSelf: true }
      : null;
    const entries = [
      ...(selfEntry ? [selfEntry] : []),
      ...friends.map((f) => ({ user_id: f.user_id, username: f.username, avatar_level: f.avatar_level ?? 1, xp: f.xp ?? 0, isSelf: false })),
    ].sort((a, b) => b.avatar_level - a.avatar_level || b.xp - a.xp);

    if (entries.length === 0) {
      return <p className="retro-hint">Add friends to see the leaderboard.</p>;
    }
    return (
      <div className="retro-friends-hub-list">
        {entries.map((entry, i) => (
          <div key={entry.user_id} className={`retro-friends-hub-item${entry.isSelf ? " retro-friends-hub-item--self" : ""}`}>
            <p className="retro-friends-hub-name">#{i + 1} {entry.username}{entry.isSelf ? " (You)" : ""}</p>
            <span className="retro-friends-streak" aria-label={`Streak ${streakByUserId[entry.user_id] || 0} days`}>
              <img className="retro-friends-streak-icon" src="/sprites/fire_streak.png" alt="" aria-hidden />
              <span className="retro-friends-streak-count">{streakByUserId[entry.user_id] || 0}</span>
            </span>
            <p className="retro-xp-level">Lv.{entry.avatar_level}</p>
            <div className="retro-xp-bar">
              <div className="retro-xp-bar-fill" style={{ width: `${(entry.xp / 50) * 100}%` }} />
            </div>
            <p className="retro-xp-label">{entry.xp}/50 XP</p>
          </div>
        ))}
      </div>
    );
  }

  function renderFriendsTab() {
    if (friends.length === 0) {
      return (
        <div className="retro-empty-field retro-friends-empty">
          <p>No friends yet.</p>
        </div>
      );
    }
    return (
      <div className="retro-friends-hub-list">
        {friends.map((friend) => (
          <div key={friend.user_id} className="retro-friends-hub-item">
            <p className="retro-friends-hub-name">{friend.username}</p>
            <p className="retro-hint">Friends since {formatDate(friend.friends_since)}</p>
            <div className="retro-actions">
              <button
                type="button"
                className="retro-btn retro-btn--ghost retro-btn--small"
                onClick={() => handleRemoveFriend(friend.user_id)}
                disabled={isBusy(`remove-${friend.user_id}`)}
              >
                {isBusy(`remove-${friend.user_id}`) ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderRequestsSection() {
    return (
      <div className="retro-friends-requests-wrap">
        <div>
          <p className="retro-label">Incoming</p>
          {requests.incoming.length === 0 ? (
            <p className="retro-hint">No incoming requests.</p>
          ) : (
            <div className="retro-friends-hub-list">
              {requests.incoming.map((request) => (
                <div key={`in-${request.user_id}`} className="retro-friends-hub-item">
                  <p className="retro-friends-hub-name">{request.username}</p>
                  <div className="retro-actions">
                    <button
                      type="button"
                      className="retro-btn retro-btn--primary retro-btn--small"
                      onClick={() => handleRespondToRequest("accept", request.user_id)}
                      disabled={isBusy(`accept-${request.user_id}`)}
                    >
                      {isBusy(`accept-${request.user_id}`) ? "..." : "Accept"}
                    </button>
                    <button
                      type="button"
                      className="retro-btn retro-btn--ghost retro-btn--small"
                      onClick={() => handleRespondToRequest("decline", request.user_id)}
                      disabled={isBusy(`decline-${request.user_id}`)}
                    >
                      {isBusy(`decline-${request.user_id}`) ? "..." : "Deny"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="retro-label">Outgoing</p>
          {requests.outgoing.length === 0 ? (
            <p className="retro-hint">No outgoing requests.</p>
          ) : (
            <div className="retro-friends-hub-list">
              {requests.outgoing.map((request) => (
                <div key={`out-${request.user_id}`} className="retro-friends-hub-item">
                  <p className="retro-friends-hub-name">{request.username}</p>
                  <div className="retro-actions">
                    <button
                      type="button"
                      className="retro-btn retro-btn--ghost retro-btn--small"
                      onClick={() => handleCancelRequest(request.user_id)}
                      disabled={isBusy(`cancel-${request.user_id}`)}
                    >
                      {isBusy(`cancel-${request.user_id}`) ? "..." : "Cancel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderAddSection() {
    return (
      <div className="retro-friends-add-wrap">
        <form className="retro-form" onSubmit={handleSearch}>
          <div className="retro-field">
            <label className="retro-label" htmlFor="friend-search-input">
              Find by username
            </label>
            <input
              id="friend-search-input"
              className="retro-input"
              value={searchTerm}
              onChange={(ev) => setSearchTerm(ev.target.value)}
              placeholder="player name"
            />
          </div>
          <div className="retro-actions">
            <button
              type="submit"
              className="retro-btn retro-btn--primary retro-btn--small"
              disabled={searchLoading}
            >
              {searchLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {searchResults.length === 0 ? (
          <p className="retro-hint">No players found yet.</p>
        ) : (
          <div className="retro-friends-hub-list">
            {searchResults.map((user) => {
              const isPending = user.friendship_status === "pending";
              return (
                <div key={user.user_id} className="retro-friends-hub-item">
                  <p className="retro-friends-hub-name">{user.username}</p>
                  <div className="retro-actions">
                    <button
                      type="button"
                      className="retro-btn retro-btn--primary retro-btn--small"
                      onClick={() => handleSendRequest(user.user_id)}
                      disabled={isPending || isBusy(`send-${user.user_id}`)}
                    >
                      {isBusy(`send-${user.user_id}`)
                        ? "Sending..."
                        : isPending
                          ? "Pending"
                          : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderRequestsAndAddTab() {
    return (
      <div className="retro-friends-manage-wrap">
        {renderRequestsSection()}
        {renderAddSection()}
      </div>
    );
  }

  return (
    <div
      className={`retro-page retro-section retro-friends-page retro-scene ${
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
        <p className="retro-brand retro-brand--home">Jim</p>
        <div className="retro-home-hud-actions">
          <button
            type="button"
            className="retro-btn retro-btn--ghost retro-btn--small"
            onClick={() => navigate("/home", { state: { homeEntrySide: returnHomeSide } })}
          >
            Back
          </button>
        </div>
      </div>

      <div className="retro-workouts-shell retro-friends-shell">
        <div className="retro-workouts-header">
          <h1 className="retro-title">Friends</h1>
        </div>

        {error ? (
          <div className="retro-banner retro-banner--error" role="alert">
            {error}
          </div>
        ) : null}
        {socialError ? (
          <div className="retro-banner retro-banner--error" role="alert">
            {socialError}
          </div>
        ) : null}

        <div className="retro-friends-layout">
          <div className="retro-friends-feed">
            <div className="retro-workout-list">
              {loading ? (
                <div className="retro-empty-field retro-workout-empty">
                  <p>Loading friend feed...</p>
                </div>
              ) : feed.length === 0 ? (
                <div className="retro-empty-field retro-workout-empty retro-friends-feed-empty">
                  <p>No public workouts from friends yet.</p>
                </div>
              ) : (
                feed.map((log) => {
                  const isOpen = expandedLogId === log.log_id;
                  const comments = Array.isArray(log.engagement?.comments)
                    ? log.engagement.comments
                    : [];
                  const hasHyped = Boolean(log.engagement?.viewer_has_hyped);
                  const logUserId = Number(log.user?.user_id);
                  const logEquippedFromApi = normalizeEquipped(equippedByFriendId[logUserId] || {});
                  const logEquipped = hasAnyEquipped(logEquippedFromApi)
                    ? logEquippedFromApi
                    : parseEquippedFromProfilePic(log.user?.profile_pic);
                  const hasBodyEquipped = Boolean(logEquipped.body);
                  const logEquippedLayers = [
                    logEquipped.body,
                    logEquipped.eyes,
                    logEquipped.mouth,
                    logEquipped.hat
                  ]
                    .map((itemId) => EQUIPPED_ITEM_IMAGE_BY_ID[itemId])
                    .filter(Boolean);
                  return (
                    <article key={log.log_id} className="retro-workout-card">
                      <button
                        type="button"
                        className="retro-workout-toggle"
                        onClick={() =>
                          setExpandedLogId((prev) => (prev === log.log_id ? null : log.log_id))
                        }
                      >
                        <div className="retro-friends-workout-head">
                          <div className="retro-friends-workout-copy">
                            <span className="retro-workout-card-title">{log.title || "Workout"}</span>
                            <span className="retro-workout-date">{formatDate(log.log_date)}</span>
                            <span className="retro-workout-summary">{summarizeExercises(log.entries)}</span>
                            <span className="retro-workout-engagement">
                              By {log.user?.username || "Player"} | Hype:{" "}
                              {normalizeCount(log.engagement?.hype_count)} | Comments:{" "}
                              {normalizeCount(log.engagement?.comment_count)}
                            </span>
                          </div>
                          <span className="retro-friends-workout-avatar" aria-hidden>
                            {!hasBodyEquipped ? (
                              <SpriteAnimator
                                src="/sprites/meepo.png"
                                frameWidth={128}
                                frameHeight={128}
                                row={0}
                                startFrame={0}
                                endFrame={4}
                                fps={8}
                                className="retro-friends-workout-avatar-sprite"
                              />
                            ) : null}
                            {logEquippedLayers.map((imageSrc) => (
                              <SpriteAnimator
                                key={`${log.log_id}-${imageSrc}`}
                                src={imageSrc}
                                frameWidth={128}
                                frameHeight={128}
                                row={0}
                                startFrame={0}
                                endFrame={4}
                                fps={8}
                                className="retro-friends-workout-avatar-sprite retro-friends-workout-avatar-sprite--overlay"
                              />
                            ))}
                          </span>
                        </div>
                      </button>

                      {isOpen ? (
                        <div className="retro-workout-detail">
                          <div className="retro-actions">
                            <button
                              type="button"
                              className={`retro-btn retro-btn--small ${
                                hasHyped ? "retro-btn--ghost" : "retro-btn--primary"
                              }`}
                              onClick={() => handleToggleHype(log)}
                              disabled={isBusy(`hype-${log.log_id}`)}
                            >
                              {isBusy(`hype-${log.log_id}`)
                                ? "Saving..."
                                : hasHyped
                                  ? "Unhype"
                                  : "Hype"}
                            </button>
                          </div>

                          {log.description ? <p className="retro-workout-copy">{log.description}</p> : null}
                          {log.notes ? <p className="retro-workout-copy">{log.notes}</p> : null}

                          <div className="retro-workout-entry-list">
                            {Array.isArray(log.entries) && log.entries.length > 0 ? (
                              log.entries.map((entry) => (
                                <div key={entry.entry_id} className="retro-workout-entry-item">
                                  <p className="retro-workout-entry-name">{entry.exercise_name}</p>
                                  <p className="retro-workout-entry-meta">
                                    Value: {entry.value ?? "-"} | Sets: {entry.sets ?? "-"}
                                  </p>
                                  {entry.notes ? (
                                    <p className="retro-workout-entry-notes">{entry.notes}</p>
                                  ) : null}
                                </div>
                              ))
                            ) : (
                              <p className="retro-hint">No exercises listed.</p>
                            )}
                          </div>

                          <div className="retro-workout-comments">
                            <p className="retro-label">Comments</p>
                            <form
                              className="retro-friends-comment-form"
                              onSubmit={(ev) => handleCommentSubmit(ev, log.log_id)}
                            >
                              <input
                                className="retro-input"
                                value={commentByLogId[log.log_id] || ""}
                                onChange={(ev) =>
                                  setCommentByLogId((prev) => ({
                                    ...prev,
                                    [log.log_id]: ev.target.value
                                  }))
                                }
                                placeholder="Type your hype..."
                              />
                              <button
                                type="submit"
                                className="retro-btn retro-btn--primary retro-btn--small"
                                disabled={isBusy(`comment-${log.log_id}`)}
                              >
                                {isBusy(`comment-${log.log_id}`) ? "Posting..." : "Post"}
                              </button>
                            </form>

                            {comments.length === 0 ? (
                              <p className="retro-hint">No comments yet.</p>
                            ) : (
                              comments.map((comment) => (
                                <div key={comment.comment_id} className="retro-workout-comment-item">
                                  <p className="retro-workout-comment-user">
                                    {comment.user?.username || "Player"}
                                  </p>
                                  <p className="retro-workout-comment-text">{comment.comment}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <aside className="retro-panel retro-friends-hub">
            <h2 className="retro-title retro-workout-subtitle">Social Hub</h2>
            <div className="retro-mode-toggle retro-friends-tab-toggle">
              <button
                type="button"
                className={`retro-tab ${activeHubTab === "friends" ? "retro-tab--active" : ""}`}
                onClick={() => setActiveHubTab("friends")}
              >
                Friends
              </button>
              <button
                type="button"
                className={`retro-tab ${activeHubTab === "leaderboard" ? "retro-tab--active" : ""}`}
                onClick={() => setActiveHubTab("leaderboard")}
              >
                Ranks
              </button>
              <button
                type="button"
                className={`retro-tab ${
                  activeHubTab === "requests_and_add" ? "retro-tab--active" : ""
                }`}
                onClick={() => setActiveHubTab("requests_and_add")}
              >
                Manage
              </button>
            </div>

            <div className="retro-friends-hub-content">
              {activeHubTab === "friends" ? renderFriendsTab()
                : activeHubTab === "leaderboard" ? renderLeaderboardTab()
                : renderRequestsAndAddTab()}
            </div>
          </aside>
        </div>
      </div>

    </div>
  );
}
