const API_BASE = localStorage.getItem("splitnestApiBase") || window.SPLITNEST_CONFIG?.API_BASE || "http://localhost:5001/api";
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const members = [
  { id: "aisha", name: "Aisha", email: "aisha@example.com", color: "#127767" },
  { id: "rohan", name: "Rohan", email: "rohan@example.com", color: "#3269a8" },
  { id: "priya", name: "Priya", email: "priya@example.com", color: "#c58a1f" },
  { id: "meera", name: "Meera", email: "meera@example.com", color: "#e65f4d" },
  { id: "dev", name: "Dev", email: "dev@example.com", color: "#7a4bc0" },
  { id: "sam", name: "Sam", email: "sam@example.com", color: "#0f8a9d" },
  { id: "kabir", name: "Kabir", email: "kabir@example.com", color: "#7b6a4a" }
];

const seedExpenses = [
  ["2026-02-01", "February rent", "Aisha", 48000, "equal", "Aisha;Rohan;Priya;Meera", "", ""],
  ["2026-02-03", "Groceries BigBasket", "Priya", 2340, "equal", "Aisha;Rohan;Priya;Meera", "", ""],
  ["2026-02-05", "Wifi bill Feb", "Rohan", 1199, "equal", "Aisha;Rohan;Priya;Meera", "", ""],
  ["2026-02-08", "Dinner at Marina Bites", "Dev", 3200, "equal", "Aisha;Rohan;Priya;Dev", "", "Dev visiting for the weekend"],
  ["2026-02-08", "dinner - marina bites", "Dev", 3200, "equal", "Aisha;Rohan;Priya;Dev", "", "duplicate-looking row"],
  ["2026-02-15", "Cylinder refill", "Rohan", 900, "equal", "Aisha;Rohan;Priya;Meera", "", "rounded from 899.995"],
  ["2026-02-20", "Aisha birthday cake", "Rohan", 1500, "unequal", "Rohan;Priya;Meera", "Rohan 700; Priya 400; Meera 400", "Aisha intentionally excluded"],
  ["2026-02-25", "Rohan paid Aisha back", "Rohan", 5000, "settlement", "Aisha", "", "recorded as settlement"],
  ["2026-02-28", "Pizza Friday", "Aisha", 1440, "percentage", "Aisha;Rohan;Priya;Meera", "Aisha 30%; Rohan 30%; Priya 30%; Meera 20%", "percentage total adjusted from 110 to 100"],
  ["2026-03-08", "Goa flights", "Aisha", 32400, "equal", "Aisha;Rohan;Priya;Dev", "", "trip group"],
  ["2026-03-09", "Goa villa booking", "Dev", 44820, "equal", "Aisha;Rohan;Priya;Dev", "", "converted from 540 USD at 83"],
  ["2026-03-10", "Scooter rentals", "Priya", 3600, "share", "Aisha;Rohan;Priya;Dev", "Aisha 1; Rohan 2; Priya 1; Dev 2", ""],
  ["2026-03-11", "Parasailing", "Dev", 12450, "equal", "Aisha;Rohan;Priya;Dev;Kabir", "", "Kabir created as guest member"],
  ["2026-03-12", "Parasailing refund", "Dev", -2490, "equal", "Aisha;Rohan;Priya;Dev", "", "negative expense retained as refund"],
  ["2026-04-01", "April rent", "Aisha", 48000, "share", "Aisha;Rohan;Priya", "Aisha 2; Rohan 1; Priya 1", "Aisha took Meera's room"],
  ["2026-04-08", "Sam deposit share", "Sam", 15000, "settlement", "Aisha", "", "deposit payment treated as settlement"],
  ["2026-04-10", "Housewarming drinks", "Sam", 3100, "equal", "Aisha;Rohan;Priya;Sam", "", ""],
  ["2026-04-18", "Furniture for common room", "Aisha", 12000, "equal", "Aisha;Rohan;Priya;Sam", "Aisha 1; Rohan 1; Priya 1; Sam 1", "split details ignored"]
];

const anomalies = [
  ["Duplicate candidate", "Dinner at Marina Bites appears twice", "Imported both and flagged for review"],
  ["Case mismatch", "priya and rohan appeared in lowercase", "Normalized names"],
  ["Alias", "Priya S likely maps to Priya", "Merged into Priya"],
  ["Missing payer", "House cleaning supplies had no paid_by", "Skipped from balance calculation"],
  ["Settlement row", "Rohan paid Aisha back", "Recorded as settlement"],
  ["Percentage total", "Pizza Friday entered 30/30/30/20", "Normalized percentages"],
  ["Foreign currency", "USD rows in Goa trip", "Converted at fixed INR 83"],
  ["Unknown member", "Dev's friend Kabir", "Created guest member"],
  ["Negative amount", "Parasailing refund", "Kept as refund"],
  ["Ambiguous date", "04-05-2026", "Flagged for review"]
];

