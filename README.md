# SplitNest

A polished Splitwise-inspired internship assignment for Spreetail. The app demonstrates signup/login, Google sign-in flow, groups, expense creation, equal/unequal/percentage/share splits, settlements, balance summaries, saved user/admin chats, admin visibility, audit events, and CSV anomaly reporting.

## Run the Frontend

The frontend is a static app and works without installing packages.

Open:

```text
frontend/index.html
```

For full database persistence, run the backend and PostgreSQL. Without PostgreSQL, the UI stays usable but API-backed storage shows an offline notice.

## Run the Backend API

```bash
cd backend
npm install
copy .env.example .env
npm run migrate
npm run seed
npm run db:verify
npm run dev
```

Set `DATABASE_URL` and `JWT_SECRET` in `backend/.env`. The backend uses PostgreSQL, Express, JWT auth, Socket.IO, and relational tables only.

Seeded accounts:

```text
bhargawpradhan@gmail.com / 123456789
aisha@example.com / assignment
```

## Database Persistence

The backend stores users, password signup, verified Google signup/login, roles, auth events, groups, group members, expenses, split rows, settlements, import reports, expense messages, user/admin support chats, audit events, and an activity log for every API request.

See `DATABASE_SETUP.md` for local setup and `DEPLOYMENT.md` for hosted PostgreSQL deployment. MongoDB Atlas is not used because the assignment requires a relational database.

## AI Used

Codex was used as the primary development collaborator for implementation, UI design, backend route completion, documentation, and review of assignment deliverables. See `AI_USAGE.md` and `AI_CONTEXT.md`.
