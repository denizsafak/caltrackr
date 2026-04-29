const express = require("express");

function createMealRoutes(calorieCalculatorService) {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    try {
      const result = await calorieCalculatorService.addMeal(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/today", async (req, res, next) => {
    try {
      const summary = await calorieCalculatorService.getToday();
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createMealRoutes };
