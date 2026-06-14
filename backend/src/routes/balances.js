const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

/**
 * GET /api/balances/mine
 * Returns: the logged-in user's net balance across every group they belong to,
 * plus the minimum-transfer (greedy debt-simplification) suggestions that involve them.
 */
router.get('/mine', authenticate, async (req, res) => {
  const userId = req.user.id;
  try {
    // 1. Collect every group the user belongs to
    const groupRows = await pool.query(
      `SELECT g.id, g.name
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1 AND gm.is_active = true`,
      [userId]
    );
    const groupIds = groupRows.rows.map((r) => r.id);

    if (!groupIds.length) {
      return res.json({ userBalance: 0, individualBalances: [], minimumTransfers: [] });
    }

    // 2. Build a full ledger for every user across those groups (needed for debt-simplification)
    const userRows = await pool.query(
      `SELECT DISTINCT u.id, u.name, u.avatar_color
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ANY($1::uuid[]) AND gm.is_active = true`,
      [groupIds]
    );

    const ledger = new Map(userRows.rows.map((u) => [u.id, { ...u, balance: 0 }]));

    // 3. Credit payers and debit split participants across those groups
    const expenseRows = await pool.query(
      `SELECT e.id, e.paid_by, e.amount, e.split_type
       FROM expenses e
       WHERE e.group_id = ANY($1::uuid[])`,
      [groupIds]
    );
    for (const expense of expenseRows.rows) {
      if (expense.paid_by && ledger.has(expense.paid_by)) {
        ledger.get(expense.paid_by).balance += Number(expense.amount);
      }
      const splitRows = await pool.query(
        'SELECT user_id, owed_amount FROM expense_splits WHERE expense_id = $1',
        [expense.id]
      );
      for (const split of splitRows.rows) {
        if (ledger.has(split.user_id)) {
          ledger.get(split.user_id).balance -= Number(split.owed_amount);
        }
      }
    }

    // 4. Apply settlements
    const settlementRows = await pool.query(
      'SELECT paid_by, paid_to, amount FROM settlements WHERE group_id = ANY($1::uuid[])',
      [groupIds]
    );
    for (const s of settlementRows.rows) {
      if (ledger.has(s.paid_by)) ledger.get(s.paid_by).balance += Number(s.amount);
      if (ledger.has(s.paid_to)) ledger.get(s.paid_to).balance -= Number(s.amount);
    }

    // 5. Round balances
    const allBalances = Array.from(ledger.values()).map((u) => ({
      ...u,
      balance: Number(u.balance.toFixed(2))
    }));

    const userBalance = allBalances.find((u) => u.id === userId)?.balance ?? 0;

    // 6. Greedy minimum-transfer algorithm (Splitwise-style debt simplification)
    const creditors = allBalances.filter((u) => u.balance > 1).map((u) => ({ ...u }));
    const debtors   = allBalances.filter((u) => u.balance < -1).map((u) => ({ ...u, balance: Math.abs(u.balance) }));

    const minimumTransfers = [];
    let d = 0;
    let c = 0;
    while (d < debtors.length && c < creditors.length) {
      const amount = Math.min(debtors[d].balance, creditors[c].balance);
      if (amount > 1) {
        minimumTransfers.push({
          from:       debtors[d].id,
          fromName:   debtors[d].name,
          to:         creditors[c].id,
          toName:     creditors[c].name,
          amount:     Number(amount.toFixed(2))
        });
      }
      debtors[d].balance   -= amount;
      creditors[c].balance -= amount;
      if (debtors[d].balance   < 1) d += 1;
      if (creditors[c].balance < 1) c += 1;
    }

    // 7. Filter transfers to only those involving the current user
    const myTransfers = minimumTransfers.filter((t) => t.from === userId || t.to === userId);

    // 8. Individual balances for every member (useful for admin/display)
    const individualBalances = allBalances.map((u) => ({
      id:      u.id,
      name:    u.name,
      balance: u.balance
    }));

    res.json({
      userBalance,
      individualBalances,
      minimumTransfers: myTransfers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