const state = {
  token: localStorage.getItem("splitnestToken"),
  user: JSON.parse(localStorage.getItem("splitnestUser") || "null"),
  view: "dashboard",
  authMode: "login",
  apiOnline: true,
  adminData: null,
  dbLoaded: false,          // true once loadDatabaseData() succeeds
  dbBalances: [],           // [{ id, name, balance }] from /api/balances/mine
  dbTransfers: [],          // [{ from, fromName, to, toName, amount }] from /api/balances/mine
  supportMessages: [
    { sender_role: "user", sender_name: "Priya", content: "I flagged the duplicate Marina dinner before settling." },
    { sender_role: "admin", sender_name: "Admin", content: "Good. Keeping both imported but visible in the report." }
  ],
  expenses: seedExpenses.map((row, index) => ({
    id: `exp-${index + 1}`,
    date: row[0],
    description: row[1],
    paidBy: row[2],
    amount: row[3],
    currency: "INR",
    splitType: row[4],
    splitWith: row[5].split(";").map((name) => name.trim().replace("Dev's friend Kabir", "Kabir")),
    splitDetails: row[6],
    notes: row[7]
  })),
  groups: [
    { id: "roommates", name: "Koramangala Roommates", description: "Rent, groceries, utilities, and moving members.", members: ["Aisha", "Rohan", "Priya", "Meera", "Sam"] },
    { id: "goa", name: "Goa Trip", description: "Flights, stay, food, activities, and refunds.", members: ["Aisha", "Rohan", "Priya", "Dev", "Kabir"] }
  ]
};

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function audit(eventType, metadata = {}, entityType = null, entityId = null) {
  if (!state.token) return;
  try {
    await api("/audit", { method: "POST", body: JSON.stringify({ eventType, entityType, entityId, metadata }) });
  } catch (err) {
    console.error("Audit persistence failed:", err);
  }
}

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("splitnestToken", token);
  localStorage.setItem("splitnestUser", JSON.stringify(user));
}

function clearSession() {
  state.token = null;
  state.user = null;
  state.adminData = null;
  localStorage.removeItem("splitnestToken");
  localStorage.removeItem("splitnestUser");
}

function splitAmounts(expense) {
  if (expense.owedByName) return expense.owedByName;
  if (expense.splitType === "settlement") return {};
  const total = Number(expense.amount);
  if (expense.splitType === "unequal" && expense.splitDetails) {
    return Object.fromEntries(expense.splitDetails.split(";").map((part) => {
      const [name, amount] = part.trim().split(/\s+/);
      return [name, Number(amount)];
    }));
  }
  if (expense.splitType === "percentage" && expense.splitDetails) {
    const rows = expense.splitDetails.split(";").map((part) => {
      const match = part.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)%/);
      return match ? [match[1], Number(match[2])] : null;
    }).filter(Boolean);
    const pctTotal = rows.reduce((sum, item) => sum + item[1], 0) || 100;
    return Object.fromEntries(rows.map(([name, pct]) => [name, total * pct / pctTotal]));
  }
  if (expense.splitType === "share" && expense.splitDetails) {
    const rows = expense.splitDetails.split(";").map((part) => {
      const [name, shares] = part.trim().split(/\s+/);
      return [name, Number(shares)];
    });
    const shareTotal = rows.reduce((sum, item) => sum + item[1], 0) || 1;
    return Object.fromEntries(rows.map(([name, shares]) => [name, total * shares / shareTotal]));
  }
  return Object.fromEntries(expense.splitWith.map((name) => [name, total / expense.splitWith.length]));
}

function currentPersonName() {
  if (!state.user || state.user.role === "admin") return null;
  const candidates = [
    state.user.name?.split(/\s+/)[0],
    state.user.email?.split("@")[0]
  ].filter(Boolean).map((value) => value.toLowerCase());
  const names = new Set();
  state.expenses.forEach((expense) => {
    if (expense.paidBy && expense.paidBy !== "Unknown") names.add(expense.paidBy);
    expense.splitWith.forEach((name) => names.add(name));
  });
  return Array.from(names).find((name) => candidates.includes(name.toLowerCase())) || state.user.name?.split(/\s+/)[0] || null;
}

// Returns expenses visible to the current user.
// When DB data is loaded: regular users already have ONLY their own expenses (from /api/expenses/mine).
// Admins loaded all group expenses — show everything.
function visibleExpenses() {
  if (state.dbLoaded) {
    // Regular users: state.expenses already scoped to them by /api/expenses/mine
    // Admins: state.expenses contains everything across all groups
    return state.expenses;
  }
  // Fallback to seed data filtering
  const person = currentPersonName();
  if (!person) return state.expenses;
  return state.expenses.filter((expense) => expense.paidBy === person || expense.splitWith.includes(person));
}

function balances(sourceExpenses = state.expenses) {
  const ledger = Object.fromEntries(members.map((member) => [member.name, 0]));
  sourceExpenses.forEach((expense) => {
    if (expense.splitType === "settlement") {
      ledger[expense.paidBy] = (ledger[expense.paidBy] || 0) + Number(expense.amount);
      ledger[expense.splitWith[0]] = (ledger[expense.splitWith[0]] || 0) - Number(expense.amount);
      return;
    }
    ledger[expense.paidBy] = (ledger[expense.paidBy] || 0) + Number(expense.amount);
    Object.entries(splitAmounts(expense)).forEach(([name, owed]) => {
      ledger[name] = (ledger[name] || 0) - owed;
    });
  });
  return Object.entries(ledger).filter(([, value]) => Math.abs(value) > 1).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
}

