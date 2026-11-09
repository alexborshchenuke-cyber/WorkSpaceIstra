/* Профиль клиента: регистрация, вход, редактирование данных, мои бронирования */

function validateForm(form) {
  form.classList.add("was-validated");
  return form.checkValidity();
}

function showFormError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("d-none", !message);
}

/* --- Переключение блоков «авторизация» / «профиль» --- */
function renderProfilePage() {
  const user = getCurrentUser();
  document.body.classList.toggle("profile-authorized", Boolean(user));
  document.getElementById("auth-block").classList.toggle("d-none", Boolean(user));
  document.getElementById("profile-block").classList.toggle("d-none", !user);

  if (!user) return;

  // Данные профиля
  document.getElementById("profile-avatar").textContent = user.name[0].toUpperCase();
  document.getElementById("profile-name-view").textContent = user.name;
  document.getElementById("profile-email-view").textContent = user.email;
  document.getElementById("profile-phone-view").textContent = "+7 " + user.phone;
  document.getElementById("profile-name").value = user.name;
  document.getElementById("profile-email").value = user.email;
  document.getElementById("profile-phone").value = user.phone;

  renderBookings(user);
}

/* --- Список бронирований пользователя --- */
function renderBookings(user) {
  const list = document.getElementById("bookings-list");
  const empty = document.getElementById("bookings-empty");
  const counter = document.getElementById("bookings-count");

  const myBookings = getBookings()
    .filter((b) => b.userEmail === user.email || (!b.userEmail && b.phone === "+7 " + user.phone))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  counter.textContent = String(myBookings.length);
  empty.classList.toggle("d-none", myBookings.length > 0);

  const today = new Date().toISOString().split("T")[0];

  list.innerHTML = myBookings.map((b) => {
    const isPast = b.date < today;
    const date = new Date(`${b.date}T00:00:00`);
    const day = date.toLocaleDateString("ru-RU", { day: "2-digit" });
    const month = date.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
    return `
      <article class="booking-item${isPast ? " booking-item--past" : ""}">
        <div class="booking-date" aria-hidden="true">
          <strong>${day}</strong>
          <span>${month}</span>
        </div>
        <div>
          <div class="booking-item__heading">
            <h3>«${b.roomName}»</h3>
            <span class="profile-status ${isPast ? "profile-status--past" : "profile-status--active"}">${isPast ? "Завершена" : "Предстоит"}</span>
          </div>
          <p class="booking-item__meta">
            <span>${formatDateRu(b.date)}</span>
            <span>${b.time} · ${b.duration} ч</span>
          </p>
        </div>
        <div class="booking-item__aside">
          <strong class="booking-item__price">${formatPrice(b.total)}</strong>
          ${isPast ? "" : `<button type="button" class="btn btn-outline-danger booking-cancel-btn" data-cancel-booking="${b.id}">Отменить</button>`}
        </div>
      </article>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  renderProfilePage();

  /* --- Вход --- */
  const loginForm = document.getElementById("login-form");
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showFormError("login-error", "");
    if (!validateForm(loginForm)) return;

    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;
    const users = wsRead(WS_KEYS.users, []);
    const user = users.find((u) => u.email === email);

    if (!user || user.password !== password) {
      showFormError("login-error", "Неверный email или пароль. Если аккаунта нет — зарегистрируйтесь.");
      return;
    }

    wsWrite(WS_KEYS.session, email);
    loginForm.reset();
    loginForm.classList.remove("was-validated");
    renderProfilePage();
    showToast(`С возвращением, ${user.name}!`);
  });

  /* --- Регистрация --- */
  const registerForm = document.getElementById("register-form");
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showFormError("register-error", "");
    if (!validateForm(registerForm)) return;

    const email = document.getElementById("register-email").value.trim().toLowerCase();
    const users = wsRead(WS_KEYS.users, []);

    if (users.some((u) => u.email === email)) {
      showFormError("register-error", "Аккаунт с таким email уже существует — попробуйте войти.");
      return;
    }

    const user = {
      name: document.getElementById("register-name").value.trim(),
      email,
      phone: document.getElementById("register-phone").value.trim(),
      password: document.getElementById("register-password").value
    };

    users.push(user);
    wsWrite(WS_KEYS.users, users);
    wsWrite(WS_KEYS.session, email);

    registerForm.reset();
    registerForm.classList.remove("was-validated");
    renderProfilePage();
    showToast(`Добро пожаловать в WorkSpace, ${user.name}!`);
  });

  /* --- Выход --- */
  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem(WS_KEYS.session);
    renderProfilePage();
    showToast("Вы вышли из профиля.", "secondary");
  });

  /* --- Редактирование профиля --- */
  const profileForm = document.getElementById("profile-form");
  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateForm(profileForm)) return;

    const user = getCurrentUser();
    if (!user) return;

    const users = wsRead(WS_KEYS.users, []);
    const index = users.findIndex((u) => u.email === user.email);
    users[index].name = document.getElementById("profile-name").value.trim();
    users[index].phone = document.getElementById("profile-phone").value.trim();
    // Email — ключ аккаунта, меняем вместе с сессией
    const newEmail = document.getElementById("profile-email").value.trim().toLowerCase();
    if (newEmail !== user.email && users.some((u) => u.email === newEmail)) {
      showToast("Этот email уже занят другим аккаунтом.", "danger");
      return;
    }
    users[index].email = newEmail;
    wsWrite(WS_KEYS.users, users);
    wsWrite(WS_KEYS.session, newEmail);

    renderProfilePage();
    showToast("Данные профиля обновлены.");
  });

  /* --- Навигация по разделам профиля --- */
  document.querySelectorAll(".profile-nav__link").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".profile-nav__link").forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
    });
  });

  /* --- Отмена бронирования --- */
  const cancelModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("cancel-booking-modal"));
  const confirmCancelButton = document.getElementById("confirm-cancel-booking");

  document.getElementById("bookings-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-cancel-booking]");
    if (!button) return;

    const id = Number(button.dataset.cancelBooking);
    const booking = getBookings().find((b) => b.id === id);
    if (!booking) return;

    confirmCancelButton.dataset.bookingId = String(id);
    document.getElementById("cancel-booking-name").textContent = `«${booking.roomName}»`;
    document.getElementById("cancel-booking-details").textContent =
      `${formatDateRu(booking.date)}, ${booking.time} · ${booking.duration} ч · ${formatPrice(booking.total)}`;
    cancelModal.show();
  });

  confirmCancelButton.addEventListener("click", () => {
    const id = Number(confirmCancelButton.dataset.bookingId);
    if (!id) return;

    const bookings = getBookings().filter((b) => b.id !== id);
    wsWrite(WS_KEYS.bookings, bookings);
    delete confirmCancelButton.dataset.bookingId;
    cancelModal.hide();

    const user = getCurrentUser();
    if (user) renderBookings(user);
    showToast("Бронирование отменено.", "secondary");
  });
});
