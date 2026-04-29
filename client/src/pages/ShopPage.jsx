import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiBuyItem, apiGetShopItems } from "../api/shop.js";
import SpriteAnimator from "../components/SpriteAnimator.jsx";

const CATEGORIES = [
  { id: "hat", label: "Hat & Hair" },
  { id: "eyes", label: "Eyes" },
  { id: "mouth", label: "Mouth" },
  { id: "body", label: "Body" },
];

function getOwnedKey(userId) {
  return `jim_owned_${userId}`;
}

function loadOwned(userId) {
  try {
    const raw = localStorage.getItem(getOwnedKey(userId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveOwned(userId, ownedSet) {
  localStorage.setItem(getOwnedKey(userId), JSON.stringify([...ownedSet]));
}

export default function ShopPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { coins, token, userId, updateCoins } = useAuth();
  const swipeDirection = location.state?.swipeDirection;
  const returnHomeSide =
    location.state?.homeEntrySide ||
    (swipeDirection === "left" ? "right" : swipeDirection === "right" ? "left" : "right");

  const [activeCategory, setActiveCategory] = useState("hat");
  const [owned, setOwned] = useState(() => loadOwned(userId));
  const [buying, setBuying] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [shopItems, setShopItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadShopItems() {
      setLoadingItems(true);
      try {
        const data = await apiGetShopItems(token);
        if (cancelled) return;
        const items = (Array.isArray(data) ? data : []).map((item) => ({
          id: item.unlock_condition,
          name: item.name,
          category: String(item.item_type || "").toLowerCase(),
          price: Number(item.xp_required) || 0,
          image: item.image_url,
        }));
        setShopItems(items.filter((item) => item.id && item.image && item.category));
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message || "Could not load shop items.");
        }
      } finally {
        if (!cancelled) {
          setLoadingItems(false);
        }
      }
    }
    loadShopItems();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const visibleItems = shopItems.filter((item) => item.category === activeCategory);

  async function handleBuy(item) {
    if (owned.has(item.id) || buying) return;
    setErrorMsg(null);
    setBuying(item.id);
    try {
      const data = await apiBuyItem(token, item.id);
      const next = new Set(owned);
      next.add(item.id);
      saveOwned(userId, next);
      setOwned(next);
      updateCoins(data.coins);
    } catch (err) {
      setErrorMsg(err.message || "Purchase failed.");
    } finally {
      setBuying(null);
    }
  }

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
      <div className="retro-cloud retro-cloud--5" aria-hidden />
      <div className="retro-cloud retro-cloud--6" aria-hidden />
      <div className="retro-cloud retro-cloud--7" aria-hidden />
      <div className="retro-cloud retro-cloud--8" aria-hidden />
      <div className="retro-hill" aria-hidden />

      <div className="retro-home-hud">
        <p className="retro-brand retro-brand--home">Jim</p>
        <span className="retro-coins-badge">
          <img className="retro-coin-inline retro-coin-inline--hud" src="/sprites/coin.png" alt="" aria-hidden />
          <span>{coins ?? 0}</span>
        </span>
      </div>

      <div className="retro-shop-shell">
        <div className="retro-shop-header">
          <h1 className="retro-title retro-shop-title">&#9733; Shop &#9733;</h1>
          <button
            type="button"
            className="retro-btn retro-btn--ghost retro-btn--small"
            onClick={() => navigate("/home", { state: { homeEntrySide: returnHomeSide } })}
          >
            Back
          </button>
        </div>

        {errorMsg && (
          <div className="retro-banner retro-banner--error" role="alert">
            {errorMsg}
          </div>
        )}

        <div className="retro-mode-toggle retro-shop-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`retro-tab${activeCategory === cat.id ? " retro-tab--active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="retro-shop-grid">
          {loadingItems && <p>Loading shop items...</p>}
          {visibleItems.map((item) => {
            const isOwned = owned.has(item.id);
            const isBuying = buying === item.id;
            const canAfford = (coins ?? 0) >= item.price;
            return (
              <div key={item.id} className={`retro-shop-card${isOwned ? " retro-shop-card--owned" : ""}`}>
                <div className="retro-shop-card-img-wrap">
                  <SpriteAnimator
                    src={item.image}
                    frameWidth={128}
                    frameHeight={128}
                    row={0}
                    frame={0}
                    className="retro-shop-card-sprite"
                  />
                </div>
                <p className="retro-shop-card-name">{item.name}</p>
                {isOwned ? (
                  <span className="retro-shop-owned-badge">Owned</span>
                ) : (
                  <>
                    <p className="retro-shop-card-price">
                      <img
                        className="retro-coin-inline retro-coin-inline--price"
                        src="/sprites/coin.png"
                        alt=""
                        aria-hidden
                      />{" "}
                      {item.price}
                    </p>
                    <button
                      type="button"
                      className="retro-btn retro-btn--primary retro-btn--small retro-shop-buy-btn"
                      disabled={!canAfford || isBuying}
                      onClick={() => handleBuy(item)}
                    >
                      {isBuying ? "..." : "Buy"}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
