const express = require("express");
const { defaultUserId } = require("../config/appConfig");
const userRepository = require("../repositories/userRepository");

function createProfileRoutes() {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const user = await userRepository.getDefaultUser();
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  router.put("/goal", async (req, res, next) => {
    try {
      const dailyGoal = Number(req.body.dailyGoal);
      if (!Number.isFinite(dailyGoal) || dailyGoal < 800) {
        throw new Error("Daily goal must be at least 800 calories.");
      }

      const user = await userRepository.updateDailyGoal(defaultUserId, Math.round(dailyGoal));
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createProfileRoutes };
