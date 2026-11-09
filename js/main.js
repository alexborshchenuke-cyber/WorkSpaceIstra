/* Общие функции сайта WorkSpace: хранилище, уведомления, рендер лендинга */

/* --- Хранилище (localStorage вместо бэкенда) --- */
const WS_KEYS = {
  users: "ws_users",
  session: "ws_session",
  bookings: "ws_bookings",
  favorites: "ws_favorites",
  recentRooms: "ws_recent_rooms"
};

function wsRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function wsWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentUser() {
  const email = wsRead(WS_KEYS.session, null);
  if (!email) return null;
  const users = wsRead(WS_KEYS.users, []);
  return users.find((u) => u.email === email) || null;
}

function getBookings() {
  return wsRead(WS_KEYS.bookings, []);
}

function getUserRoomIds(key, user = getCurrentUser()) {
  if (!user) return [];
  const saved = wsRead(key, {});
  const ids = Array.isArray(saved[user.email]) ? saved[user.email] : [];
  return ids.filter((id, index) => Number.isInteger(id) && ids.indexOf(id) === index && ROOMS.some((room) => room.id === id));
}

function saveUserRoomIds(key, ids, user = getCurrentUser()) {
  if (!user) return;
  const saved = wsRead(key, {});
  saved[user.email] = ids;
  wsWrite(key, saved);
}

function getFavorites(user = getCurrentUser()) {
  return getUserRoomIds(WS_KEYS.favorites, user);
}

function getRecentRooms(user = getCurrentUser()) {
  return getUserRoomIds(WS_KEYS.recentRooms, user);
}

function recordRoomView(roomId) {
  const user = getCurrentUser();
  if (!user) return;
  const recent = getRecentRooms(user).filter((id) => id !== roomId);
  recent.unshift(roomId);
  saveUserRoomIds(WS_KEYS.recentRooms, recent.slice(0, 4), user);
}

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function formatDateRu(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric"
  });
}

/* --- Toast-уведомления --- */
function showToast(message, variant = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${variant} border-0`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body"></div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Закрыть"></button>
    </div>`;
  toast.querySelector(".toast-body").textContent = message;
  container.appendChild(toast);
  const instance = new bootstrap.Toast(toast, { delay: 4000 });
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
  instance.show();
}

/* --- Избранные переговорки --- */
function favoriteButtonHtml(room) {
  const active = getFavorites().includes(room.id);
  const label = active ? `Удалить «${room.name}» из избранного` : `Добавить «${room.name}» в избранное`;
  return `
    <button type="button" class="favorite-btn${active ? " is-active" : ""}" data-favorite-room="${room.id}"
            aria-pressed="${active}" aria-label="${label}" title="${label}">
      <svg viewBox="0 0 24 24" fill="${active ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>
      </svg>
    </button>`;
}

function updateFavoriteButtons(roomId) {
  const favorites = getFavorites();
  document.querySelectorAll(`[data-favorite-room="${roomId}"]`).forEach((button) => {
    const room = ROOMS.find((item) => item.id === roomId);
    const active = favorites.includes(roomId);
    const label = active ? `Удалить «${room.name}» из избранного` : `Добавить «${room.name}» в избранное`;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", label);
    button.title = label;
    button.querySelector("svg").setAttribute("fill", active ? "currentColor" : "none");
  });
}

/* --- Карточка переговорки (используется на лендинге и в каталоге) --- */
function roomCardHtml(room, options = {}) {
  return `
    <div class="col-12 col-md-6 col-lg-4">
      <article class="card h-100">
        <div class="card-media position-relative">
          <img src="${room.image}" class="card-img-top" alt="${room.alt}">
          ${favoriteButtonHtml(room)}
        </div>
        <div class="card-body d-flex flex-column">
          <h3 class="card-title h5"><a href="room.html?id=${room.id}">${room.name}</a></h3>
          <p class="card-text text-muted small flex-grow-1">${room.short}</p>
          <p class="mb-3">
            <span class="badge text-bg-light">${room.area} м²</span>
            <span class="badge text-bg-light">до ${room.capacity} чел.</span>
          </p>
          <p class="price mb-3">${formatPrice(room.price)}<small class="text-muted fw-normal">/час</small></p>
          <div class="d-flex flex-wrap gap-2 mt-auto">
            ${options.compare ? `<button type="button" class="btn btn-outline-secondary btn-sm" data-compare-room="${room.id}" aria-pressed="false">Сравнить</button>` : ""}
            <a class="btn btn-outline-primary btn-sm" href="room.html?id=${room.id}">Подробнее</a>
            <button type="button" class="btn btn-primary btn-sm" data-book-room="${room.id}">Забронировать</button>
          </div>
        </div>
      </article>
    </div>`;
}

