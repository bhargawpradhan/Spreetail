# AI_CONTEXT.md

## Product Understanding

Build a simplified Splitwise-inspired app for a Spreetail software developer internship assignment. The app should prove product understanding, engineering judgment, AI collaboration, and ability to explain messy data handling.

## Product Scope

In scope:
- Login module.
- Signup module.
- Google sign-in profile flow.
- Create and manage groups.
- Invite, add, and remove users.
- Create and manage expenses.
- Split equally, unequally, by percentage, and by share.
- Expense-level chat with real-time-ready backend sockets.
- User/admin support chat saved in the database.
- Admin section with users, groups, expenses, settlements, chats, import reports, auth events, and audit events.
- Group and individual balances.
- Record settlements.
- Relational database schema.
- CSV import report and anomaly log.

Out of scope:
- Native mobile app.
- Full Splitwise feature parity.
- Live payment processing.
- Live exchange-rate service.

## Tech Stack

Frontend:
- Static HTML/CSS/JavaScript.
- PostgreSQL-backed authentication, groups, expenses, support chat, admin data, and activity tracking.

Backend:
- Node.js.
- Express.
- PostgreSQL.
- JWT authentication.
- Socket.IO.
- `pg`, `bcryptjs`, `csv-parse`, `multer`.

## Database Schema

Tables:
- `users`: account identity and avatar color.
- `auth_events`: password and Google auth attempts.
- `groups`: expense groups.
- `group_members`: active and inactive membership.
- `expenses`: expense header, payer, amount, currency, date, split type, notes, import flags.
- `expense_splits`: per-user owed amount and raw split metadata.
- `settlements`: direct payments between members.
- `messages`: expense chat messages.
- `support_messages`: user/admin support chat messages.
- `audit_events`: small product actions and admin-visible activity.
- `import_reports`: CSV import summary and anomalies.

## API Design

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`

Users:
- `GET /api/users/search`
- `PATCH /api/users/me`

Groups:
- `GET /api/groups`
- `POST /api/groups`
- `GET /api/groups/:id`
- `PATCH /api/groups/:id`
- `POST /api/groups/:id/members`
- `DELETE /api/groups/:id/members/:userId`
- `GET /api/groups/:id/balances`

Expenses:
- `GET /api/expenses/group/:groupId`
- `POST /api/expenses`
- `GET /api/expenses/:id/messages`
- `POST /api/expenses/:id/messages`

Settlements:
- `GET /api/settlements/group/:groupId`
- `POST /api/settlements`

Imports:
- `GET /api/import/reports`
- `POST /api/import/csv`

Support:
- `GET /api/support/messages`
- `POST /api/support/messages`

Audit:
- `POST /api/audit`

Admin:
- `GET /api/admin/overview`
- `GET /api/admin/everything`

## Frontend Structure

Files:
- `frontend/index.html`: app shell.
- `frontend/styles.css`: responsive theme and UI system.
- `frontend/app.js`: seeded data, split math, balance math, rendering, modals, and demo interactions.

Views:
- Login.
- Dashboard.
- Groups.
- Expenses.
- Balances.
- Support chat.
- Admin.
- Import Report.
- Docs.

## Split Logic

Equal:
- Amount divided by number of participants.

Unequal:
- Explicit amount per participant.

Percentage:
- Percentages are normalized if their total is not exactly 100.

Share:
- Amount divided according to share weights.

Settlements:
- Payments are kept separate from expenses and adjust net balances directly.

## Import Data Handling

Actions:
- Normalize case for names.
- Merge likely aliases such as `Priya S` into `Priya`.
- Default missing currency to INR.
- Convert USD at a fixed demo rate of INR 83.
- Keep negative amount rows as refunds.
- Treat settlement-like rows as payments.
- Flag ambiguous dates and duplicate-looking rows.

## Testing Plan

Manual:
- Open `frontend/index.html`.
- Log in with demo credentials.
- Visit every screen.
- Add an expense.
- Add a group.
- Send a chat note.
- Review balance and import report changes.

Backend:
- Install dependencies.
- Configure PostgreSQL.
- Run migrations.
- Exercise auth, group, expense, settlement, and import endpoints.

## Known Limitations

- Google signup/login requires a configured Google web client ID and authorized frontend origin.
- CSV import endpoint records a report but does not fully insert every expense row.
- Real-time expense chat backend is ready for Socket.IO rooms; support chat is persisted through REST and broadcast through Socket.IO.
- Exchange rates are fixed for repeatable evaluation.

## Changes Made During Implementation

- Built a complete static frontend with seeded assignment data.
- Added missing backend expense, settlement, import, balance, and socket modules.
- Added required assignment documentation.
- Added anomaly report content directly visible in the UI.
