/* =====================================================
   TR MOTORS — ACCOUNT / AUTHENTICATION
   Talks to the Express + MongoDB backend on the same origin.
===================================================== */

const state = {
  user: null,
  authTab: "signin",
  lastFocus: null,
  pendingCar: null,
  orderCar: null,
};

const els = {
  authSlot: document.getElementById("authSlot"),
  authModal: document.getElementById("authModal"),
  authTitle: document.getElementById("authTitle"),
  authSub: document.getElementById("authSub"),
  authTabs: Array.from(document.querySelectorAll(".auth-tab, .link-btn[data-auth-tab]")),
  signinForm: document.getElementById("signinForm"),
  signupForm: document.getElementById("signupForm"),
  signinError: document.getElementById("signinError"),
  signupError: document.getElementById("signupError"),
  bookingsModal: document.getElementById("bookingsModal"),
  bookingsSub: document.getElementById("bookingsSub"),
  bookingList: document.getElementById("bookingList"),
  toastStack: document.getElementById("toastStack"),
  testDriveForm: document.getElementById("testDriveForm"),
  testDriveName: document.getElementById("testDriveName"),
  testDrivePhone: document.getElementById("testDrivePhone"),
  testDriveCar: document.getElementById("testDriveCar"),
  testDriveMessage: document.getElementById("testDriveMessage"),
  testDriveSubmit: document.getElementById("testDriveSubmit"),
  orderModal: document.getElementById("orderModal"),
  orderFormWrap: document.getElementById("orderFormWrap"),
  orderForm: document.getElementById("orderForm"),
  orderAddress: document.getElementById("orderAddress"),
  orderCarName: document.getElementById("orderCarName"),
  orderCarPrice: document.getElementById("orderCarPrice"),
  orderError: document.getElementById("orderError"),
  orderSubmit: document.getElementById("orderSubmit"),
  orderSuccess: document.getElementById("orderSuccess"),
  orderSuccessText: document.getElementById("orderSuccessText"),
  orderRef: document.getElementById("orderRef"),
  ordersModal: document.getElementById("ordersModal"),
  ordersSub: document.getElementById("ordersSub"),
  orderList: document.getElementById("orderList"),
};

/* -----------------------------------------------------
   HELPERS
----------------------------------------------------- */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Something went wrong. Try again.");
    error.field = data.field;
    error.status = response.status;
    throw error;
  }

  return data;
}

function toast(message, kind = "info") {
  const node = el("div", `toast is-${kind}`, message);
  els.toastStack.appendChild(node);

  setTimeout(() => {
    node.classList.add("is-leaving");
    setTimeout(() => node.remove(), 320);
  }, 3600);
}

function formatDate(value) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const SLOT_LABELS = {
  morning: "9am – 12pm",
  afternoon: "12pm – 4pm",
  evening: "4pm – 7pm",
};

function setBusy(button, busy, label) {
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label || "Please wait…";
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

/* -----------------------------------------------------
   MODALS
----------------------------------------------------- */

function openModal(modal) {
  state.lastFocus = document.activeElement;
  document.body.style.overflow = "hidden";
  modal.hidden = false;

  const target = modal.querySelector("input:not([type=hidden]), button");
  if (target) setTimeout(() => target.focus(), 60);
}

function closeModal(modal) {
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.style.overflow = "";

  if (modal === els.authModal && !state.user) {
    state.pendingCar = null;
  }

  if (state.lastFocus && document.contains(state.lastFocus)) {
    state.lastFocus.focus();
  }
}

function setAuthTab(tab) {
  state.authTab = tab === "signup" ? "signup" : "signin";

  els.authTabs.forEach((button) => {
    if (button.classList.contains("auth-tab")) {
      button.classList.toggle("is-active", button.dataset.authTab === state.authTab);
    }
  });

  const isSignup = state.authTab === "signup";
  els.signinForm.hidden = isSignup;
  els.signupForm.hidden = !isSignup;
  els.authTitle.textContent = isSignup ? "Join TR Motors." : "Welcome back.";
  els.authSub.textContent = isSignup
    ? "Create an account to book test drives and track your enquiries."
    : "Sign in to manage your test drives and enquiries.";

  const form = isSignup ? els.signupForm : els.signinForm;
  const input = form.querySelector("input");
  if (!els.authModal.hidden && input) input.focus();
}

/* -----------------------------------------------------
   NAVBAR ACCOUNT STATE
----------------------------------------------------- */

function renderAuthSlot() {
  els.authSlot.replaceChildren();

  if (!state.user) {
    const button = el("button", "auth-trigger", "Sign In");
    button.type = "button";
    button.dataset.authOpen = "signin";
    els.authSlot.appendChild(button);
    return;
  }

  const wrap = el("div", "account");

  const trigger = el("button", "account-trigger");
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");

  trigger.appendChild(el("span", "avatar", state.user.name.trim().charAt(0) || "U"));
  trigger.appendChild(el("span", "account-name", state.user.name.split(" ")[0]));
  trigger.appendChild(el("span", "account-chevron", "▾"));

  const dropdown = el("div", "account-dropdown");
  dropdown.hidden = true;
  dropdown.appendChild(el("div", "account-email", state.user.email));

  const bookingsButton = el("button", "", "My Test Drives");
  bookingsButton.type = "button";
  bookingsButton.dataset.action = "bookings";

  const ordersButton = el("button", "", "My Orders");
  ordersButton.type = "button";
  ordersButton.dataset.action = "orders";

  const signOutButton = el("button", "sign-out", "Sign Out");
  signOutButton.type = "button";
  signOutButton.dataset.action = "signout";

  dropdown.append(bookingsButton, ordersButton);

  if (state.user.role === "admin") {
    const adminLink = el("a", "admin-link", "Admin Panel");
    adminLink.href = "/admin";
    dropdown.appendChild(adminLink);
  }

  dropdown.appendChild(signOutButton);

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = dropdown.hidden;
    dropdown.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", String(willOpen));
  });

  dropdown.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    dropdown.hidden = true;
    trigger.setAttribute("aria-expanded", "false");

    if (button.dataset.action === "bookings") openBookings();
    if (button.dataset.action === "orders") openOrders();
    if (button.dataset.action === "signout") signOut();
  });

  wrap.append(trigger, dropdown);
  els.authSlot.appendChild(wrap);
}

