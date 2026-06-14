const pool = require('../db/pool');

async function calculateGroupBalances(groupId) {
  const users = await pool.query(
    `SELECT u.id, u.name, u.avatar_color
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1`,
    [groupId]
  );
  const ledger = new Map(users.rows.map((user) => [user.id, { ...user, balance: 0 }]));

  const expenses = await pool.query('SELECT id, paid_by, amount FROM expenses WHERE group_id=$1', [groupId]);
  for (const expense of expenses.rows) {
    if (expense.paid_by && ledger.has(expense.paid_by)) {
      ledger.get(expense.paid_by).balance += Number(expense.amount);
    }
    const splits = await pool.query('SELECT user_id, owed_amount FROM expense_splits WHERE expense_id=$1', [expense.id]);
    for (const split of splits.rows) {
      if (ledger.has(split.user_id)) {
        ledger.get(split.user_id).balance -= Number(split.owed_amount);
      }
    }
  }

  const settlements = await pool.query('SELECT paid_by, paid_to, amount FROM settlements WHERE group_id=$1', [groupId]);
  for (const settlement of settlements.rows) {
    if (ledger.has(settlement.paid_by)) ledger.get(settlement.paid_by).balance += Number(settlement.amount);
    if (ledger.has(settlement.paid_to)) ledger.get(settlement.paid_to).balance -= Number(settlement.amount);
  }

  return Array.from(ledger.values()).map((item) => ({
    ...item,
    balance: Number(item.balance.toFixed(2))
  }));
}

module.exports = { calculateGroupBalances };
