import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import SpriteAnimator from "../components/SpriteAnimator.jsx";
import { apiGetAvatar, apiGetEquippedAvatar, apiSaveEquippedAvatar } from "../api/shop.js";

const CATEGORIES = [
  { id: "hat", label: "Hat" },
  { id: "eyes", label: "Eyes" },
  { id: "mouth", label: "Mouth" },
  { id: "body", label: "Body" },
];

const SHOP_ITEMS = [
  { id: "bandana", name: "Bandana", category: "hat", image: "/sprites/purchases/Hat-hair/Bandana%20128x128px.png" },
  { id: "hat1", name: "Hat 1", category: "hat", image: "/sprites/purchases/Hat-hair/Hat1%20128x128px.png" },
  { id: "hat2", name: "Hat 2", category: "hat", image: "/sprites/purchases/Hat-hair/Hat2%20128x128px.png" },
  { id: "hat3", name: "Hat 3", category: "hat", image: "/sprites/purchases/Hat-hair/Hat3%20128x128px.png" },
  { id: "hair1", name: "Hair 1", category: "hat", image: "/sprites/purchases/Hat-hair/hair1%20128x128px.png" },
  { id: "hair2", name: "Hair 2", category: "hat", image: "/sprites/purchases/Hat-hair/hair2%20128x128px.png" },
  { id: "blackglasses", name: "Black Glasses", category: "eyes", image: "/sprites/purchases/Eyes-glasses/Black%20glasses%20128x128px.png" },
  { id: "eyepatch", name: "Eye Patch", category: "eyes", image: "/sprites/purchases/Eyes-glasses/Eye%20patch%20128x128px.png" },
  { id: "eyes1", name: "Eyes 1", category: "eyes", image: "/sprites/purchases/Eyes-glasses/Eyes1%20128x128px.png" },
  { id: "eyes2", name: "Eyes 2", category: "eyes", image: "/sprites/purchases/Eyes-glasses/Eyes2%20128x128px.png" },
  { id: "eyes3", name: "Eyes 3", category: "eyes", image: "/sprites/purchases/Eyes-glasses/Eyes3%20128x128px.png" },
  { id: "monocle", name: "Monocle", category: "eyes", image: "/sprites/purchases/Eyes-glasses/Monocle%20128x128px.png" },
  { id: "cig", name: "Cig", category: "mouth", image: "/sprites/purchases/Beard-mouth/Cig%20128x128px.png" },
  { id: "clownnose", name: "Clown Nose", category: "mouth", image: "/sprites/purchases/Beard-mouth/Clown%20nose%20128x128px.png" },
  { id: "crookedteeth", name: "Crooked Teeth", category: "mouth", image: "/sprites/purchases/Beard-mouth/Crooked%20teeth%20128x128px.png" },
  { id: "mustache", name: "Mustache", category: "mouth", image: "/sprites/purchases/Beard-mouth/Mustache%20128x128px.png" },
  { id: "tongue", name: "Tongue", category: "mouth", image: "/sprites/purchases/Beard-mouth/Tongue%20128x128px.png" },
  { id: "yellow", name: "Yellow Body", category: "body", image: "/sprites/purchases/Body/Yellow%20128x128px.png" },
  { id: "turquoise", name: "Turquoise Body", category: "body", image: "/sprites/purchases/Body/Turquoise%20128x128px.png" },
  { id: "purple", name: "Purple Body", category: "body", image: "/sprites/purchases/Body/Purple%20128x128px.png" },
];

const AVATAR_RUN_IN_DURATION_MS = 850;
const AVATAR_START_OFFSET_X = -430;
const AVATAR_END_OFFSET_X = 0;
const DEFAULT_EYES_ITEM_ID = "eyes1";

function getOwnedKey(userId) {
  return `jim_owned_${userId}`;
}

function getEquippedKey(userId) {
  return `jim_equipped_${userId}`;
}

