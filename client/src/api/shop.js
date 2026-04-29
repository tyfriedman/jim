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

export function apiBuyItem(token, price) {
  return request("/avatar/buy", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ price }),
  });
}

export function apiGetEquippedAvatar(token, userId) {
  return request(`/avatar/equipped/${userId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function apiSaveEquippedAvatar(token, equipped) {
  return request("/avatar/equipped", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ equipped }),
  });
}
