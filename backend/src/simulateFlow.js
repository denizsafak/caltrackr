process.env.DB_FILE = ":memory:";

const { CalorieCalculatorService } = require("./services/calorieCalculatorService");
const { ProgressBarObserver, LimitAlertObserver } = require("./patterns/observer");
const { initDatabase } = require("./database/schema");

async function simulate() {
  await initDatabase();

  const service = new CalorieCalculatorService();
  service.addObserver(new ProgressBarObserver());
  service.addObserver(new LimitAlertObserver());

  const result = await service.addMeal({
    name: "Chicken Rice Power Plate",
    calories: 1850,
    protein: 46,
    carbs: 64,
    fats: 18
  });

  const today = await service.getToday();

  console.log("1. User logged meal:", result.meal.name);
  console.log("2. Calories after update:", today.consumed, "/", today.goal);
  console.log("3. Progress bar observer:", result.observerUpdates[0]);
  console.log("4. Limit alert observer:", result.observerUpdates[1]);
}

simulate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
