/* =====================================================
   TR MOTORS — ADMIN DASHBOARD
   Customer data is served only to accounts with role "admin".
===================================================== */

const state = {
  user: null,
  users: [],
  searchTimer: null,
  openUserId: null,
};

const els = {
  gate: document.getElementById("gate"),
  gateTitle: document.getElementById("gateTitle"),
  gateText: document.getElementById("gateText"),
  gateAction: document.getElementById("gateAction"),
  dashboard: document.getElementById("dashboard"),
  who: document.getElementById("who"),
  whoAvatar: document.getElementById("whoAvatar"),
  whoEmail: document.getElementById("whoEmail"),
  signOutBtn: document.getElementById("signOutBtn"),
  statUsers: document.getElementById("statUsers"),
  statOrders: document.getElementById("statOrders"),
  statPending: document.getElementById("statPending"),
  statBookings: document.getElementById("statBookings"),
  userRows: document.getElementById("userRows"),
  usersEmpty: document.getElementById("usersEmpty"),
  userCount: document.getElementById("userCount"),
  search: document.getElementById("search"),
  refreshBtn: document.getElementById("refreshBtn"),
  drawer: document.getElementById("drawer"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  drawerName: document.getElementById("drawerName"),
  drawerEmail: document.getElementById("drawerEmail"),
  drawerBody: document.getElementById("drawerBody"),
  drawerClose: document.getElementById("drawerClose"),
};

const SLOT_LABELS = {
  morning: "9am – 12pm",
  afternoon: "12pm – 4pm",
  evening: "4pm – 7pm",
};

const PAYMENT_LABELS = {
  full: "Full payment",
  loan: "Bank loan",
  exchange: "Exchange",
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function api(path) {
  const response = await fetch(path, { credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Something went wrong.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function formatDate(value) {
  if (!value) return "—";

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
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

/* -----------------------------------------------------
   ACCESS GATE
----------------------------------------------------- */

function showGate(title, text, { signIn = false } = {}) {
  els.dashboard.hidden = true;
  els.gate.hidden = false;
  els.gateTitle.textContent = title;
  els.gateText.textContent = text;

  if (signIn) {
    els.gateAction.textContent = "Sign in";
    els.gateAction.href = "/?signin=1";
    els.gateAction.hidden = false;
  }
}

/* -----------------------------------------------------
   SUMMARY + CUSTOMER LIST
----------------------------------------------------- */

async function loadSummary() {
  const { summary } = await api("/api/admin/summary");

  els.statUsers.textContent = summary.users;
  els.statOrders.textContent = summary.orders;
  els.statPending.textContent = summary.pendingOrders;
  els.statBookings.textContent = summary.bookings;
}

async function loadUsers(query = "") {
  const search = new URLSearchParams();
  if (query) search.set("q", query);

  const { users } = await api(`/api/admin/users?${search}`);
  state.users = users;

  els.userCount.textContent = `${users.length} ${users.length === 1 ? "customer" : "customers"}`;
  renderUsers(users);
}

function renderUsers(users) {
  els.userRows.replaceChildren();
  els.usersEmpty.hidden = users.length > 0;

  users.forEach((user) => {
    const row = document.createElement("tr");

    const person = document.createElement("td");
    person.appendChild(el("span", "cell-name", user.name));
    if (user.role === "admin") {
      person.appendChild(el("span", "role-pill", "Admin"));
    }

    const email = el("td", "", user.email);
    const joined = el("td", "", formatDate(user.createdAt));
    const lastLogin = el("td", "", formatDate(user.lastLoginAt));

    const orders = el("td", "count", String(user.orders));
    if (!user.orders) orders.classList.add("zero");

    const drives = el("td", "count", String(user.bookings));
    if (!user.bookings) drives.classList.add("zero");

    const action = document.createElement("td");
    const view = el("button", "view-btn", "View");
    view.type = "button";
    view.addEventListener("click", () => openUser(user.id));
    action.appendChild(view);

    row.append(person, email, joined, lastLogin, orders, drives, action);
    els.userRows.appendChild(row);
  });
}

/* -----------------------------------------------------
   CUSTOMER DETAIL DRAWER
----------------------------------------------------- */

function openDrawer() {
  els.drawer.hidden = false;
  els.drawerBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  els.drawer.hidden = true;
  els.drawerBackdrop.hidden = true;
  document.body.style.overflow = "";
  state.openUserId = null;
}

async function openUser(id) {
  state.openUserId = id;

  els.drawerName.textContent = "Loading…";
  els.drawerEmail.textContent = "";
  els.drawerBody.replaceChildren(el("p", "drawer-loading", "Loading customer details…"));

  openDrawer();

  try {
    const data = await api(`/api/admin/users/${id}`);
    if (state.openUserId !== id) return;
    renderUserDetail(data);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      closeDrawer();
      location.href = "/?signin=1";
      return;
    }

    els.drawerBody.replaceChildren(
      el("p", "drawer-loading", "Could not load this customer. Try again.")
    );
  }
}

function detailCard(headLeft, status, lines) {
  const card = document.createElement("div");
  card.className = "detail-card";

  const head = document.createElement("div");
  head.className = "detail-card-head";
  head.appendChild(headLeft);
  if (status) head.appendChild(el("span", "status", status));
  card.appendChild(head);

  lines.forEach((line) => card.appendChild(el("p", "", line)));
  return card;
}

function renderUserDetail({ user, orders, bookings }) {
  els.drawerName.textContent = user.name;
  els.drawerEmail.textContent = user.email;
  els.drawerBody.replaceChildren();

  const meta = document.createElement("div");
  meta.className = "drawer-meta";

  [
    ["Role", user.role === "admin" ? "Administrator" : "Customer"],
    ["Joined", formatDate(user.createdAt)],
    ["Last login", formatDate(user.lastLoginAt)],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.appendChild(el("span", "", label));
    item.appendChild(el("strong", "", value));
    meta.appendChild(item);
  });

  els.drawerBody.appendChild(meta);

  const orderSection = document.createElement("section");
  orderSection.className = "detail-section";
  orderSection.appendChild(el("h3", "", `Car bookings · ${orders.length}`));

  if (!orders.length) {
    orderSection.appendChild(el("p", "detail-empty", "No car bookings yet."));
  }

  orders.forEach((order) => {
    const lines = [
      `${order.reference} · ${formatINR(order.car.price)} · ${order.phone}`,
    ];

    if (order.delivery.method === "home") {
      const address = [
        order.delivery.address1,
        order.delivery.address2,
        `${order.delivery.city}, ${order.delivery.state} ${order.delivery.pincode}`,
      ]
        .filter(Boolean)
        .join(", ");
      lines.push(`Deliver to: ${address}`);
    } else {
      lines.push("Showroom pickup at TR Motors, Guntur");
    }

    lines.push(
      `${formatDate(order.delivery.date)} · ${SLOT_LABELS[order.delivery.slot]} · ${PAYMENT_LABELS[order.payment]}`
    );

    if (order.notes) lines.push(`Note: ${order.notes}`);

    orderSection.appendChild(detailCard(el("h4", "", order.car.name), order.status, lines));
  });

  els.drawerBody.appendChild(orderSection);

  const driveSection = document.createElement("section");
  driveSection.className = "detail-section";
  driveSection.appendChild(el("h3", "", `Test drives · ${bookings.length}`));

  if (!bookings.length) {
    driveSection.appendChild(el("p", "detail-empty", "No test drives booked."));
  }

  bookings.forEach((booking) => {
    driveSection.appendChild(
      detailCard(el("h4", "", booking.car), booking.status, [
        `${booking.phone} · requested ${formatDate(booking.createdAt)}`,
      ])
    );
  });

  els.drawerBody.appendChild(driveSection);
}

/* -----------------------------------------------------
   BOOT
----------------------------------------------------- */

async function signOut() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } finally {
    location.href = "/";
  }
}

function bind() {
  els.signOutBtn.addEventListener("click", signOut);

  els.refreshBtn.addEventListener("click", () => {
    loadSummary().catch(() => {});
    loadUsers(els.search.value).catch(() => {});
  });

  els.search.addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => {
      loadUsers(els.search.value.trim()).catch(() => {});
    }, 280);
  });

  els.drawerClose.addEventListener("click", closeDrawer);
  els.drawerBackdrop.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.openUserId) closeDrawer();
  });
}

async function boot() {
  bind();

  let data;
  try {
    data = await api("/api/auth/me");
  } catch {
    data = { user: null };
  }

  state.user = data.user;

  if (!state.user) {
    showGate(
      "Sign in required",
      "Only TR Motors staff can open the customer dashboard.",
      { signIn: true }
    );
    return;
  }

  if (state.user.role !== "admin") {
    showGate(
      "Admin access only",
      "This account doesn't have staff access, so customer details are hidden."
    );
    return;
  }

  els.who.hidden = false;
  els.whoAvatar.textContent = state.user.name.trim().charAt(0) || "A";
  els.whoEmail.textContent = state.user.email;
  els.dashboard.hidden = false;

  try {
    await Promise.all([loadSummary(), loadUsers()]);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      showGate(
        "Admin access only",
        "This account doesn't have staff access, so customer details are hidden.",
        { signIn: true }
      );
      return;
    }

    els.userCount.textContent = "Could not load customers — try refreshing.";
  }
}

boot();
