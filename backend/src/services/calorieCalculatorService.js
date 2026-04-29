const { defaultUserId } = require("../config/appConfig");
const mealRepository = require("../repositories/mealRepository");
const dailyLogRepository = require("../repositories/dailyLogRepository");
const userRepository = require("../repositories/userRepository");
const { CalorieSubject } = require("../patterns/observer");

class CalorieCalculatorService extends CalorieSubject {
  constructor() {
    super();
  }

  async addMeal(input) {
    const date = input.date || new Date().toISOString().slice(0, 10);
    const meal = this.validateMeal({ ...input, date });

    const savedMeal = await mealRepository.createMeal({
      userId: defaultUserId,
      ...meal
    });

    const summary = await this.recalculateDailySummary(defaultUserId, date);
    const observerUpdates = this.notify(summary);

    return { meal: savedMeal, summary, observerUpdates };
  }

  async getToday() {
    const today = new Date().toISOString().slice(0, 10);
    return this.getDailySummary(defaultUserId, today);
  }

  async getDailySummary(userId, date) {
    const meals = await mealRepository.getMealsByDate(userId, date);
    const user = await userRepository.getDefaultUser();
    const totals = this.calculateTotals(meals);
    const log = await dailyLogRepository.upsertDailyLog(userId, date, totals);

    return this.buildSummary(date, meals, log, user.daily_calorie_goal);
  }

  async recalculateDailySummary(userId, date) {
    return this.getDailySummary(userId, date);
  }

  validateMeal(input) {
    if (!input.name || !String(input.name).trim()) {
      throw new Error("Meal name is required.");
    }

    const calories = Number(input.calories);
    if (!Number.isFinite(calories) || calories <= 0) {
      throw new Error("Calories must be a positive number.");
    }

    return {
      name: String(input.name).trim(),
      calories: Math.round(calories),
      protein: Number(input.protein || 0),
      carbs: Number(input.carbs || 0),
      fats: Number(input.fats || 0),
      date: input.date
    };
  }

  calculateTotals(meals) {
    return meals.reduce(
      (totals, meal) => ({
        calories: totals.calories + Number(meal.calories),
        protein: totals.protein + Number(meal.protein),
        carbs: totals.carbs + Number(meal.carbs),
        fats: totals.fats + Number(meal.fats)
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }

  buildSummary(date, meals, log, goal) {
    const progressPercent = Math.min(150, Math.round((log.calories / goal) * 100));

    return {
      date,
      goal,
      consumed: log.calories,
      remaining: Math.max(goal - log.calories, 0),
      progressPercent,
      macros: {
        protein: log.protein,
        carbs: log.carbs,
        fats: log.fats
      },
      meals,
      alert:
        progressPercent >= 100
          ? "Daily calorie goal exceeded."
          : progressPercent >= 90
            ? "You are close to your daily calorie goal."
            : "You are on track."
    };
  }
}

module.exports = { CalorieCalculatorService };
