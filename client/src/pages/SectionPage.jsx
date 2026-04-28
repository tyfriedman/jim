import { useLocation, useNavigate } from "react-router-dom";

export default function SectionPage({ title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const swipeDirection = location.state?.swipeDirection;
  const backDirection = swipeDirection === "left" ? "right" : "left";

  return (
    <div
      className={`retro-page retro-section retro-scene ${
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
      </div>

      <div className="retro-section-empty">
        <h1 className="retro-title">{title}</h1>
        <div className="retro-empty-field" aria-label={`${title} placeholder`} />
        <button
          type="button"
          className="retro-btn retro-btn--ghost retro-btn--small"
          onClick={() => navigate("/home", { state: { swipeDirection: backDirection } })}
        >
          Back
        </button>
      </div>
    </div>
  );
}
