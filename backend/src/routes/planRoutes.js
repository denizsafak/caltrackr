const express = require("express");

function createPlanRoutes(weeklyDietManager) {
  const router = express.Router();

  router.post("/generate", async (req, res, next) => {
    try {
      const plan = await weeklyDietManager.generatePlan(req.body);
      res.status(201).json(plan);
    } catch (error) {
      next(error);
    }
  });

  router.get("/current", async (req, res, next) => {
    try {
      const plan = await weeklyDietManager.getCurrentPlan();
      res.json(plan);
    } catch (error) {
      next(error);
    }
  });

  router.post("/save-template", async (req, res, next) => {
    try {
      const template = await weeklyDietManager.saveTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createPlanRoutes };
