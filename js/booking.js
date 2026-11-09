/* Каталог аудиторий, сравнение, страница переговорки и модальное окно бронирования */

const comparedRoomIds = new Set();

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

  grid.innerHTML = filtered.map((room) => roomCardHtml(room, { compare: true })).join("");
  document.getElementById("rooms-empty").classList.toggle("d-none", filtered.length > 0);
  updateCompareUI();
}

/* --- Сравнение переговорок --- */
function updateCompareUI() {
  const openButton = document.getElementById("compare-open");
  if (!openButton) return;

  openButton.disabled = comparedRoomIds.size < 2;
  openButton.textContent = `Сравнить выбранные (${comparedRoomIds.size}/3)`;

  document.querySelectorAll("[data-compare-room]").forEach((button) => {
    const selected = comparedRoomIds.has(Number(button.dataset.compareRoom));
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("btn-primary", selected);
    button.classList.toggle("btn-outline-secondary", !selected);
    button.textContent = selected ? "Выбрано" : "Сравнить";
  });
}

function renderComparison() {
  const container = document.getElementById("comparison-content");
  if (!container) return;

  const rooms = ROOMS.filter((room) => comparedRoomIds.has(room.id));
  container.innerHTML = `
    <div class="table-responsive">
      <table class="table align-middle comparison-table">
        <thead>
          <tr>
            <th scope="col">Характеристика</th>
            ${rooms.map((room) => `
              <th scope="col">
                <img src="${room.image}" alt="" class="comparison-table__image">
                <span class="d-block h5 mb-2">${room.name}</span>
                <button type="button" class="btn btn-sm btn-outline-secondary" data-remove-compare="${room.id}" aria-label="Убрать «${room.name}» из сравнения">Убрать</button>
              </th>`).join("")}
          </tr>
        </thead>
        <tbody>
          <tr><th scope="row">Цена за час</th>${rooms.map((room) => `<td class="price">${formatPrice(room.price)}</td>`).join("")}</tr>
          <tr><th scope="row">Площадь</th>${rooms.map((room) => `<td>${room.area} м²</td>`).join("")}</tr>
          <tr><th scope="row">Вместимость</th>${rooms.map((room) => `<td>до ${room.capacity} человек</td>`).join("")}</tr>
          <tr>
            <th scope="row">Оснащение</th>
            ${rooms.map((room) => `<td><ul class="small mb-0 ps-3">${room.equipment.map((item) => `<li>${item}</li>`).join("")}</ul></td>`).join("")}
          </tr>
        </tbody>
      </table>
    </div>
    ${rooms.length < 2 ? '<p class="text-muted mb-0 mt-3">Выберите ещё хотя бы одну переговорку в каталоге.</p>' : ""}`;
}

function initComparison() {
  const modalEl = document.getElementById("comparisonModal");
  const openButton = document.getElementById("compare-open");
  if (!modalEl || !openButton) return;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  document.addEventListener("click", (event) => {
    const compareButton = event.target.closest("[data-compare-room]");
    if (compareButton) {
      const roomId = Number(compareButton.dataset.compareRoom);
      if (comparedRoomIds.has(roomId)) {
        comparedRoomIds.delete(roomId);
      } else if (comparedRoomIds.size >= 3) {
        showToast("Можно сравнить не более трёх переговорок.", "warning");
        return;
      } else {
        comparedRoomIds.add(roomId);
      }
      updateCompareUI();
      return;
    }

    const removeButton = event.target.closest("[data-remove-compare]");
    if (removeButton) {
      comparedRoomIds.delete(Number(removeButton.dataset.removeCompare));
      updateCompareUI();
      renderComparison();
    }
  });

  openButton.addEventListener("click", () => {
    if (comparedRoomIds.size < 2) return;
    renderComparison();
    modal.show();
  });

  document.getElementById("compare-clear").addEventListener("click", () => {
    comparedRoomIds.clear();
    updateCompareUI();
    modal.hide();
  });
}

/* --- Недавно просмотренные помещения --- */
function renderRecentRooms() {
  const section = document.getElementById("recent-rooms-section");
  const grid = document.getElementById("recent-rooms-grid");
  if (!section || !grid) return;

  const rooms = getRecentRooms().map((id) => ROOMS.find((room) => room.id === id)).filter(Boolean);
  section.classList.toggle("d-none", rooms.length === 0);
  grid.innerHTML = rooms.map((room) => roomCardHtml(room)).join("");
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
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <h1 class="section-title mb-0">${room.name}</h1>
          ${favoriteButtonHtml(room)}
        </div>
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

  recordRoomView(room.id);
}

/* --- Модальное окно бронирования --- */
function initBookingModal() {
  const modalEl = document.getElementById("bookingModal");
  const form = document.getElementById("booking-form");
  if (!modalEl || !form) return;

  const modal = new bootstrap.Modal(modalEl);
  const dateInput = document.getElementById("booking-date");
  const durationInput = document.getElementById("booking-duration");
  const serviceInputs = [...form.querySelectorAll("[data-booking-service]")];

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

  function getServicesTotal() {
    return serviceInputs.reduce((total, input) => total + (input.checked ? Number(input.value) : 0), 0);
  }

  // Пересчёт аренды, дополнительных услуг и итоговой стоимости
  function updateTotal() {
    const price = Number(modalEl.dataset.price || 0);
    const hours = Number(durationInput.value || 0);
    const rentTotal = price * hours;
    const servicesTotal = getServicesTotal();
    document.getElementById("booking-total").textContent = hours ? formatPrice(rentTotal + servicesTotal) : "—";
    document.getElementById("booking-total-details").textContent = hours
      ? `Аренда: ${formatPrice(rentTotal)} · Дополнительные услуги: ${formatPrice(servicesTotal)}`
      : "Выберите длительность, чтобы рассчитать стоимость.";
  }
  durationInput.addEventListener("change", updateTotal);
  serviceInputs.forEach((input) => input.addEventListener("change", updateTotal));

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
    const services = serviceInputs.filter((input) => input.checked).map((input) => ({
      name: input.dataset.name,
      price: Number(input.value)
    }));
    const hours = Number(durationInput.value);
    const servicesTotal = services.reduce((total, service) => total + service.price, 0);

    const booking = {
      id: Date.now(),
      roomId: room.id,
      roomName: room.name,
      date: dateInput.value,
      time: document.getElementById("booking-time").value,
      duration: hours,
      services,
      servicesTotal,
      total: Number(modalEl.dataset.price) * hours + servicesTotal,
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
  renderRecentRooms();
  initComparison();
  initBookingModal();

  const filterForm = document.getElementById("rooms-filter");
  if (filterForm) {
    filterForm.addEventListener("change", renderRoomsGrid);
  }
});
