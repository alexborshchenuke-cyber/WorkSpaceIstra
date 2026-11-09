/* Каталог аудиторий, страница переговорки и модальное окно бронирования */

/* --- Каталог: рендер карточек и фильтры --- */
function renderRoomsGrid() {
  const grid = document.getElementById("rooms-grid");
  if (!grid) return;

  const capacityLimit = Number(document.getElementById("filter-capacity").value);
  const priceLimit = Number(document.getElementById("filter-price").value);
  const needTv = document.getElementById("filter-tv").checked;
  const needSound = document.getElementById("filter-sound").checked;

  const filtered = ROOMS.filter((room) => {
    if (capacityLimit && room.capacity > capacityLimit) return false;
    if (priceLimit && room.price > priceLimit) return false;
    if (needTv && !room.equipment.some((e) => /ТВ|проектор/i.test(e))) return false;
    if (needSound && !room.equipment.some((e) => /звукоизоляц/i.test(e))) return false;
    return true;
  });

  grid.innerHTML = filtered.map(roomCardHtml).join("");
  document.getElementById("rooms-empty").classList.toggle("d-none", filtered.length > 0);
}

/* --- Страница переговорки: рендер по ?id= --- */
function renderRoomDetail() {
  const container = document.getElementById("room-detail");
  if (!container) return;

  const id = Number(new URLSearchParams(location.search).get("id"));
  const room = ROOMS.find((r) => r.id === id);

  if (!room) {
    document.getElementById("breadcrumb-room").textContent = "Не найдена";
    container.innerHTML = `
      <div class="alert alert-warning" role="alert">
        <h2 class="h5">Такой переговорки нет</h2>
        <p class="mb-2">Возможно, ссылка устарела. Посмотрите актуальный список аудиторий.</p>
        <a class="btn btn-primary" href="rooms.html">Перейти в каталог</a>
      </div>`;
    return;
  }

  document.title = `${room.name} — переговорка WorkSpace`;
  document.getElementById("breadcrumb-room").textContent = room.name;

  const equipmentItems = room.equipment.map((item) => `<li class="mb-2">✔ ${item}</li>`).join("");

  container.innerHTML = `
    <div class="row g-5">
      <div class="col-12 col-lg-7">
        <div class="room-gallery">
          <img src="${room.image}" class="img-fluid rounded-4 shadow w-100" alt="${room.alt}"
               style="aspect-ratio: 16/10; object-fit: cover;">
        </div>
      </div>
      <div class="col-12 col-lg-5">
        <h1 class="section-title mb-3">${room.name}</h1>
        <p class="text-muted">${room.description}</p>

        <ul class="room-specs list-unstyled my-4">
          <li><span class="text-muted">Площадь</span><strong>${room.area} м²</strong></li>
          <li><span class="text-muted">Вместимость</span><strong>до ${room.capacity} человек</strong></li>
          <li><span class="text-muted">Стоимость</span><strong class="price">${formatPrice(room.price)}/час</strong></li>
        </ul>

        <h2 class="h5">Оснащение</h2>
        <ul class="list-unstyled text-muted mb-4">${equipmentItems}</ul>

        <button type="button" class="btn btn-primary btn-lg w-100" data-book-room="${room.id}">
          Забронировать за ${formatPrice(room.price)}/час
        </button>
        <p class="text-muted small text-center mt-2 mb-0">Отмена бесплатно за 3 часа до начала</p>
      </div>
    </div>`;
}

/* --- Модальное окно бронирования --- */
function initBookingModal() {
  const modalEl = document.getElementById("bookingModal");
  const form = document.getElementById("booking-form");
  if (!modalEl || !form) return;

  const modal = new bootstrap.Modal(modalEl);
  const dateInput = document.getElementById("booking-date");
  const durationInput = document.getElementById("booking-duration");

  // Дата не раньше сегодняшнего дня
  dateInput.min = new Date().toISOString().split("T")[0];

  // Открытие модалки по клику на любую кнопку «Забронировать»
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-book-room]");
    if (!button) return;

    const room = ROOMS.find((r) => r.id === Number(button.dataset.bookRoom));
    if (!room) return;

    document.getElementById("booking-room-id").value = String(room.id);
    document.getElementById("booking-room-name").textContent =
      `Переговорка «${room.name}» — ${formatPrice(room.price)}/час`;
    modalEl.dataset.price = String(room.price);

    // Подставляем имя и телефон из профиля, если пользователь вошёл
    const user = getCurrentUser();
    if (user) {
      document.getElementById("booking-name").value = user.name || "";
      document.getElementById("booking-phone").value = user.phone || "";
    }

    updateTotal();
    form.classList.remove("was-validated");
    modal.show();
  });

  // Пересчёт итоговой стоимости
  function updateTotal() {
    const price = Number(modalEl.dataset.price || 0);
    const hours = Number(durationInput.value || 0);
    document.getElementById("booking-total").textContent =
      hours ? formatPrice(price * hours) : "—";
  }
  durationInput.addEventListener("change", updateTotal);

  // Отправка формы: валидация и сохранение
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const today = new Date().toISOString().split("T")[0];
    const dateValid = dateInput.value && dateInput.value >= today;
    dateInput.setCustomValidity(dateValid ? "" : "invalid");

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const room = ROOMS.find((r) => r.id === Number(document.getElementById("booking-room-id").value));
    const user = getCurrentUser();
    const bookings = getBookings();

    const booking = {
      id: Date.now(),
      roomId: room.id,
      roomName: room.name,
      date: dateInput.value,
      time: document.getElementById("booking-time").value,
      duration: Number(durationInput.value),
      total: Number(modalEl.dataset.price) * Number(durationInput.value),
      name: document.getElementById("booking-name").value.trim(),
      phone: "+7 " + document.getElementById("booking-phone").value.trim(),
      userEmail: user ? user.email : null,
      createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    wsWrite(WS_KEYS.bookings, bookings);

    modal.hide();
    form.reset();
    form.classList.remove("was-validated");
    updateTotal();

    showToast(
      `«${booking.roomName}» забронирована на ${formatDateRu(booking.date)}, ${booking.time}. Итого ${formatPrice(booking.total)}.`
    );
  });

  // Сброс кастомной валидации даты при изменении
  dateInput.addEventListener("input", () => dateInput.setCustomValidity(""));
}

document.addEventListener("DOMContentLoaded", () => {
  renderRoomsGrid();
  renderRoomDetail();
  initBookingModal();

  const filterForm = document.getElementById("rooms-filter");
  if (filterForm) {
    filterForm.addEventListener("change", renderRoomsGrid);
  }
});