function applyUser(user) {
  state.user = user;
  renderAuthSlot();
  prefillTestDrive();
}

function prefillTestDrive() {
  if (state.user && !els.testDriveName.value.trim()) {
    els.testDriveName.value = state.user.name;
  }
}

/* -----------------------------------------------------
   AUTH ACTIONS
----------------------------------------------------- */

async function handleAuthSubmit(event, mode) {
  event.preventDefault();

  const form = mode === "signup" ? els.signupForm : els.signinForm;
  const errorBox = mode === "signup" ? els.signupError : els.signinError;
  const submit = form.querySelector(".auth-submit");
  const fields = new FormData(form);

  const payload = {
    email: String(fields.get("email") || "").trim(),
    password: String(fields.get("password") || ""),
  };
  if (mode === "signup") {
    payload.name = String(fields.get("name") || "").trim();
  }

  errorBox.textContent = "";

  if (!payload.email || !payload.password || (mode === "signup" && !payload.name)) {
    errorBox.textContent = "Please fill in every field.";
    return;
  }
  if (mode === "signup" && payload.password.length < 8) {
    errorBox.textContent = "Password must be at least 8 characters.";
    return;
  }

  setBusy(submit, true);

  try {
    const data = await api(`/api/auth/${mode === "signup" ? "register" : "login"}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    applyUser(data.user);
    form.reset();
    closeModal(els.authModal);
    toast(
      mode === "signup"
        ? `Welcome to TR Motors, ${data.user.name.split(" ")[0]}.`
        : `Welcome back, ${data.user.name.split(" ")[0]}.`,
      "success"
    );

    if (state.pendingCar) {
      const car = state.pendingCar;
      state.pendingCar = null;
      openOrder(car);
    }
  } catch (error) {
    errorBox.textContent = error.message;

    if (error.field) {
      const input = form.querySelector(`[name="${error.field}"]`);
      if (input) input.focus();
    }
  } finally {
    setBusy(submit, false);
  }
}

async function signOut() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    /* the local session is cleared either way */
  }

  applyUser(null);
  toast("You have been signed out.");
}

async function openBookings() {
  if (!state.user) return;

  els.bookingsSub.textContent = `Signed in as ${state.user.email}`;
  els.bookingList.replaceChildren(el("p", "booking-empty", "Loading your test drives…"));
  openModal(els.bookingsModal);

  try {
    const data = await api("/api/bookings/mine");
    renderBookings(data.bookings);
  } catch (error) {
    if (error.status === 401) {
      closeModal(els.bookingsModal);
      applyUser(null);
      openModal(els.authModal);
      setAuthTab("signin");
      return;
    }

    els.bookingList.replaceChildren(
      el("p", "booking-empty", "We could not load your test drives. Please try again.")
    );
  }
}

function renderBookings(bookings) {
  els.bookingList.replaceChildren();

  if (!bookings.length) {
    const empty = el("p", "booking-empty");
    empty.append("No test drives booked yet. ");
    const link = el("a", "", "Book your first drive");
    link.href = "#test-drive";
    link.addEventListener("click", () => closeModal(els.bookingsModal));
    empty.appendChild(link);
    els.bookingList.appendChild(empty);
    return;
  }

  bookings.forEach((booking) => {
    const item = el("div", "booking-item");
    const info = el("div");
    info.appendChild(el("h4", "", booking.car));
    info.appendChild(
      el("p", "", `${formatDate(booking.createdAt)} • ${booking.phone}`)
    );

    item.appendChild(info);
    item.appendChild(el("span", "booking-status", booking.status));
    els.bookingList.appendChild(item);
  });
}

/* -----------------------------------------------------
   CAR BOOKING & DELIVERY
----------------------------------------------------- */

function setDeliveryMethod(method) {
  els.orderAddress.hidden = method === "showroom";
}

function openOrder(car) {
  if (!state.user) {
    state.pendingCar = car;
    setAuthTab("signin");
    openModal(els.authModal);
    toast("Sign in to book your car.", "info");
    return;
  }

  state.orderCar = car;
  state.pendingCar = null;

  const form = els.orderForm;
  form.reset();

  els.orderFormWrap.hidden = false;
  els.orderSuccess.hidden = true;
  els.orderError.textContent = "";
  els.orderCarName.textContent = car.name;
  els.orderCarPrice.textContent = car.price;

  form.elements.name.value = state.user.name;
  form.elements.email.value = state.user.email;

  const earliest = new Date();
  earliest.setDate(earliest.getDate() + 1);

  const suggested = new Date();
  suggested.setDate(suggested.getDate() + 3);

  form.elements.date.min = dateInputValue(earliest);
  form.elements.date.value = dateInputValue(suggested);

  setDeliveryMethod("home");
  openModal(els.orderModal);
}

async function handleOrderSubmit(event) {
  event.preventDefault();
  if (!state.orderCar) return;

  const form = els.orderForm;
  const data = new FormData(form);
  const method = data.get("method") === "showroom" ? "showroom" : "home";

  const payload = {
    car: state.orderCar.name,
    customer: {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
    },
    delivery: {
      method,
      address1: String(data.get("address1") || "").trim(),
      address2: String(data.get("address2") || "").trim(),
      city: String(data.get("city") || "").trim(),
      state: String(data.get("state") || "").trim(),
      pincode: String(data.get("pincode") || "").trim(),
      date: String(data.get("date") || ""),
      slot: String(data.get("slot") || "afternoon"),
    },
    payment: String(data.get("payment") || "full"),
    notes: String(data.get("notes") || "").trim(),
  };

  els.orderError.textContent = "";

  const problems = [];
  if (payload.customer.name.length < 2) {
    problems.push(["name", "Enter your full name."]);
  }
  if (!payload.customer.phone) {
    problems.push(["phone", "Enter your phone number."]);
  }
  if (method === "home") {
    if (payload.delivery.address1.length < 5) {
      problems.push(["address1", "Enter the delivery address."]);
    }
    if (!payload.delivery.city) {
      problems.push(["city", "Enter the delivery city."]);
    }
    if (!/^\d{6}$/.test(payload.delivery.pincode)) {
      problems.push(["pincode", "Enter a valid 6-digit PIN code."]);
    }
  }
  if (!payload.delivery.date) {
    problems.push(["date", "Choose a delivery date."]);
  }

  if (problems.length) {
    const [field, message] = problems[0];
    els.orderError.textContent = message;
    form.elements[field]?.focus();
    return;
  }

  setBusy(els.orderSubmit, true, "Booking…");

  try {
    const { order } = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showOrderSuccess(order);
  } catch (error) {
    els.orderError.textContent = error.message;
    if (error.field) form.elements[error.field]?.focus();
  } finally {
    setBusy(els.orderSubmit, false);
  }
}

function showOrderSuccess(order) {
  const where =
    order.delivery.method === "home"
      ? `delivery to ${order.delivery.city}`
      : "showroom pickup at TR Motors, Guntur";

  els.orderSuccessText.textContent =
    `${order.car.name} is reserved — ${where} on ` +
    `${formatDate(order.delivery.date)}, ${SLOT_LABELS[order.delivery.slot]}. ` +
    "Our team will call you to confirm.";

  els.orderRef.textContent = order.reference;
  els.orderFormWrap.hidden = true;
  els.orderSuccess.hidden = false;

  toast("Car booking confirmed.", "success");
}

async function openOrders() {
  if (!state.user) return;

  els.ordersSub.textContent = `Signed in as ${state.user.email}`;
  els.orderList.replaceChildren(el("p", "booking-empty", "Loading your orders…"));
  openModal(els.ordersModal);

  try {
    const { orders } = await api("/api/orders/mine");
    renderOrders(orders);
  } catch (error) {
    if (error.status === 401) {
      closeModal(els.ordersModal);
      applyUser(null);
      setAuthTab("signin");
      openModal(els.authModal);
      return;
    }

    els.orderList.replaceChildren(
      el("p", "booking-empty", "We could not load your orders. Please try again.")
    );
  }
}

function renderOrders(orders) {
  els.orderList.replaceChildren();

  if (!orders.length) {
    const empty = el("p", "booking-empty");
    empty.append("No car bookings yet. ");
    const link = el("a", "", "Explore the collection");
    link.href = "#cars";
    link.addEventListener("click", () => closeModal(els.ordersModal));
    empty.appendChild(link);
    els.orderList.appendChild(empty);
    return;
  }

  orders.forEach((order) => {
    const item = el("div", "booking-item order-item");
    const meta = el("div", "order-meta");

    meta.appendChild(el("h4", "", order.car.name));
    meta.appendChild(
      el("span", "order-ref", `${order.reference} · ${formatINR(order.car.price)}`)
    );

    const place =
      order.delivery.method === "home"
        ? `${order.delivery.city} ${order.delivery.pincode}`.trim()
        : "Showroom pickup, Guntur";

    meta.appendChild(
      el(
        "span",
        "",
        `${formatDate(order.delivery.date)} · ${SLOT_LABELS[order.delivery.slot]} · ${place}`
      )
    );

    item.appendChild(meta);
    item.appendChild(el("span", "booking-status", order.status));
    els.orderList.appendChild(item);
  });
}

/* -----------------------------------------------------
   TEST DRIVE BOOKING
----------------------------------------------------- */

async function handleTestDrive(event) {
  event.preventDefault();

  const payload = {
    name: els.testDriveName.value.trim(),
    phone: els.testDrivePhone.value.trim(),
    car: els.testDriveCar.value,
  };

  els.testDriveMessage.className = "form-message";

  if (!payload.name || !payload.phone || !payload.car) {
    els.testDriveMessage.textContent = "Please add your name, phone number and select a car.";
    els.testDriveMessage.classList.add("is-visible", "is-error");
    return;
  }

  setBusy(els.testDriveSubmit, true, "Booking…");

  try {
    await api("/api/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    els.testDriveForm.reset();
    prefillTestDrive();

    els.testDriveMessage.textContent = `Thanks ${payload.name.split(" ")[0]}! Your ${payload.car} test drive request is in — our team will call you shortly.`;
    els.testDriveMessage.classList.add("is-visible", "is-success");
    toast("Test drive request received.", "success");
  } catch (error) {
    els.testDriveMessage.textContent = error.message;
    els.testDriveMessage.classList.add("is-visible", "is-error");

    if (error.field) {
      const input = els.testDriveForm.querySelector(`[name="${error.field}"]`);
      if (input) input.focus();
    }
  } finally {
    setBusy(els.testDriveSubmit, false);
  }
}

/* -----------------------------------------------------
   EVENT WIRING
----------------------------------------------------- */

function bindEvents() {
  els.authSlot.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-auth-open]");
    if (!trigger) return;
    setAuthTab(trigger.dataset.authOpen);
    openModal(els.authModal);
  });

  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => setAuthTab(button.dataset.authTab));
  });

  document.querySelectorAll("[data-modal-close]").forEach((node) => {
    node.addEventListener("click", () => closeModal(node.closest(".modal")));
  });

  els.signinForm.addEventListener("submit", (event) => handleAuthSubmit(event, "signin"));
  els.signupForm.addEventListener("submit", (event) => handleAuthSubmit(event, "signup"));
  els.testDriveForm.addEventListener("submit", handleTestDrive);
  els.orderForm.addEventListener("submit", handleOrderSubmit);

  els.orderForm.addEventListener("change", (event) => {
    if (event.target.name === "method") {
      setDeliveryMethod(event.target.value);
    }
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".car-book-btn");
    if (!button) return;

    openOrder({
      name: button.dataset.car,
      price: button.dataset.price,
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".account")) {
      document.querySelectorAll(".account-dropdown").forEach((menu) => {
        menu.hidden = true;
        const trigger = menu.parentElement?.querySelector(".account-trigger");
        trigger?.setAttribute("aria-expanded", "false");
      });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const open = document.querySelector(".modal:not([hidden])");
    if (open) closeModal(open);
  });
}

async function init() {
  bindEvents();

  const params = new URLSearchParams(window.location.search);
  if (params.get("signin") === "1") {
    params.delete("signin");
    const query = params.toString();
    history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);

    setAuthTab("signin");
    openModal(els.authModal);
  }

  try {
    const data = await api("/api/auth/me");
    applyUser(data.user);
  } catch {
    applyUser(null);
  }
}

init();
