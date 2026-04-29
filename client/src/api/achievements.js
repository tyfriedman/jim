import { getApiBase } from "./auth.js";

async function request(path, options = {}) {
  const base = getApiBase();
  const { headers: initHeaders, body, ...rest } = options;
  const headers = { ...(initHeaders || {}) };
  if (body != null) headers["Content-Type"] = "application/json";
  const res = await fetch(`${base}${path}`, { ...rest, body, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export function apiGetAchievements(token) {
  return request("/achievements", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function apiClaimAchievement(token, id) {
  return request(`/achievements/${id}/claim`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
