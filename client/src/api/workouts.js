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

export function apiGetWorkouts(token) {
  return request("/workouts", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiGetStreak(token) {
  return request("/workouts/streak", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiGetUserStreak(token, userId) {
  return request(`/workouts/streak/${userId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiCreateWorkout(token, payload) {
  return request("/workouts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function apiUpdateWorkout(token, logId, payload) {
  return request(`/workouts/${logId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function apiDeleteWorkout(token, logId) {
  return request(`/workouts/${logId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiGetExercises() {
  return request("/exercises", { method: "GET" });
}

export function apiGetWorkoutComments(token, logId) {
  return request(`/workouts/${logId}/comments`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function apiGenerateWorkout(token, prompt) {
  return request("/workouts/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt })
  });
}
