# AI_USAGE.md

## AI Tools Used

- Codex as the main development collaborator.

## Key Prompts Used

Initial assignment prompt:

```text
You are a junior engineer helping me complete an internship assignment.
The assignment is to reverse engineer Splitwise, scope a realistic 3-day version,
and build a working deployed app.
Do not assume product requirements. Ask detailed questions. Maintain AI_CONTEXT.md.
```

Implementation prompt:

```text
Use the existing repository, create an interview-ready Splitwise-inspired app, complete missing backend modules, seed it with the supplied CSV data, and make the UI polished without looking generic.
```

## AI Mistakes Caught and Corrected

1. The backend referenced missing route files. This would crash the API on startup. Added `expenses`, `settlements`, `import`, `balances`, and socket handler modules.

2. The initial CSV interpretation could treat settlement rows as expenses. Corrected by separating settlements from shared expenses.

3. Percentage splits in the data did not total 100. Corrected by normalizing the percentages and documenting the anomaly instead of silently accepting wrong math.

4. The frontend needed to work for reviewers without database setup. Corrected by adding a static seeded demo while retaining backend architecture.

## Final AI Role

AI acted as a junior implementation partner, but the final submission keeps decisions, tradeoffs, data handling, and limitations explicit so the evaluator can quiz the developer on the codebase.
