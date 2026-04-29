import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiBuyItem } from "../api/shop.js";
import SpriteAnimator from "../components/SpriteAnimator.jsx";

const CATEGORIES = [
  { id: "hat", label: "Hat & Hair" },
  { id: "eyes", label: "Eyes" },
  { id: "mouth", label: "Mouth" },
  { id: "body", label: "Body" },
];

const SHOP_ITEMS = [
  { id: "bandana",      name: "Bandana",        category: "hat",   price: 0, image: "/sprites/purchases/Hat-hair/Bandana%20128x128px.png" },
  { id: "hat1",         name: "Hat 1",           category: "hat",   price: 0, image: "/sprites/purchases/Hat-hair/Hat1%20128x128px.png" },
  { id: "hat2",         name: "Hat 2",           category: "hat",   price: 0, image: "/sprites/purchases/Hat-hair/Hat2%20128x128px.png" },
  { id: "hat3",         name: "Hat 3",           category: "hat",   price: 0, image: "/sprites/purchases/Hat-hair/Hat3%20128x128px.png" },
  { id: "hair1",        name: "Hair 1",          category: "hat",   price: 0, image: "/sprites/purchases/Hat-hair/hair1%20128x128px.png" },
  { id: "hair2",        name: "Hair 2",          category: "hat",   price: 0, image: "/sprites/purchases/Hat-hair/hair2%20128x128px.png" },
  { id: "blackglasses", name: "Black Glasses",   category: "eyes",  price: 0, image: "/sprites/purchases/Eyes-glasses/Black%20glasses%20128x128px.png" },
  { id: "eyepatch",     name: "Eye Patch",       category: "eyes",  price: 0, image: "/sprites/purchases/Eyes-glasses/Eye%20patch%20128x128px.png" },
  { id: "eyes1",        name: "Eyes 1",          category: "eyes",  price: 0, image: "/sprites/purchases/Eyes-glasses/Eyes1%20128x128px.png" },
  { id: "eyes2",        name: "Eyes 2",          category: "eyes",  price: 0, image: "/sprites/purchases/Eyes-glasses/Eyes2%20128x128px.png" },
  { id: "eyes3",        name: "Eyes 3",          category: "eyes",  price: 0, image: "/sprites/purchases/Eyes-glasses/Eyes3%20128x128px.png" },
  { id: "monocle",      name: "Monocle",         category: "eyes",  price: 0, image: "/sprites/purchases/Eyes-glasses/Monocle%20128x128px.png" },
  { id: "cig",          name: "Cig",             category: "mouth", price: 0, image: "/sprites/purchases/Beard-mouth/Cig%20128x128px.png" },
  { id: "clownnose",    name: "Clown Nose",      category: "mouth", price: 0, image: "/sprites/purchases/Beard-mouth/Clown%20nose%20128x128px.png" },
  { id: "crookedteeth", name: "Crooked Teeth",   category: "mouth", price: 0, image: "/sprites/purchases/Beard-mouth/Crooked%20teeth%20128x128px.png" },
  { id: "mustache",     name: "Mustache",        category: "mouth", price: 0, image: "/sprites/purchases/Beard-mouth/Mustache%20128x128px.png" },
  { id: "tongue",       name: "Tongue",          category: "mouth", price: 0, image: "/sprites/purchases/Beard-mouth/Tongue%20128x128px.png" },
  { id: "yellow",       name: "Yellow Body",     category: "body",  price: 0, image: "/sprites/purchases/Body/Yellow%20128x128px.png" },
  { id: "turquoise",    name: "Turquoise Body",  category: "body",  price: 0, image: "/sprites/purchases/Body/Turquoise%20128x128px.png" },
  { id: "purple",       name: "Purple Body",     category: "body",  price: 0, image: "/sprites/purchases/Body/Purple%20128x128px.png" },
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

  const visibleItems = SHOP_ITEMS.filter((item) => item.category === activeCategory);

  async function handleBuy(item) {
    if (owned.has(item.id) || buying) return;
    setErrorMsg(null);
    setBuying(item.id);
    try {
      const data = await apiBuyItem(token, item.price);
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
