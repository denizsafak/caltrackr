const { run, all } = require("../database/connection");

async function createMeal(meal) {
  const result = await run(
    `INSERT INTO meals (user_id, name, calories, protein, carbs, fats, meal_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      meal.userId,
      meal.name,
      meal.calories,
      meal.protein,
      meal.carbs,
      meal.fats,
      meal.date
    ]
  );

  return { id: result.id, ...meal };
}

async function getMealsByDate(userId, date) {
  return all(
    `SELECT id, name, calories, protein, carbs, fats, meal_date AS date, created_at
     FROM meals
     WHERE user_id = ? AND meal_date = ?
     ORDER BY created_at DESC`,
    [userId, date]
  );
}

async function deleteMeal(userId, mealId) {
  return run("DELETE FROM meals WHERE user_id = ? AND id = ?", [userId, mealId]);
}

module.exports = { createMeal, getMealsByDate, deleteMeal };