/* --- Карточка тарифа на лендинге --- */
function tariffCardHtml(tariff) {
  const features = tariff.features.map((feature) => `<li>${feature}</li>`).join("");
  return `
    <div class="col-12 col-md-6 col-xl-3">
      <article class="card pricing-card pricing-card--${tariff.theme}${tariff.featured ? " featured" : ""} h-100">
        ${tariff.featured ? '<span class="badge pricing-popular">Выбирают чаще</span>' : ""}
        <div class="pricing-media">
          <img src="${tariff.image}" class="card-img-top" alt="${tariff.alt}" loading="lazy">
          <span class="pricing-label">${tariff.label}</span>
        </div>
        <div class="card-body d-flex flex-column">
          <h3 class="h4 mb-2">${tariff.name}</h3>
          <p class="pricing-description text-muted small">${tariff.description}</p>
          <p class="pricing-value mb-0">${tariff.pricePrefix}${formatPrice(tariff.price)}</p>
          <p class="text-muted small mb-4">${tariff.period}</p>
          <ul class="pricing-features list-unstyled text-muted flex-grow-1">${features}</ul>
          <a class="btn ${tariff.featured ? "btn-primary" : "btn-outline-primary"} w-100" href="${tariff.href}">${tariff.action}</a>
        </div>
      </article>
    </div>`;
}

/* --- Инициализация общих элементов --- */
document.addEventListener("DOMContentLoaded", () => {
  // Текущий год в футере
  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const scrollTopButton = document.createElement("button");
  scrollTopButton.type = "button";
  scrollTopButton.className = "scroll-top-btn";
  scrollTopButton.setAttribute("aria-label", "Наверх");
  scrollTopButton.title = "Наверх";
  scrollTopButton.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true">
      <path d="m6 15 6-6 6 6"/>
    </svg>`;
  document.body.appendChild(scrollTopButton);

  const updateScrollTopButton = () => {
    scrollTopButton.classList.toggle("is-visible", window.scrollY > 300);
  };
  window.addEventListener("scroll", updateScrollTopButton, { passive: true });
  updateScrollTopButton();
  scrollTopButton.addEventListener("click", () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-favorite-room]");
    if (!button) return;

    const user = getCurrentUser();
    if (!user) {
      showToast("Войдите или зарегистрируйтесь, чтобы сохранять избранные переговорки.", "warning");
      return;
    }

    const roomId = Number(button.dataset.favoriteRoom);
    const favorites = getFavorites(user);
    const active = favorites.includes(roomId);
    const updated = active ? favorites.filter((id) => id !== roomId) : [...favorites, roomId];
    saveUserRoomIds(WS_KEYS.favorites, updated, user);
    updateFavoriteButtons(roomId);
    document.dispatchEvent(new CustomEvent("ws:favorites-changed"));

    const room = ROOMS.find((item) => item.id === roomId);
    showToast(active ? `«${room.name}» удалена из избранного.` : `«${room.name}» добавлена в избранное.`);
  });

  // Если пользователь вошёл — показываем имя в кнопке профиля
  const profileLink = document.getElementById("nav-profile-link");
  const user = getCurrentUser();
  if (profileLink && user) {
    profileLink.textContent = user.name;
    profileLink.classList.remove("btn-outline-primary");
    profileLink.classList.add("btn-primary");
  }

  // Лендинг: популярные переговорки (первые 3)
  const popular = document.getElementById("popular-rooms");
  if (popular) {
    popular.innerHTML = ROOMS.slice(0, 3).map((room) => roomCardHtml(room)).join("");
  }

  // Лендинг: тарифы
  const tariffsGrid = document.getElementById("tariffs-grid");
  if (tariffsGrid) {
    tariffsGrid.innerHTML = TARIFFS.map(tariffCardHtml).join("");
  }

  // Лендинг: карусель отзывов
  const reviewsInner = document.getElementById("reviews-inner");
  const reviewsIndicators = document.getElementById("reviews-indicators");
  if (reviewsInner && reviewsIndicators) {
    reviewsInner.innerHTML = REVIEWS.map((review, i) => `
      <div class="carousel-item${i === 0 ? " active" : ""}">
        <figure class="text-center px-3 px-md-5 pb-5">
          <blockquote class="blockquote">
            <p class="fs-5">«${review.text}»</p>
          </blockquote>
          <figcaption class="blockquote-footer mb-0">
            <span class="avatar-circle me-2" aria-hidden="true">${review.name[0]}</span>
            <strong>${review.name}</strong>, ${review.role}
          </figcaption>
        </figure>
      </div>`).join("");
    reviewsIndicators.innerHTML = REVIEWS.map((_, i) => `
      <button type="button" data-bs-target="#reviewsCarousel" data-bs-slide-to="${i}"
              ${i === 0 ? 'class="active" aria-current="true"' : ""}
              aria-label="Отзыв ${i + 1}"></button>`).join("");
  }
});
