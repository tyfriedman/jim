import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function HomePage() {
  const navigate = useNavigate();
  const { coins, userId, logout } = useAuth();

  return (
    <div className="retro-page retro-home">
      <div className="retro-panel retro-panel--wide">
        <h1 className="retro-title">World 1-1</h1>
        <p className="retro-subtitle">You made it in.</p>
        <dl className="retro-stats">
          <div>
            <dt>Player</dt>
            <dd>#{userId}</dd>
          </div>
          <div>
            <dt>Coins</dt>
            <dd>{coins ?? "—"}</dd>
          </div>
        </dl>
        <p className="retro-hint">Feed, goals, and friends will plug in here next.</p>
        <div className="retro-actions">
          <button
            type="button"
            className="retro-btn retro-btn--danger"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
