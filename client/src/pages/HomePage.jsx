import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const swipeDirection = location.state?.swipeDirection;

  return (
    <div
      className={`retro-page retro-home retro-scene ${
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
      <div className="retro-hill" aria-hidden />

      <div className="retro-home-hud">
        <p className="retro-brand retro-brand--home">Jim</p>
        <button
          type="button"
          className="retro-btn retro-btn--ghost retro-btn--small"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        >
          Log out
        </button>
      </div>

      <div className="retro-home-layout">
        <div className="retro-nav-column retro-nav-column--left">
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/workouts", { state: { swipeDirection: "right" } })}
          >
            Workouts
          </button>
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/shop", { state: { swipeDirection: "right" } })}
          >
            Shop
          </button>
        </div>

        <div className="retro-home-field" aria-label="Sky field" />

        <div className="retro-nav-column retro-nav-column--right">
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/friends", { state: { swipeDirection: "left" } })}
          >
            Friends
          </button>
          <button
            type="button"
            className="retro-nav-block"
            onClick={() => navigate("/profile", { state: { swipeDirection: "left" } })}
          >
            Profile
          </button>
        </div>
      </div>
    </div>
  );
}
