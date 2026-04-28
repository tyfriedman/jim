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

export function apiGetFeed(token) {
  return request("/feed", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiAddFeedComment(token, logId, comment) {
  return request(`/feed/${logId}/comment`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ comment })
  });
}

export function apiAddFeedHype(token, logId) {
  return request(`/feed/${logId}/hype`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiRemoveFeedHype(token, logId) {
  return request(`/feed/${logId}/hype`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}
