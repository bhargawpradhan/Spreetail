# Database Setup

SplitNest uses PostgreSQL for users, authentication events, groups, expenses, split rows, settlements, expense chats, user/admin chats, audit events, API activity logs, and import reports.

For cloud deployment, use a managed PostgreSQL connection string. MongoDB Atlas is intentionally not used because the assignment requires a relational database.

## Fast Setup With Docker

From the repository root:

```powershell
docker compose up -d postgres
Copy-Item backend/.env.example backend/.env -Force
Set-Location backend
npm.cmd install
npm.cmd run migrate
npm.cmd run seed
npm.cmd run db:verify
npm.cmd start
```

The API runs on `http://localhost:5001`.

## Existing PostgreSQL Setup

Create a database named `splitwise`, then configure `backend/.env`:

```text
DATABASE_URL=postgresql://postgres:password@localhost:5432/splitwise
JWT_SECRET=replace_with_a_long_random_secret
PORT=5001
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Run:

```powershell
Set-Location backend
npm.cmd run migrate
npm.cmd run seed
npm.cmd run db:verify
```

## Verification

`npm.cmd run db:verify` checks every required table and prints record counts. It exits with an error when a required table is missing or PostgreSQL cannot be reached.

Seeded accounts:

```text
Admin: bhargawpradhan@gmail.com / 123456789
User:  aisha@example.com / assignment
```

See `DEPLOYMENT.md` for hosted PostgreSQL deployment.