function loadOwned(userId) {
  try {
    const raw = localStorage.getItem(getOwnedKey(userId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function loadEquipped(userId) {
  try {
    const raw = localStorage.getItem(getEquippedKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      hat: parsed?.hat || null,
      eyes: parsed?.eyes || DEFAULT_EYES_ITEM_ID,
      mouth: parsed?.mouth || null,
      body: parsed?.body || null,
    };
  } catch {
    return { hat: null, eyes: DEFAULT_EYES_ITEM_ID, mouth: null, body: null };
  }
}

function saveEquipped(userId, equipped) {
  localStorage.setItem(getEquippedKey(userId), JSON.stringify(equipped));
}

function saveOwned(userId, ownedSet) {
  localStorage.setItem(getOwnedKey(userId), JSON.stringify([...ownedSet]));
}

function extractOwnedFromAvatar(avatar) {
  const inventory = Array.isArray(avatar?.inventory) ? avatar.inventory : [];
  return new Set(
    inventory
      .map((entry) => entry?.item?.unlock_condition)
      .filter((id) => typeof id === "string" && id.trim() !== "")
  );
}

function normalizeEquipped(raw) {
  return {
    hat: typeof raw?.hat === "string" ? raw.hat : null,
    eyes: typeof raw?.eyes === "string" ? raw.eyes : DEFAULT_EYES_ITEM_ID,
    mouth: typeof raw?.mouth === "string" ? raw.mouth : null,
    body: typeof raw?.body === "string" ? raw.body : null
  };
}

function hasAnyEquipped(equipped) {
  return Boolean(equipped?.hat || equipped?.eyes || equipped?.mouth || equipped?.body);
}

export default function ClosetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, token } = useAuth();
  const swipeDirection = location.state?.swipeDirection;
  const returnHomeSide =
    location.state?.homeEntrySide ||
    (swipeDirection === "left" ? "right" : swipeDirection === "right" ? "left" : "right");
  const [activeCategory, setActiveCategory] = useState("hat");
  const [equipped, setEquipped] = useState(() => loadEquipped(userId));
  const [ownedIds, setOwnedIds] = useState(() => loadOwned(userId));
  const [avatarPhase, setAvatarPhase] = useState("runIn");
  const [avatarOffsetX, setAvatarOffsetX] = useState(AVATAR_START_OFFSET_X);
  const [avatarFrame, setAvatarFrame] = useState(0);
  const timeoutRef = useRef(null);

  const avatarAnimation = useMemo(
    () =>
      avatarPhase === "runIn"
        ? { row: 1, startFrame: 0, endFrame: 7, fps: 12 }
        : { row: 0, startFrame: 0, endFrame: 4, fps: 8 },
    [avatarPhase],
  );

  useEffect(() => {
    setAvatarPhase("runIn");
    setAvatarOffsetX(AVATAR_START_OFFSET_X);
    timeoutRef.current = window.setTimeout(() => {
      setAvatarOffsetX(AVATAR_END_OFFSET_X);
    }, 20);
    const idleTimer = window.setTimeout(() => {
      setAvatarPhase("idle");
    }, AVATAR_RUN_IN_DURATION_MS + 30);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      window.clearTimeout(idleTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const localOwned = loadOwned(userId);
    apiGetAvatar(token)
      .then((avatar) => {
        if (cancelled) return;
        const backendOwned = extractOwnedFromAvatar(avatar);
        const merged = new Set([...localOwned, ...backendOwned]);
        saveOwned(userId, merged);
        setOwnedIds(merged);
      })
      .catch(() => {
        if (!cancelled) {
          setOwnedIds(localOwned);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  useEffect(() => {
    let cancelled = false;
    const localEquipped = normalizeEquipped(loadEquipped(userId));
    apiGetEquippedAvatar(token, userId)
      .then((data) => {
        if (cancelled) {
          return;
        }
        const backendEquipped = normalizeEquipped(data?.equipped || {});
        if (!hasAnyEquipped(backendEquipped) && hasAnyEquipped(localEquipped)) {
          setEquipped(localEquipped);
          saveEquipped(userId, localEquipped);
          apiSaveEquippedAvatar(token, localEquipped).catch(() => {});
          return;
        }
        setEquipped(backendEquipped);
        saveEquipped(userId, backendEquipped);
      })
      .catch(() => {
        if (!cancelled) {
          setEquipped(localEquipped);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  useEffect(() => {
    const { startFrame, endFrame, fps } = avatarAnimation;
    const frameDurationMs = Math.max(40, Math.round(1000 / fps));
    let frameCursor = startFrame;
    let previousTickMs = performance.now();
    let animationFrameId = 0;

    setAvatarFrame(startFrame);

    const tick = (currentTickMs) => {
      if (currentTickMs - previousTickMs >= frameDurationMs) {
        frameCursor = frameCursor >= endFrame ? startFrame : frameCursor + 1;
        setAvatarFrame(frameCursor);
        previousTickMs = currentTickMs;
      }
      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [avatarAnimation]);

  const ownedItems = useMemo(
    () => SHOP_ITEMS.filter((item) => ownedIds.has(item.id)),
    [ownedIds],
  );

  const visibleItems = useMemo(
    () => ownedItems.filter((item) => item.category === activeCategory),
    [activeCategory, ownedItems],
  );

  const equippedItems = useMemo(
    () => ({
      body: SHOP_ITEMS.find((item) => item.id === equipped.body) || null,
      hat: SHOP_ITEMS.find((item) => item.id === equipped.hat) || null,
      eyes: SHOP_ITEMS.find((item) => item.id === equipped.eyes) || null,
      mouth: SHOP_ITEMS.find((item) => item.id === equipped.mouth) || null,
    }),
    [equipped],
  );

  function handleEquip(item) {
    const next = { ...equipped, [item.category]: item.id };
    setEquipped(next);
    saveEquipped(userId, next);
    apiSaveEquippedAvatar(token, next).catch(() => {});
  }

  function handleUnequip(categoryId) {
    const next = {
      ...equipped,
      [categoryId]: categoryId === "eyes" ? DEFAULT_EYES_ITEM_ID : null
    };
    setEquipped(next);
    saveEquipped(userId, next);
    apiSaveEquippedAvatar(token, next).catch(() => {});
  }

  return (
    <div className="retro-page retro-section retro-closet-page">
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
        <p className="retro-brand retro-brand--home">JIM</p>
        <button
          type="button"
          className="retro-btn retro-btn--ghost retro-btn--small"
          onClick={() => navigate("/home", { state: { homeEntrySide: returnHomeSide } })}
        >
          Back
        </button>
      </div>

      <div className="retro-closet-shell">
        <div className="retro-closet-header">
          <h1 className="retro-title">Closet</h1>
        </div>
        <div className="retro-closet-avatar-stage" aria-label="Avatar preview">
          <div
            className={`retro-closet-avatar-wrap ${
              avatarPhase === "runIn" ? "retro-closet-avatar-wrap--runin" : "retro-closet-avatar-wrap--idle"
            }`}
            style={{ transform: `translateX(${avatarOffsetX}px)` }}
          >
            <div className="retro-closet-avatar-layer">
              <SpriteAnimator
                src="/sprites/meepo.png"
                frameWidth={128}
                frameHeight={128}
                row={avatarAnimation.row}
                frame={avatarFrame}
                className="retro-closet-avatar-base"
              />
              {equippedItems.body ? (
                <SpriteAnimator
                  src={equippedItems.body.image}
                  frameWidth={128}
                  frameHeight={128}
                  row={avatarAnimation.row}
                  frame={avatarFrame}
                  className="retro-closet-avatar-overlay"
                />
              ) : null}

              {equippedItems.eyes ? (
                <SpriteAnimator
                  src={equippedItems.eyes.image}
                  frameWidth={128}
                  frameHeight={128}
                  row={avatarAnimation.row}
                  frame={avatarFrame}
                  className="retro-closet-avatar-overlay"
                />
              ) : null}
              {equippedItems.hat ? (
                <SpriteAnimator
                  src={equippedItems.hat.image}
                  frameWidth={128}
                  frameHeight={128}
                  row={avatarAnimation.row}
                  frame={avatarFrame}
                  className="retro-closet-avatar-overlay"
                />
              ) : null}
              {equippedItems.mouth ? (
                <SpriteAnimator
                  src={equippedItems.mouth.image}
                  frameWidth={128}
                  frameHeight={128}
                  row={avatarAnimation.row}
                  frame={avatarFrame}
                  className="retro-closet-avatar-overlay"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="retro-closet-items-panel">
          <div className="retro-mode-toggle retro-closet-tabs">
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

          {visibleItems.length === 0 ? (
            <div className="retro-banner">No owned items in this category yet.</div>
          ) : (
            <div className="retro-closet-grid">
              {visibleItems.map((item) => {
                const isEquipped = equipped[item.category] === item.id;
                return (
                  <div key={item.id} className={`retro-shop-card${isEquipped ? " retro-shop-card--owned" : ""}`}>
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
                    <div className="retro-actions">
                      {isEquipped ? (
                        <button
                          type="button"
                          className="retro-btn retro-btn--ghost retro-btn--small"
                          onClick={() => handleUnequip(item.category)}
                        >
                          Unequip
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="retro-btn retro-btn--primary retro-btn--small"
                          onClick={() => handleEquip(item)}
                        >
                          Equip
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
