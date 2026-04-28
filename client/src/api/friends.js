import { getApiBase } from "./auth.js";

async function parseJsonBody(res) {
  const text = await res.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.trim() || "Unexpected response from server." };
  }
}

async function request(path, options = {}) {
  const base = getApiBase();
  const { headers: initHeaders, body, ...rest } = options;
  const headers = { ...(initHeaders || {}) };
  if (body != null) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${base}${path}`, {
    ...rest,
    body,
    headers
  });

  const data = await parseJsonBody(res);
  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export function apiGetFriends(token) {
  return request("/friends", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiSearchUsers(token, username) {
  const params = new URLSearchParams();
  params.set("username", username);
  return request(`/friends/search?${params.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiGetFriendRequests(token) {
  return request("/friends/requests", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiSendFriendRequest(token, userId) {
  return request("/friends/request", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: userId })
  });
}

export function apiAcceptFriendRequest(token, userId) {
  return request(`/friends/${userId}/accept`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiDeclineFriendRequest(token, userId) {
  return request(`/friends/${userId}/decline`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiCancelFriendRequest(token, userId) {
  return request(`/friends/${userId}/request`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiRemoveFriend(token, userId) {
  return request(`/friends/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}
