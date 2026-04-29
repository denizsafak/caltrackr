const { defaultUserId } = require("../config/appConfig");
const planRepository = require("../repositories/planRepository");
const userRepository = require("../repositories/userRepository");
const { WeeklyPlanMemento } = require("../patterns/memento");

const mealBank = {
  breakfast: [
    { name: "Greek yogurt, berries, oats", caloriesRatio: 0.24 },
    { name: "Avocado egg toast", caloriesRatio: 0.26 },
    { name: "Banana peanut oats", caloriesRatio: 0.25 }
  ],
  lunch: [
    { name: "Chicken rice power plate", caloriesRatio: 0.36 },
    { name: "Lentil tomato soup with salad", caloriesRatio: 0.34 },
    { name: "Turkey hummus wrap", caloriesRatio: 0.35 }
  ],
  dinner: [
    { name: "Salmon quinoa salad", caloriesRatio: 0.40 },
    { name: "Tofu vegetable stir fry", caloriesRatio: 0.39 },
    { name: "Lean beef sweet potato bowl", caloriesRatio: 0.41 }
  ]
};

class WeeklyDietManager {
  constructor() {
    this.lastGeneratedMemento = null;
  }

  async generatePlan(input = {}) {
    const user = await userRepository.getDefaultUser();
    const dailyGoal = Number(input.dailyGoal || user.daily_calorie_goal);
    const startDate = input.startDate || new Date().toISOString().slice(0, 10);
    const days = this.buildSevenDayPlan(startDate, dailyGoal);

    this.lastGeneratedMemento = new WeeklyPlanMemento(days);
    return planRepository.saveCurrentPlan(defaultUserId, startDate, days);
  }

  async getCurrentPlan() {
    return planRepository.getCurrentPlan(defaultUserId);
  }

  async saveTemplate(input = {}) {
    const current = await planRepository.getCurrentPlan(defaultUserId);
    if (!current && !this.lastGeneratedMemento) {
      throw new Error("Generate a plan before saving a template.");
    }

    const plan = current ? current.days : this.lastGeneratedMemento.restore();
    return planRepository.saveTemplate(defaultUserId, input.name || "Reusable weekly plan", plan);
  }

  buildSevenDayPlan(startDate, dailyGoal) {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${startDate}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + index);

      return {
        day: index + 1,
        date: date.toISOString().slice(0, 10),
        breakfast: this.pickMeal("breakfast", index, dailyGoal),
        lunch: this.pickMeal("lunch", index, dailyGoal),
        dinner: this.pickMeal("dinner", index, dailyGoal)
      };
    });
  }

  pickMeal(type, index, dailyGoal) {
    const option = mealBank[type][index % mealBank[type].length];
    return {
      name: option.name,
      calories: Math.round(dailyGoal * option.caloriesRatio)
    };
  }
}

module.exports = { WeeklyDietManager };