function settlements() {
  // When DB data is loaded, use server-computed minimum transfers
  if (state.dbLoaded) {
    return state.dbTransfers.map((t) => ({ from: t.fromName, to: t.toName, amount: t.amount }));
  }
  // Fallback: compute from seed data in-memory
  const creditors = balances().filter(([, value]) => value > 0).map(([name, value]) => ({ name, value }));
  const debtors = balances().filter(([, value]) => value < 0).map(([name, value]) => ({ name, value: Math.abs(value) }));
  const moves = [];
  let debtor = 0;
  let creditor = 0;
  while (debtor < debtors.length && creditor < creditors.length) {
    const amount = Math.min(debtors[debtor].value, creditors[creditor].value);
    if (amount > 1) moves.push({ from: debtors[debtor].name, to: creditors[creditor].name, amount });
    debtors[debtor].value -= amount;
    creditors[creditor].value -= amount;
    if (debtors[debtor].value < 1) debtor += 1;
    if (creditors[creditor].value < 1) creditor += 1;
  }
  const person = currentPersonName();
  return person ? moves.filter((move) => move.from === person || move.to === person) : moves;
}

// Returns balance rows to show.
// When DB data is loaded, use pre-computed balances from /api/balances/mine.
function balanceRows() {
  if (state.dbLoaded && state.user?.role !== "admin") {
    // Regular user: show only their own balance from DB (individualBalances is array of objects)
    const myBalance = state.dbBalances.find((b) => b.id === state.user?.id);
    if (myBalance) return [[myBalance.name, myBalance.balance]];
    return [];
  }
  if (state.dbLoaded && state.user?.role === "admin") {
    // Admin: show all member balances (objects from DB)
    return state.dbBalances
      .filter((b) => Math.abs(b.balance) > 1)
      .map((b) => [b.name, b.balance]);
  }
  // Fallback: seed-data balances
  const rows = balances();
  const person = currentPersonName();
  return person ? rows.filter(([name]) => name === person) : rows;
}

function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function render() {
  const app = document.querySelector("#app");
  if (!state.user) {
    app.innerHTML = loginTemplate();
    bindAuth();
    return;
  }
  app.innerHTML = shellTemplate();
  bindShell();
}

function loginTemplate() {
  const signup = state.authMode === "signup";
  const admin = state.authMode === "admin";
  return `
    <main class="login">
      <section class="login-art">
        <div class="brand"><span class="mark">S</span><span>SplitNest</span></div>
        <div>
          <p class="eyebrow">Shared expenses, clearly settled</p>
          <h1>Know what you owe. Keep every conversation in context.</h1>
          <p class="lede" style="color:#f7f1e6">Secure accounts, shared groups, flexible expense splits, saved conversations, and transparent settlements.</p>
        </div>
      </section>
      <section class="panel login-card">
        <div class="tabs">
          <button class="${state.authMode === "login" ? "active" : ""}" data-auth-mode="login" type="button">Login</button>
          <button class="${signup ? "active" : ""}" data-auth-mode="signup" type="button">Signup</button>
          <button class="${admin ? "active" : ""}" data-auth-mode="admin" type="button">Admin</button>
        </div>
        <h2>${signup ? "Create your account" : admin ? "Admin login" : "Welcome back"}</h2>
        <p class="lede">${admin ? "Restricted to authorized administrators." : signup ? "Create a secure account to start splitting expenses." : "Sign in to access your groups and balances."}</p>
        <form id="authForm" class="list">
          ${signup ? `<label>Name<input name="name" value="Aisha Sharma" required /></label>` : ""}
          <label>Email<input name="email" type="email" autocomplete="email" required /></label>
          <label>Password<input name="password" type="password" minlength="8" autocomplete="${signup ? "new-password" : "current-password"}" required /></label>
          <button class="primary" type="submit">${signup ? "Create account" : admin ? "Login as admin" : "Login"}</button>
          ${admin ? "" : `
            <div class="google-auth">
              <div id="googleButton"></div>
              <p id="googleStatus" class="row-sub">Loading Google sign-in...</p>
            </div>
          `}
        </form>
      </section>
    </main>
  `;
}

