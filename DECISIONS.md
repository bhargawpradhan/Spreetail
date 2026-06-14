# DECISIONS.md

## 1. Use PostgreSQL

Options considered:
- PostgreSQL.
- MongoDB.
- Local-only storage.

Decision:
- Use PostgreSQL because the assignment explicitly requires relational databases and the domain has clear relationships.

## 2. Store Settlements Separately

Options considered:
- Store payments as negative expenses.
- Store payments in a dedicated `settlements` table.

Decision:
- Use a dedicated table. A settlement changes balances but is not shared spend.

## 3. Keep a Static Reviewer Demo

Options considered:
- Require backend and database before the app is visible.
- Provide a static seeded frontend plus backend API.

Decision:
- Provide a static demo so interviewers can inspect the product immediately, while still maintaining backend API modules and schema.

## 4. Normalize Messy Percentages

Options considered:
- Reject rows where percentages do not total 100.
- Normalize percentages and flag the issue.

Decision:
- Normalize and flag. This preserves user intent while keeping the import report honest.

## 5. Fixed USD Conversion

Options considered:
- Fetch live exchange rates.
- Hardcode a repeatable assignment conversion rate.

Decision:
- Use a fixed rate for deterministic review and document the tradeoff.

## 6. Store Admin/User Chat Separately

Options considered:
- Reuse expense messages.
- Create `support_messages`.

Decision:
- Create `support_messages` because admin support chat is not tied to a single expense.

## 7. Audit Small UI Actions

Options considered:
- Store only business records.
- Also store small reviewer-visible actions.

Decision:
- Add `audit_events` so view openings, invite clicks, exports, created records, and support messages can be saved and inspected by admin.
