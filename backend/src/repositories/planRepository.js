const { get, run } = require("../database/connection");

async function saveCurrentPlan(userId, startDate, plan) {
  await run("UPDATE weekly_plans SET is_current = 0 WHERE user_id = ?", [userId]);
  const result = await run(
    `INSERT INTO weekly_plans (user_id, start_date, plan_json, is_current)
     VALUES (?, ?, ?, 1)`,
    [userId, startDate, JSON.stringify(plan)]
  );

  return { id: result.id, userId, startDate, days: plan };
}

async function getCurrentPlan(userId) {
  const row = await get(
    `SELECT id, start_date AS startDate, plan_json AS planJson
     FROM weekly_plans
     WHERE user_id = ? AND is_current = 1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (!row) {
    return null;
  }

  return { id: row.id, startDate: row.startDate, days: JSON.parse(row.planJson) };
}

async function saveTemplate(userId, name, plan) {
  const result = await run(
    "INSERT INTO templates (user_id, name, plan_json) VALUES (?, ?, ?)",
    [userId, name, JSON.stringify(plan)]
  );

  return { id: result.id, userId, name, days: plan };
}

module.exports = { saveCurrentPlan, getCurrentPlan, saveTemplate };
