

function inquiryTopic(rawTopic) {
  const topic = rawTopic ? rawTopic.replace(/^\?subject=/, "") : "";
  if (!topic) return "Общий вопрос в WorkSpace";
  try {
    return decodeURIComponent(topic.replace(/\+/g, " "));
  } catch {
    return topic;
  }
}

function initInquiryForm() {
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal fade" id="inquiryModal" tabindex="-1" aria-labelledby="inquiryModalLabel"
         aria-describedby="inquiry-demo-note" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title h5" id="inquiryModalLabel">Заявка в WorkSpace</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
          </div>
          <form id="inquiry-form" novalidate>
            <div class="modal-body">
              <div class="alert alert-light border small" id="inquiry-demo-note" role="note">
                Демонстрационная форма: после отправки данные не сохраняются и никуда не передаются.
              </div>

              <div class="inquiry-topic mb-3">
                <span class="d-block text-muted small mb-1">Тема заявки</span>
                <strong id="inquiry-topic-text"></strong>
                <input type="hidden" id="inquiry-topic" name="topic">
              </div>

              <div class="mb-3">
                <label class="form-label" for="inquiry-name">Ваше имя</label>
                <input type="text" class="form-control" id="inquiry-name" name="name"
                       minlength="2" maxlength="80" autocomplete="name" required>
                <div class="invalid-feedback">Введите имя — от 2 до 80 символов.</div>
              </div>

              <div class="mb-3">
                <label class="form-label" for="inquiry-phone">Телефон</label>
                <div class="input-group">
                  <span class="input-group-text">+7</span>
                  <input type="tel" class="form-control" id="inquiry-phone" name="phone"
                         placeholder="(999) 123-45-67" pattern="(?=(?:\D*\d){10}\D*$)[\d\s()\-]{10,16}"
                         inputmode="tel" autocomplete="tel" aria-describedby="inquiry-phone-hint" required>
                  <div class="invalid-feedback">Введите 10 цифр, например (999) 123-45-67.</div>
                </div>
                <div class="form-text" id="inquiry-phone-hint">Номер без кода страны, только 10 цифр.</div>
              </div>

              <div class="mb-3">
                <label class="form-label" for="inquiry-email">Email</label>
                <input type="email" class="form-control" id="inquiry-email" name="email"
                       maxlength="120" autocomplete="email" required>
                <div class="invalid-feedback">Введите корректный email.</div>
              </div>

              <div class="mb-3">
                <label class="form-label" for="inquiry-comment">Комментарий <span class="text-muted fw-normal">(необязательно)</span></label>
                <textarea class="form-control" id="inquiry-comment" name="comment" rows="3"
                          maxlength="1000" placeholder="Дата, число гостей или пожелания к офису"></textarea>
                <div class="invalid-feedback">Комментарий не должен превышать 1000 символов.</div>
              </div>

              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="inquiry-agreement" required>
                <label class="form-check-label small" for="inquiry-agreement">
                  Согласен с условиями демонстрационной формы и понимаю, что данные не отправляются
                </label>
                <div class="invalid-feedback">Подтвердите согласие, чтобы продолжить.</div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Отмена</button>
              <button type="submit" class="btn btn-primary">Отправить заявку</button>
            </div>
          </form>
        </div>
      </div>
    </div>`);

  const modalEl = document.getElementById("inquiryModal");
  const modal = new bootstrap.Modal(modalEl);
  const form = document.getElementById("inquiry-form");
  const nameInput = document.getElementById("inquiry-name");

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-inquiry-open]");
    if (!trigger) return;
    event.preventDefault();

    const topic = inquiryTopic(trigger.dataset.inquiryTopic);
    document.getElementById("inquiry-topic-text").textContent = topic;
    document.getElementById("inquiry-topic").value = topic;

    form.reset();
    form.classList.remove("was-validated");

    const user = getCurrentUser();
    if (user) {
      nameInput.value = user.name || "";
      document.getElementById("inquiry-phone").value = user.phone || "";
      document.getElementById("inquiry-email").value = user.email || "";
    }

    modal.show();
  });

  modalEl.addEventListener("shown.bs.modal", () => nameInput.focus());
  modalEl.addEventListener("hidden.bs.modal", () => {
    form.reset();
    form.classList.remove("was-validated");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      const invalidField = form.querySelector(":invalid");
      if (invalidField) invalidField.focus();
      return;
    }

    modal.hide();
    showToast("Заявка принята в демонстрационном режиме. Данные никуда не отправляются.");
  });
}

document.addEventListener("DOMContentLoaded", initInquiryForm);
