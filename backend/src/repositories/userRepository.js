const { get, run } = require("../database/connection");

async function getDefaultUser() {
  return get("SELECT * FROM users WHERE id = 1");
}

async function updateDailyGoal(userId, dailyGoal) {
  await run("UPDATE users SET daily_calorie_goal = ? WHERE id = ?", [dailyGoal, userId]);
  return get("SELECT * FROM users WHERE id = ?", [userId]);
}

module.exports = { getDefaultUser, updateDailyGoal };
