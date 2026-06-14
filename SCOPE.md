# SCOPE.md

## CSV Anomaly Log

| Problem | Example | Handling |
| --- | --- | --- |
| Duplicate-looking expense | `Dinner at Marina Bites` and `dinner - marina bites` | Imported both and flagged for review because payer, amount, and participants match closely. |
| Case mismatch | `priya`, `rohan` | Normalized to canonical member names. |
| Alias | `Priya S` | Resolved to `Priya`. |
| Missing payer | `House cleaning supplies` | Skipped from balance calculation pending manual review. |
| Settlement mixed into expenses | `Rohan paid Aisha back` | Stored as settlement, not expense. |
| Comma in amount | `1,200` | Parsed as `1200`. |
| Too many decimals | `899.995` | Rounded to `900` for INR display. |
| Percentage total off | `30 + 30 + 30 + 20 = 110` | Normalized percentages to 100%. |
| USD currency | Goa villa, beach lunch, parasailing | Converted to INR with fixed assignment rate of 83. |
| Unknown participant | `Dev's friend Kabir` | Created guest member `Kabir`. |
| Negative amount | `Parasailing refund -30 USD` | Kept as refund. |
| Ambiguous date | `04-05-2026` with note asking April 5 or May 4 | Flagged for review and excluded from automatic import. |
| Member left group | Meera appears after farewell | Flagged, retained only where source row explicitly included her. |
| Zero amount | Swiggy row `0` | Treated as correction note and excluded from spend totals. |

## Database Schema

The backend schema is relational and uses PostgreSQL tables for users, auth events, groups, group members, expenses, expense splits, settlements, expense messages, support messages, audit events, and import reports. Settlements are intentionally separate from expenses so the ledger can distinguish money spent from money paid back.
