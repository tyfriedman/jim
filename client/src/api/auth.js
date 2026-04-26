/**
 * API base: empty VITE_API_BASE_URL → "/api" (Vite proxy or Apache ProxyPass).
 */
export function getApiBase() {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw == null || String(raw).trim() === "") {
    return "/api";
  }
  return String(raw).replace(/\/$/, "");
}

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

export function apiLogin(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function apiRegister(username, email, password) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password })
  });
}

export function apiMe(token) {
  return request("/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}
