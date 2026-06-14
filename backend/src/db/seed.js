require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const pool = require('./pool');

const people = [
  ['Bhargaw Pradhan', 'bhargawpradhan@gmail.com', '#101817', 'admin'],
  ['Aisha Sharma', 'aisha@example.com', '#127767', 'user'],
  ['Rohan Mehta', 'rohan@example.com', '#3269a8', 'user'],
  ['Priya Nair', 'priya@example.com', '#c58a1f', 'user'],
  ['Meera Rao', 'meera@example.com', '#e65f4d', 'user'],
  ['Dev Kapoor', 'dev@example.com', '#7a4bc0', 'user'],
  ['Sam Verma', 'sam@example.com', '#0f8a9d', 'user'],
  ['Kabir Guest', 'kabir@example.com', '#7b6a4a', 'user']
];

const expenses = [
  ['2026-02-01','February rent','Aisha',48000,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',[]],
  ['2026-02-03','Groceries BigBasket','Priya',2340,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',[]],
  ['2026-02-05','Wifi bill Feb','Rohan',1199,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',[]],
  ['2026-02-08','Dinner at Marina Bites','Dev',3200,'INR','equal',['Aisha','Rohan','Priya','Dev'],null,'Dev visiting for the weekend',['possible_duplicate']],
  ['2026-02-08','dinner - marina bites','Dev',3200,'INR','equal',['Aisha','Rohan','Priya','Dev'],null,'',['possible_duplicate']],
  ['2026-02-10','Electricity Feb','Aisha',1200,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',['amount_comma_normalized']],
  ['2026-02-12','Maid salary Feb','Meera',3000,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',[]],
  ['2026-02-14','Movie night snacks','Priya',640,'INR','equal',['Aisha','Rohan','Priya'],null,'Meera skipped',['payer_case_normalized']],
  ['2026-02-15','Cylinder refill','Rohan',899.995,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',['excess_decimal_precision']],
  ['2026-02-18','Groceries DMart','Priya',1875,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',['payer_alias_priya_s_normalized']],
  ['2026-02-20','Aisha birthday cake','Rohan',1500,'INR','unequal',['Rohan','Priya','Meera'],[700,400,400],'Aisha not charged obviously',[]],
  ['2026-02-22','House cleaning supplies',null,780,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,"can't remember who paid",['missing_payer']],
  ['2026-02-25','Rohan paid Aisha back','Rohan',5000,'INR','settlement',['Aisha'],null,'this is a settlement not an expense??',['settlement_detected']],
  ['2026-02-28','Pizza Friday','Aisha',1440,'INR','percentage',['Aisha','Rohan','Priya','Meera'],[30,30,30,20],'percentages might be off',['percentage_total_110_normalized']],
  ['2026-03-01','March rent','Aisha',48000,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',[]],
  ['2026-03-03','Groceries BigBasket','Meera',2810,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',[]],
  ['2026-03-05','Wifi bill Mar','Rohan',1199,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',[]],
  ['2026-03-08','Goa flights','Aisha',32400,'INR','equal',['Aisha','Rohan','Priya','Dev'],null,'trip starts!',[]],
  ['2026-03-09','Goa villa booking','Dev',540,'USD','equal',['Aisha','Rohan','Priya','Dev'],null,'booked on intl site',['foreign_currency']],
  ['2026-03-10','Beach shack lunch','Rohan',84,'USD','equal',['Aisha','Rohan','Priya','Dev'],null,'',['foreign_currency']],
  ['2026-03-10','Scooter rentals','Priya',3600,'INR','share',['Aisha','Rohan','Priya','Dev'],[1,2,1,2],'Rohan and Dev took the bigger ones',[]],
  ['2026-03-11','Parasailing','Dev',150,'USD','equal',['Aisha','Rohan','Priya','Dev','Kabir'],null,'Kabir joined for the day',['foreign_currency','guest_member_normalized']],
  ['2026-03-11','Dinner at Thalassa','Aisha',2400,'INR','equal',['Aisha','Rohan','Priya','Dev'],null,'',['possible_duplicate']],
  ['2026-03-11','Thalassa dinner','Rohan',2450,'INR','equal',['Aisha','Rohan','Priya','Dev'],null,'Aisha also logged this I think hers is wrong',['possible_duplicate']],
  ['2026-03-12','Parasailing refund','Dev',-30,'USD','equal',['Aisha','Rohan','Priya','Dev'],null,'one slot got cancelled',['foreign_currency','negative_refund']],
  ['2026-03-14','Airport cab','Rohan',1100,'INR','equal',['Aisha','Rohan','Priya','Dev'],null,'',['date_mar_14_normalized','payer_case_normalized']],
  ['2026-03-15','Groceries DMart','Priya',2105,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'forgot to set currency',['missing_currency_defaulted_inr']],
  ['2026-03-18','Electricity Mar','Aisha',1450,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',[]],
  ['2026-03-20','Maid salary Mar','Meera',3000,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'',[]],
  ['2026-03-22','Dinner order Swiggy','Priya',0,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'counted twice earlier - fixing later',['zero_amount']],
  ['2026-03-25','Weekend brunch','Meera',2200,'INR','percentage',['Aisha','Rohan','Priya','Meera'],[30,30,30,20],'',['percentage_total_110_normalized']],
  ['2026-03-28','Meera farewell dinner','Aisha',4800,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'Meera moving out Sunday :(',[]],
  ['2026-05-04','Deep cleaning service','Rohan',2500,'INR','equal',['Aisha','Rohan','Priya'],null,'is this April 5 or May 4? format is a mess',['ambiguous_date_stored_as_2026_05_04']],
  ['2026-04-01','April rent','Aisha',48000,'INR','share',['Aisha','Rohan','Priya'],[2,1,1],"Aisha took Meera's room too",[]],
  ['2026-04-02','Groceries BigBasket','Priya',2640,'INR','equal',['Aisha','Rohan','Priya','Meera'],null,'oops Meera still in the group list',['former_member_included']],
  ['2026-04-05','Wifi bill Apr','Rohan',1199,'INR','equal',['Aisha','Rohan','Priya'],null,'',[]],
  ['2026-04-08','Sam deposit share','Sam',15000,'INR','equal',['Aisha'],null,'Sam moving in! paid Aisha his deposit',['possible_settlement']],
  ['2026-04-10','Housewarming drinks','Sam',3100,'INR','equal',['Aisha','Rohan','Priya','Sam'],null,'',[]],
  ['2026-04-12','Electricity Apr','Aisha',1380,'INR','equal',['Aisha','Rohan','Priya','Sam'],null,'',[]],
  ['2026-04-15','Groceries DMart','Sam',1990,'INR','equal',['Aisha','Rohan','Priya','Sam'],null,'',[]],
  ['2026-04-18','Furniture for common room','Aisha',12000,'INR','equal',['Aisha','Rohan','Priya','Sam'],null,'split_type says equal but someone added shares anyway',['ignored_redundant_share_details']],
  ['2026-04-20','Maid salary Apr','Priya',3000,'INR','equal',['Aisha','Rohan','Priya','Sam'],null,'',[]]
];

function owedAmounts(amount, splitType, participants, details) {
  if (splitType === 'unequal') return details;
  if (splitType === 'percentage') {
    const total = details.reduce((sum, value) => sum + value, 0);
    return details.map((value) => amount * value / total);
  }
  if (splitType === 'share') {
    const total = details.reduce((sum, value) => sum + value, 0);
    return details.map((value) => amount * value / total);
  }
  return participants.map(() => amount / participants.length);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash('assignment', 10);
    const adminPasswordHash = await bcrypt.hash('123456789', 10);
    const users = {};
    for (const [name, email, color, role] of people) {
      const result = await client.query(
        `INSERT INTO users(name,email,password_hash,avatar_color)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name, password_hash=EXCLUDED.password_hash, avatar_color=EXCLUDED.avatar_color, role=$5
         RETURNING id,name`,
        [name, email, role === 'admin' ? adminPasswordHash : passwordHash, color, role]
      );
      users[name.split(' ')[0]] = result.rows[0].id;
      if (role === 'admin') users.Admin = result.rows[0].id;
      await client.query('UPDATE users SET role=$1, auth_provider=$2 WHERE id=$3', [role, 'password', result.rows[0].id]);
    }

    let group = await client.query('SELECT id FROM groups WHERE name=$1 ORDER BY created_at ASC LIMIT 1', ['Koramangala Roommates']);
    if (!group.rows.length) {
      group = await client.query(
        `INSERT INTO groups(name,description,created_by)
         VALUES($1,$2,$3)
         RETURNING id`,
        ['Koramangala Roommates', 'Seed group for the Spreetail Splitwise assignment.', users.Aisha]
      );
    }
    const groupId = group.rows[0].id;

    for (const userId of Object.values(users)) {
      await client.query(
        'INSERT INTO group_members(group_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [groupId, userId]
      );
    }

    await client.query(`DELETE FROM expenses WHERE group_id=$1 AND import_flags->>'source'='assignment-seed'`, [groupId]);
    await client.query(`DELETE FROM settlements WHERE group_id=$1 AND notes IN ('Rohan paid Aisha back','Sam deposit share')`, [groupId]);
    for (const [date, description, payer, amount, currency, splitType, participants, details, notes, flags] of expenses) {
        const expense = await client.query(
          `INSERT INTO expenses(group_id,description,amount,currency,paid_by,split_type,date,notes,created_by,is_settlement,import_flags)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [groupId, description, amount, currency, payer ? users[payer] : null, splitType, date, notes, users.Admin, splitType === 'settlement', JSON.stringify({ source: 'assignment-seed', flags })]
        );
        const owed = splitType === 'settlement' ? participants.map(() => amount) : owedAmounts(amount, splitType, participants, details);
        for (let index = 0; index < participants.length; index += 1) {
          await client.query(
            `INSERT INTO expense_splits(expense_id,user_id,owed_amount,raw_percentage,raw_shares)
             VALUES($1,$2,$3,$4,$5)`,
            [
              expense.rows[0].id,
              users[participants[index]],
              owed[index].toFixed(4),
              splitType === 'percentage' ? details[index] : null,
              splitType === 'share' ? details[index] : null
            ]
          );
        }
      }

    await client.query(
      `INSERT INTO settlements(group_id,paid_by,paid_to,amount,currency,date,notes,created_by)
       VALUES($1,$2,$3,$4,'INR',$5,$6,$7)`,
      [groupId, users.Rohan, users.Aisha, 5000, '2026-02-25', 'Rohan paid Aisha back', users.Admin]
    );

    await client.query('DELETE FROM import_reports WHERE group_id=$1 AND filename=$2', [groupId, 'assignment-expenses.csv']);
    await client.query(
      `INSERT INTO import_reports(filename,total_rows,imported,skipped,anomalies,group_id)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [
        'assignment-expenses.csv',
        42,
        42,
        0,
        JSON.stringify([
          { issue: 'duplicate candidate', action: 'stored and flagged' },
          { issue: 'missing payer', action: 'stored with null paid_by and flagged' },
          { issue: 'foreign currency', action: 'stored in original USD currency' },
          { issue: 'negative refund', action: 'stored as negative amount' },
          { issue: 'zero amount correction', action: 'stored as zero amount row' },
          { issue: 'ambiguous date', action: 'stored as 2026-05-04 and flagged' },
          { issue: 'name aliases/case', action: 'normalized to existing users and flagged' }
        ]),
        groupId
      ]
    );

    const supportCount = await client.query('SELECT COUNT(*)::int AS count FROM support_messages');
    if (supportCount.rows[0].count === 0) {
      await client.query(
        `INSERT INTO support_messages(sender_id,recipient_id,sender_role,content,metadata)
         VALUES($1,$2,'user',$3,$4),($2,$1,'admin',$5,$6)`,
        [
          users.Aisha,
          users.Admin,
          'Please review the duplicate Marina dinner before final settlement.',
          JSON.stringify({ source: 'seed' }),
          'Marked as duplicate candidate. Keeping both rows visible in the import report.',
          JSON.stringify({ source: 'seed' })
        ]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete. User password: assignment. Admin: bhargawpradhan@gmail.com / 123456789');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
