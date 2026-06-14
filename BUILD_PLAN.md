# BUILD_PLAN.md

## 1. Product Research

Splitwise was studied as a product for shared expenses, not as a pixel-perfect clone. The core workflows identified were sign in, create a group, invite or manage members, add an expense, choose a split method, review member balances, settle debts, and keep context around disputed expenses.

Product assumptions:
- The 2-day assignment should prioritize correct money behavior and explainability.
- A reviewer should be able to understand imported data quality issues without opening logs.
- Real-time chat can be scoped to expense-level messages.
- Multi-currency support is represented through an import conversion decision, not live exchange rates.

## 2. Architecture

Frontend:
- Static HTML, CSS, and JavaScript in `frontend/`.
- Seeded reviewer demo with local state for fast evaluation.
- Screens: login, dashboard, groups, expenses, balances, import report, and docs.

Backend:
- Node.js, Express, PostgreSQL, JWT, Socket.IO.
- Relational schema for users, groups, group members, expenses, splits, settlements, messages, and import reports.
- API routes for auth, users, groups, expenses, settlements, and imports.

Database:
- PostgreSQL only.
- Expenses store the payer and split type.
- Expense splits store per-user owed amounts plus raw percentage/share metadata.
- Settlements are separate records because they are payments, not expenses.

Deployment:
- Frontend can be hosted on Netlify, Vercel static hosting, or GitHub Pages.
- Backend can be deployed on Render, Railway, or Fly.io with managed PostgreSQL.

## 3. AI Collaboration Process

The initial instruction was to behave like a junior engineer, ask product and engineering questions, preserve context, and avoid assuming requirements. For this implementation pass, the agreed direction was to produce an interview-ready product demo, complete missing backend modules, and maintain required documentation.

AI maintained context through:
- `AI_CONTEXT.md` for source-of-truth implementation details.
- `SCOPE.md` for anomaly and schema notes.
- `DECISIONS.md` for important choices.
- `AI_USAGE.md` for AI prompts, mistakes, and corrections.

## 4. Tradeoffs

Simplified:
- The frontend demo uses seeded local state so reviewers can inspect the product immediately.
- USD conversion uses a fixed demo rate of INR 83.
- Invite links and member removal are represented as audited UI actions.

Avoided:
- Live external exchange-rate APIs.
- Perfect Splitwise visual cloning.
- Complex recurring bills and notification systems.

Future improvements:
- Persist all frontend actions through the API.
- Add automated tests for split calculations.
- Add OAuth and email invitations.
- Add production Socket.IO rooms with stronger authorization checks.
