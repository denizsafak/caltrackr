require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { initDatabase } = require("./database/schema");
const { CalorieCalculatorService } = require("./services/calorieCalculatorService");
const { WeeklyDietManager } = require("./services/weeklyDietManager");
const { SmartRecipeEngine } = require("./services/smartRecipeEngine");
const { ProgressBarObserver, LimitAlertObserver } = require("./patterns/observer");
const { createMealRoutes } = require("./routes/mealRoutes");
const { createPlanRoutes } = require("./routes/planRoutes");
const { createRecipeRoutes } = require("./routes/recipeRoutes");
const { createProfileRoutes } = require("./routes/profileRoutes");

async function createApp() {
  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());

  const calorieCalculatorService = new CalorieCalculatorService();
  calorieCalculatorService.addObserver(new ProgressBarObserver());
  calorieCalculatorService.addObserver(new LimitAlertObserver());

  app.get("/health", (req, res) => {
    res.json({ status: "ok", app: "CalTrackr" });
  });

  app.use("/meals", createMealRoutes(calorieCalculatorService));
  app.use("/plans", createPlanRoutes(new WeeklyDietManager()));
  app.use("/recipes", createRecipeRoutes(new SmartRecipeEngine()));
  app.use("/profile", createProfileRoutes());

  app.use((error, req, res, next) => {
    res.status(400).json({ message: error.message || "Something went wrong." });
  });

  return app;
}

module.exports = { createApp };