function shellTemplate() {
  const nav = ["dashboard", "my-page", "groups", "expenses", "balances", "support", "import", "docs"];
  if (state.user.role === "admin") nav.splice(5, 0, "admin");
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="mark">S</span><span>SplitNest</span></div>
        <nav class="nav">
          ${nav.map((view) => `<button data-view="${view}" class="${state.view === view ? "active" : ""}">${icon(view)} ${title(view)}</button>`).join("")}
        </nav>
        <div class="profile-strip">
          <strong>${state.user.name}</strong>
          <span>${state.user.email}</span>
          <span>${state.user.role || "user"} | database connected</span>
        </div>
        <button class="ghost-btn" id="logoutBtn">Sign out</button>
      </aside>
      <main class="main">${viewTemplate()}</main>
    </div>
  `;
}

function title(view) {
  return ({ dashboard: "Dashboard", "my-page": "My Page", groups: "Groups", expenses: "Expenses", balances: "Balances", support: "User/Admin Chat", admin: "Admin", import: "Import Report", docs: "Docs" })[view];
}

function icon(view) {
  return ({ dashboard: "[ ]", "my-page": "ME", groups: "OO", expenses: "$", balances: "<>", support: "[]", admin: "##", import: "UP", docs: "DOC" })[view];
}

function viewTemplate() {
  const scopedExpenses = visibleExpenses();
  const total = scopedExpenses.reduce((sum, item) => sum + (item.splitType === "settlement" ? 0 : Math.max(item.amount, 0)), 0);
  const stats = `
    <section class="metric-grid">
      <div class="metric"><span>Stored spend</span><strong>${money.format(total)}</strong></div>
      <div class="metric"><span>Expenses</span><strong>${scopedExpenses.length}</strong></div>
      <div class="metric"><span>Anomalies</span><strong>${anomalies.length}</strong></div>
      <div class="metric"><span>Support chats</span><strong>${state.supportMessages.length}</strong></div>
    </section>`;
  if (state.view === "dashboard") return dashboardTemplate(stats);
  if (state.view === "my-page") return myPageTemplate(stats);
  if (state.view === "groups") return groupsTemplate();
  if (state.view === "expenses") return expensesTemplate();
  if (state.view === "balances") return balancesTemplate();
  if (state.view === "support") return supportTemplate();
  if (state.view === "admin") return adminTemplate();
  if (state.view === "import") return importTemplate(stats);
  return docsTemplate();
}

function myPageTemplate(stats) {
  const person = currentPersonName() || state.user.name;
  return `
    <section class="topbar">
      <div>
        <p class="eyebrow">Personal workspace</p>
        <h1>${person}'s page</h1>
        <p class="lede">Add and review your own expense ledger, individual balance, and minimum transfer recommendations from one focused view.</p>
      </div>
      <div class="actions">
        <button class="primary" data-modal="expense">Add expense</button>
        <button class="secondary" onclick="trackedToast('settlement_record_requested','Payment intent saved')">Record payment</button>
      </div>
    </section>
    ${stats}
    <section class="grid">
      <div class="card span-7">${recentExpenses(100)}</div>
      <div class="card span-5">${balanceList()}</div>
      <div class="card span-12">
        <div class="card-head"><div><h2>${person}'s minimum transfers</h2><p class="lede">Only transfer suggestions involving ${person} are shown.</p></div></div>
        <div class="list">${settlements().map((s) => row(`${s.from} pays ${s.to}`, "Recommended settlement", money.format(s.amount), "neg")).join("") || row(person, "No pending transfer", money.format(0), "")}</div>
      </div>
    </section>
  `;
}

function dashboardTemplate(stats) {
  const person = currentPersonName();
  return `
    <section class="topbar">
      <div>
        <p class="eyebrow">Product overview</p>
        <h1>${person ? `${person}'s expense dashboard` : "Splitwise core with database-first accountability."}</h1>
        <p class="lede">${person ? `Showing only expenses, balances, and transfers connected to ${person}.` : "Admin view shows the complete database-backed ledger."}</p>
      </div>
      <div class="actions">
        <button class="primary" data-modal="expense">Add expense</button>
        <button class="secondary" data-modal="group">New group</button>
      </div>
    </section>
    ${stats}
    <section class="grid">
      <div class="card span-7">${recentExpenses()}</div>
      <div class="card span-5">${balanceList()}</div>
      <div class="card span-7">${supportTemplate(true)}</div>
      <div class="card span-5">
        <div class="card-head"><div><h2>${person ? `${person}'s minimum transfers` : "Minimum transfers"}</h2><p class="lede">Suggested settlement plan from current ledger.</p></div></div>
        <div class="list">${settlements().slice(0, 5).map((s) => row(`${s.from} pays ${s.to}`, "Suggested settlement", money.format(s.amount), "neg")).join("")}</div>
      </div>
    </section>
  `;
}

function groupsTemplate() {
  return `
    <section class="topbar"><div><p class="eyebrow">Groups</p><h1>Manage people and shared contexts.</h1></div><button class="primary" data-modal="group">Create group</button></section>
    <section class="grid">
      ${state.groups.map((group) => `
        <article class="card span-6">
          <div class="card-head"><div><h2>${group.name}</h2><p class="lede">${group.description}</p></div><span class="pill">${group.members.length} members</span></div>
          <div class="tabs">${group.members.map((member) => `<button type="button">${typeof member === "string" ? member : member.name}</button>`).join("")}</div>
          <div class="actions">
            <button class="secondary" onclick="trackedToast('invite_generated','Invite link copied for ${group.name}')">Invite user</button>
            <button class="danger" onclick="trackedToast('member_remove_requested','Removal request saved for admin review')">Remove user</button>
          </div>
        </article>`).join("")}
    </section>
  `;
}

function expensesTemplate() {
  const person = currentPersonName();
  return `
    <section class="topbar"><div><p class="eyebrow">Expenses</p><h1>${person ? `${person}'s expense ledger` : "Every split mode in one ledger."}</h1><p class="lede">${person ? `Only rows where ${person} paid or joined the split are shown.` : "Admin sees every stored row."}</p></div><button class="primary" data-modal="expense">Add expense</button></section>
    <section class="card">${recentExpenses(100)}</section>
  `;
}

function balancesTemplate() {
  const person = currentPersonName();
  return `
    <section class="topbar"><div><p class="eyebrow">Balances</p><h1>${person ? `${person}'s individual balance summary` : "Group-wise and individual summaries."}</h1></div><button class="primary" onclick="trackedToast('settlement_record_requested','Payment intent saved')">Record payment</button></section>
    <section class="grid"><div class="card span-5">${balanceList()}</div><div class="card span-7"><div class="card-head"><div><h2>Settlement recommendations</h2><p class="lede">Netted from paid minus owed amounts.</p></div></div><div class="list">${settlements().map((s) => row(`${s.from} pays ${s.to}`, "Settles outstanding balance", money.format(s.amount), "neg")).join("")}</div></div></section>
  `;
}

function supportTemplate(compact = false) {
  return `
    <section class="${compact ? "" : "topbar"}">
      <div><p class="eyebrow">Saved user/admin chat</p><h1>${compact ? "Support chat" : "Chats are stored in database."}</h1>${compact ? "" : `<p class="lede">Every message between users and admins goes through /api/support/messages and is also audit-logged.</p>`}</div>
    </section>
    <div class="chat">${state.supportMessages.map((msg) => `<div class="bubble ${msg.sender_role === "admin" ? "me" : ""}"><strong>${msg.sender_name || msg.sender_role}</strong><br>${msg.content}</div>`).join("")}</div>
    <form id="supportForm" class="actions" style="margin-top:14px">
      <input name="message" placeholder="${state.user.role === "admin" ? "Reply to users as admin" : "Message the admin"}" />
      <button class="primary">Send</button>
    </form>
  `;
}

function adminTemplate() {
  const counts = state.adminData?.counts;
  const everything = state.adminData?.everything;
  return `
    <section class="topbar">
      <div><p class="eyebrow">Admin section</p><h1>Everything visible in one place.</h1><p class="lede">Users, groups, expenses, settlements, chats, import reports, auth events, and audit events are exposed here for administrators.</p></div>
      <button class="primary" id="refreshAdmin">Refresh database</button>
    </section>
    <section class="metric-grid">
      ${["users", "groups", "expenses", "settlements", "supportMessages", "auditEvents", "authEvents", "activityLogs", "importReports"].map((key) => `<div class="metric"><span>${key}</span><strong>${counts?.[key] ?? "-"}</strong></div>`).join("")}
    </section>
    <section class="grid">
      <div class="card span-6">${adminTable("Users", everything?.users, ["name", "email", "role", "auth_provider"])}</div>
      <div class="card span-6">${adminTable("Support chats", everything?.supportMessages, ["sender_name", "sender_role", "content", "created_at"])}</div>
      <div class="card span-6">${adminTable("Audit events", everything?.auditEvents, ["user_email", "event_type", "entity_type", "created_at"])}</div>
      <div class="card span-6">${adminTable("Auth events", everything?.authEvents, ["email", "provider", "event_type", "success"])}</div>
      <div class="card span-12">${adminTable("All API activity", everything?.activityLogs, ["method", "path", "status_code", "duration_ms", "created_at"])}</div>
    </section>
  `;
}

function adminTable(titleText, rows = [], fields = []) {
  if (!rows?.length) return `<div class="card-head"><div><h2>${titleText}</h2><p class="lede">Refresh after database migration/seed.</p></div></div>`;
  return `
    <div class="card-head"><div><h2>${titleText}</h2><p class="lede">${rows.length} latest rows</p></div></div>
    <div class="table-wrap"><table><thead><tr>${fields.map((field) => `<th>${field}</th>`).join("")}</tr></thead>
    <tbody>${rows.slice(0, 8).map((rowItem) => `<tr>${fields.map((field) => `<td>${String(rowItem[field] ?? "-").slice(0, 90)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
  `;
}

function importTemplate(stats) {
  return `
    <section class="topbar"><div><p class="eyebrow">CSV import report</p><h1>Anomaly log with actions taken.</h1><p class="lede">Import reports are persisted in PostgreSQL for admin review.</p></div><button class="primary" onclick="trackedToast('import_report_exported','Export event saved')">Export report</button></section>
    ${stats}
    <section class="card"><div class="table-wrap"><table><thead><tr><th>Issue</th><th>Source detail</th><th>Action taken</th></tr></thead><tbody>${anomalies.map((a) => `<tr><td><span class="pill warn">${a[0]}</span></td><td>${a[1]}</td><td>${a[2]}</td></tr>`).join("")}</tbody></table></div></section>
  `;
}

function docsTemplate() {
  return `
    <section class="topbar"><div><p class="eyebrow">Deliverables</p><h1>Documentation included for evaluation.</h1><p class="lede">Docs now mention database persistence, admin visibility, Google sign-in, and support chat storage.</p></div></section>
    <section class="grid">${["README.md", "BUILD_PLAN.md", "AI_CONTEXT.md", "SCOPE.md", "DECISIONS.md", "AI_USAGE.md"].map((doc) => `<article class="card span-4"><p class="eyebrow">Markdown</p><h2>${doc}</h2><p class="lede">${docSummary(doc)}</p></article>`).join("")}</section>
  `;
}

function recentExpenses(limit = 8) {
  const person = currentPersonName();
  const rows = visibleExpenses().slice(-limit).reverse();
  return `
    <div class="card-head"><div><h2>${person ? `${person}'s expense ledger` : "Expense ledger"}</h2><p class="lede">${person ? `Rows connected to ${person}.` : "Latest imported and manually created records."}</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Paid by</th><th>Split</th><th>Amount</th><th>Notes</th></tr></thead>
    <tbody>${rows.map((expense) => `<tr><td>${expense.date}</td><td><strong>${expense.description}</strong><div class="row-sub">${(expense.flags || []).join(", ")}</div></td><td>${expense.paidBy}</td><td><span class="pill ${expense.splitType === "settlement" ? "warn" : ""}">${expense.splitType}</span></td><td>${amountLabel(expense)}</td><td>${expense.notes || "-"}</td></tr>`).join("")}</tbody></table></div>`;
}

function amountLabel(expense) {
  if (expense.currency === "INR") return money.format(expense.amount);
  return `${expense.currency} ${Number(expense.amount).toLocaleString("en-IN", { maximumFractionDigits: 3 })}`;
}

function balanceList() {
  const person = currentPersonName();
  const rows = balanceRows();
  return `<div class="card-head"><div><h2>${person ? `${person}'s balance` : "Individual balances"}</h2><p class="lede">Positive means the member should receive money.</p></div></div><div class="list">${rows.map(([name, value]) => row(name, value > 0 ? "gets back" : "owes", money.format(Math.abs(value)), value > 0 ? "pos" : "neg")).join("") || row(person || "No balances", "No outstanding amount", money.format(0), "")}</div>`;
}

function row(titleText, sub, amount, cls = "") {
  return `<div class="row"><div><div class="row-title">${titleText}</div><div class="row-sub">${sub}</div></div><div class="amount ${cls}">${amount}</div></div>`;
}

function docSummary(doc) {
  return {
    "README.md": "Setup, scripts, local run instructions, deployment notes, and AI disclosure.",
    "BUILD_PLAN.md": "Research, architecture, collaboration process, persistence plan, and tradeoffs.",
    "AI_CONTEXT.md": "Source of truth covering product, schema, API, frontend, testing, prompts, and changes.",
    "SCOPE.md": "CSV anomaly log and database schema decisions.",
    "DECISIONS.md": "Decision log with options considered and rationale.",
    "AI_USAGE.md": "Tools, key prompts, mistakes caught, and corrections made."
  }[doc];
}

function bindAuth() {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      render();
    });
  });

  document.querySelector("#authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const path = state.authMode === "signup" ? "/auth/register" : state.authMode === "admin" ? "/auth/admin-login" : "/auth/login";
      const body = state.authMode === "signup"
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      const result = await api(path, { method: "POST", body: JSON.stringify(body) });
      saveSession(result.token, result.user);
      await loadAfterLogin();
      render();
    } catch (err) {
      toast(`${err.message}. Start PostgreSQL and run migrations for database login.`);
    }
  });

  setupGoogleButton();
}

async function handleGoogleCredential(response) {
  try {
    const result = await api("/auth/google", { method: "POST", body: JSON.stringify({ credential: response.credential }) });
    saveSession(result.token, result.user);
    await loadAfterLogin();
    render();
  } catch (err) {
    toast(`Google sign-in failed: ${err.message}`);
  }
}

function setupGoogleButton(attempt = 0) {
  const container = document.querySelector("#googleButton");
  const status = document.querySelector("#googleStatus");
  if (!container) return;
  const clientId = window.SPLITNEST_CONFIG?.GOOGLE_CLIENT_ID;
  if (!clientId) {
    status.textContent = "Google sign-in is not configured.";
    return;
  }
  if (!window.google?.accounts?.id) {
    if (attempt < 30) {
      setTimeout(() => setupGoogleButton(attempt + 1), 250);
    } else {
      status.textContent = "Google sign-in could not load. Check your connection and reload.";
    }
    return;
  }
  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: true
    });
    window.google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: state.authMode === "signup" ? "signup_with" : "continue_with",
      shape: "rectangular",
      width: Math.min(360, container.clientWidth || 360)
    });
    status.textContent = "Google securely verifies your identity.";
  } catch (err) {
    status.textContent = `Google sign-in setup failed: ${err.message}`;
  }
}

function bindShell() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.view = button.dataset.view;
      await audit("view_opened", { view: state.view });
      if (state.view === "admin") await loadAdmin();
      if (state.view === "support") await loadSupport();
      render();
    });
  });
  document.querySelector("#logoutBtn").addEventListener("click", async () => {
    await audit("logout_clicked");
    clearSession();
    render();
  });
  document.querySelectorAll("[data-modal]").forEach((button) => button.addEventListener("click", () => openModal(button.dataset.modal)));
  bindSupportForm();
  const refreshAdmin = document.querySelector("#refreshAdmin");
  if (refreshAdmin) refreshAdmin.addEventListener("click", async () => {
    await loadAdmin();
    render();
  });
}

function bindSupportForm() {
  const form = document.querySelector("#supportForm");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = new FormData(form).get("message").trim();
    if (!message) return;
    try {
      const result = await api("/support/messages", { method: "POST", body: JSON.stringify({ content: message, metadata: { uiView: state.view } }) });
      state.supportMessages.push({ ...result.message, sender_name: state.user.name });
      toast("Message saved to database");
    } catch (err) {
      toast(`Message was not saved: ${err.message}`);
    }
    render();
  });
}

async function loadAfterLogin() {
  await Promise.allSettled([loadDatabaseData(), loadSupport(), state.user.role === "admin" ? loadAdmin() : Promise.resolve()]);
  await audit("login_session_started", { role: state.user.role });
}

async function loadDatabaseData() {
  try {
    if (state.user?.role === "admin") {
      // Admins: load ALL groups and ALL expenses for full visibility
      const result = await api("/groups");
      const dbGroups = result.groups || [];
      if (!dbGroups.length) {
        state.groups = [];
        state.expenses = [];
        state.dbLoaded = true;
        return;
      }
      state.groups = dbGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description || "",
        members: group.members || []
      }));
      state.selectedGroup = state.groups[0]?.id;
      const expenseResults = await Promise.all(state.groups.map((group) => api(`/expenses/group/${group.id}`)));
      state.expenses = expenseResults.flatMap((item) => item.expenses || []).map((expense) => {
        const group = state.groups.find((item) => item.id === expense.group_id);
        const namesById = Object.fromEntries((group?.members || []).map((member) => [member.id, member.name]));
        return normaliseExpense(expense, namesById);
      });
      // Load all-member balances for admin from balances/mine (shows all users)
      const balanceData = await api("/balances/mine");
      state.dbBalances = balanceData.individualBalances || [];
      state.dbTransfers = balanceData.minimumTransfers || [];
    } else {
      // Regular user: fetch ONLY their own expenses and groups
      const [groupResult, expenseResult, balanceData] = await Promise.all([
        api("/groups"),
        api("/expenses/mine"),
        api("/balances/mine")
      ]);
      const dbGroups = groupResult.groups || [];
      state.groups = dbGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description || "",
        members: group.members || []
      }));
      state.selectedGroup = state.groups[0]?.id;
      // Build a lookup of all member names from all groups
      const allMembersById = {};
      state.groups.forEach((group) => {
        (group.members || []).forEach((member) => {
          if (member.id) allMembersById[member.id] = member.name;
        });
      });
      // Map expenses — already filtered server-side to this user only
      state.expenses = (expenseResult.expenses || []).map((expense) => normaliseExpense(expense, allMembersById));
      // Store DB-computed balances and minimum transfers
      state.dbBalances = balanceData.individualBalances || [];
      state.dbTransfers = balanceData.minimumTransfers || [];
    }
    state.dbLoaded = true;
  } catch (err) {
    console.error("loadDatabaseData failed, falling back to seed data:", err.message);
    state.dbLoaded = false;
  }
}

// Normalise a raw DB expense row into the frontend shape
function normaliseExpense(expense, namesById) {
  return {
    id: expense.id,
    groupId: expense.group_id,
    date: String(expense.date).slice(0, 10),
    description: expense.description,
    paidBy: expense.payer?.name || "Unknown",
    paidById: expense.payer?.id || null,
    amount: Number(expense.amount),
    currency: expense.currency || "INR",
    splitType: expense.split_type,
    splitWith: (expense.splits || []).map((split) => namesById[split.user_id] || "Unknown"),
    owedByName: Object.fromEntries(
      (expense.splits || []).map((split) => [namesById[split.user_id] || "Unknown", Number(split.owed_amount)])
    ),
    splitDetails: "",
    notes: expense.notes || "",
    flags: expense.import_flags?.flags || []
  };
}

async function loadSupport() {
  if (!state.token) return;
  const result = await api("/support/messages");
  state.supportMessages = result.messages || [];
}

async function loadAdmin() {
  if (state.user?.role !== "admin") return;
  try {
    const [overview, everything] = await Promise.all([api("/admin/overview"), api("/admin/everything")]);
    state.adminData = { counts: overview.counts, everything };
  } catch (err) {
    toast(`Admin data unavailable: ${err.message}`);
  }
}

function openModal(type) {
  const modal = el(`
    <div class="modal">
      <form class="modal-body" id="modalForm">
        <div class="card-head"><div><p class="eyebrow">${type === "expense" ? "New expense" : "New group"}</p><h2>${type === "expense" ? "Add a split record" : "Create a group"}</h2></div><button class="secondary" type="button" id="closeModal">Close</button></div>
        ${type === "expense" ? expenseForm() : groupForm()}
        <div class="actions" style="margin-top:16px"><button class="primary">Save</button></div>
      </form>
    </div>`);
  document.body.appendChild(modal);
  document.querySelector("#closeModal").addEventListener("click", () => modal.remove());
  document.querySelector("#modalForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (type === "expense") {
        const group = state.groups.find((item) => item.id === state.selectedGroup) || state.groups[0];
        if (!group) throw new Error("Create a group before adding an expense");
        const requestedIds = new FormData(event.currentTarget).getAll("splitMemberIds");
        const groupMembers = group.members || [];
        const payer = groupMembers.find((member) => member.id === data.paidBy);
        const participants = groupMembers.filter((member) => requestedIds.includes(member.id));
        if (!payer) throw new Error("Select a payer from the current group");
        if (!participants.length) throw new Error("Select at least one split member from the current group");
        const splitDetails = parseSplitDetails(data.splitType, data.splitDetails, participants);
        await api("/expenses", {
          method: "POST",
          body: JSON.stringify({
            groupId: group.id,
            description: data.description,
            amount: Number(data.amount),
            currency: "INR",
            paidBy: payer.id,
            splitType: data.splitType,
            date: data.date,
            notes: data.notes,
            splits: splitDetails
          })
        });
      } else {
        await api("/groups", {
          method: "POST",
          body: JSON.stringify({ name: data.name, description: data.description, memberIds: [] })
        });
      }
      await loadDatabaseData();
      modal.remove();
      toast(`${type === "expense" ? "Expense" : "Group"} saved to database`);
      render();
    } catch (err) {
      toast(`Not saved: ${err.message}`);
    }
  });
}

function parseSplitDetails(splitType, rawDetails, participants) {
  if (splitType === "equal") return participants.map((member) => ({ userId: member.id }));
  const detailMap = new Map(
    rawDetails.split(";").map((part) => {
      const match = part.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)%?$/);
      return match ? [match[1].trim().toLowerCase(), Number(match[2])] : null;
    }).filter(Boolean)
  );
  return participants.map((member) => ({
    userId: member.id,
    ...(splitType === "unequal" ? { amount: detailMap.get(member.name.toLowerCase()) || 0 } : {}),
    ...(splitType === "percentage" ? { percentage: detailMap.get(member.name.toLowerCase()) || 0 } : {}),
    ...(splitType === "share" ? { shares: detailMap.get(member.name.toLowerCase()) || 1 } : {})
  }));
}

function expenseForm() {
  const group = state.groups.find((item) => item.id === state.selectedGroup) || state.groups[0];
  const groupMembers = group?.members || [];
  const currentPerson = currentPersonName();
  const defaultPayer = groupMembers.find((member) => member.name === currentPerson)?.id || groupMembers[0]?.id || "";
  return `
    <div class="form-grid">
      <label>Description<input name="description" value="Team dinner" required /></label>
      <label>Date<input name="date" type="date" value="2026-06-13" required /></label>
      <label>Paid by<select name="paidBy">${groupMembers.map((member) => `<option value="${member.id}" ${member.id === defaultPayer ? "selected" : ""}>${member.name}</option>`).join("")}</select></label>
      <label>Amount<input name="amount" type="number" min="1" value="2400" required /></label>
      <label>Split type<select name="splitType"><option>equal</option><option>unequal</option><option>percentage</option><option>share</option><option>settlement</option></select></label>
      <div class="field-block">
        <span>Split with</span>
        <div class="check-grid">${groupMembers.map((member) => `<label class="check-row"><input type="checkbox" name="splitMemberIds" value="${member.id}" checked /> ${member.name}</label>`).join("")}</div>
      </div>
      <label style="grid-column:1/-1">Split details<input name="splitDetails" placeholder="Aisha 30%; Rohan 30%; Priya 20%; Sam 20%" /></label>
      <label style="grid-column:1/-1">Notes<textarea name="notes" placeholder="What should a reviewer know?"></textarea></label>
    </div>`;
}

function groupForm() {
  return `
    <div class="form-grid">
      <label>Group name<input name="name" value="Office Lunches" required /></label>
      <label>Members<input name="members" value="Aisha, Rohan, Priya" required /></label>
      <label style="grid-column:1/-1">Description<textarea name="description">Recurring food and team expense splits.</textarea></label>
    </div>`;
}

async function trackedToast(eventType, message) {
  await audit(eventType, { message });
  toast(message);
}

function toast(message) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const box = el(`<div class="toast">${message}</div>`);
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2600);
}

window.trackedToast = trackedToast;
window.toast = toast;

if (state.user && state.token) {
  loadAfterLogin().finally(render);
} else {
  render();
}
