const { get, run } = require("../database/connection");

async function upsertDailyLog(userId, date, totals) {
  await run(
    `INSERT INTO daily_logs
      (user_id, log_date, total_calories, total_protein, total_carbs, total_fats, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, log_date) DO UPDATE SET
      total_calories = excluded.total_calories,
      total_protein = excluded.total_protein,
      total_carbs = excluded.total_carbs,
      total_fats = excluded.total_fats,
      updated_at = CURRENT_TIMESTAMP`,
    [userId, date, totals.calories, totals.protein, totals.carbs, totals.fats]
  );

  return getDailyLog(userId, date);
}

async function getDailyLog(userId, date) {
  return get(
    `SELECT log_date AS date, total_calories AS calories, total_protein AS protein,
      total_carbs AS carbs, total_fats AS fats
     FROM daily_logs
     WHERE user_id = ? AND log_date = ?`,
    [userId, date]
  );
}

module.exports = { upsertDailyLog, getDailyLog };
