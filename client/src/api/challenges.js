import { getApiBase } from "./auth.js";

async function parseJsonBody(res) {
  const text = await res.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Unexpected response from server." };
  }
}

async function request(path, options = {}) {
  const base = getApiBase();
  const { headers: initHeaders, body, ...rest } = options;
  const headers = { ...(initHeaders || {}) };
  if (body != null) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${base}${path}`, { ...rest, body, headers });
  const data = await parseJsonBody(res);
  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export function apiGetChallenges(token) {
  return request("/challenges", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function apiCreateChallenge(token, payload) {
  return request("/challenges", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function apiJoinChallenge(token, challengeId) {
  return request(`/challenges/${challengeId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function apiInviteToChallenge(token, challengeId, userId) {
  return request(`/challenges/${challengeId}/invite`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: userId }),
  });
}

export function apiGetChallengeLeaderboard(token, challengeId) {
  return request(`/challenges/${challengeId}/leaderboard`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}
