import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(loginUsername.trim(), password);
      } else {
        await register(username.trim(), email.trim(), password);
      }
      navigate("/home", { replace: true, state: { fromLogin: true } });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="retro-page retro-login">
      <div className="retro-cloud retro-cloud--1" aria-hidden />
      <div className="retro-cloud retro-cloud--2" aria-hidden />
      <div className="retro-cloud retro-cloud--3" aria-hidden />
      <div className="retro-cloud retro-cloud--4" aria-hidden />
      <div className="retro-cloud retro-cloud--5" aria-hidden />
      <div className="retro-cloud retro-cloud--6" aria-hidden />
      <div className="retro-cloud retro-cloud--7" aria-hidden />
      <div className="retro-cloud retro-cloud--8" aria-hidden />
      <div className="retro-hill" aria-hidden />
      <img
        src="/sprites/gym_equipment/bench.png"
        alt=""
        aria-hidden
        className="retro-gym-prop retro-gym-prop--login retro-gym-prop--login-bench"
      />
      <img
        src="/sprites/gym_equipment/treadmill.png"
        alt=""
        aria-hidden
        className="retro-gym-prop retro-gym-prop--login retro-gym-prop--login-treadmill"
      />
      <img
        src="/sprites/gym_equipment/weight.png"
        alt=""
        aria-hidden
        className="retro-gym-prop retro-gym-prop--login retro-gym-prop--login-squat"
      />
      <img
        src="/sprites/gym_equipment/dumbell.png"
        alt=""
        aria-hidden
        className="retro-gym-prop retro-gym-prop--login retro-gym-prop--login-dumbbell"
      />

      <p className="retro-login-logo" aria-label="JIM logo">
        JIM
      </p>

      <div className="retro-panel">
        <h1 className="retro-title">Player select</h1>
        <p className="retro-subtitle">Enter the fitness kingdom</p>

        <div className="retro-mode-toggle" role="tablist" aria-label="Account mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={`retro-tab ${mode === "login" ? "retro-tab--active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`retro-tab ${mode === "signup" ? "retro-tab--active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            New game
          </button>
        </div>

        {error ? (
          <div className="retro-banner retro-banner--error" role="alert">
            {error}
          </div>
        ) : null}

        <form className="retro-form" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <label className="retro-field">
              <span className="retro-label">Username</span>
              <input
                className="retro-input"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                required
                minLength={1}
                maxLength={50}
              />
            </label>
          ) : null}

          {mode === "login" ? (
            <label className="retro-field">
              <span className="retro-label">Username</span>
              <input
                className="retro-input"
                name="username"
                autoComplete="username"
                value={loginUsername}
                onChange={(ev) => setLoginUsername(ev.target.value)}
                required
                minLength={1}
                maxLength={50}
              />
            </label>
          ) : (
            <label className="retro-field">
              <span className="retro-label">Email</span>
              <input
                className="retro-input"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                required
              />
            </label>
          )}

          <label className="retro-field">
            <span className="retro-label">Password</span>
            <input
              className="retro-input"
              type="password"
              name="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              minLength={1}
            />
          </label>

          <button type="submit" className="retro-btn retro-btn--primary" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Start" : "Create save"}
          </button>
        </form>
      </div>
    </div>
  );
}
