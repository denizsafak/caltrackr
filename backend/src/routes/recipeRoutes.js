const express = require("express");

function createRecipeRoutes(smartRecipeEngine) {
  const router = express.Router();

  router.post("/search", async (req, res, next) => {
    try {
      const recipes = await smartRecipeEngine.search(req.body);
      res.json({ recipes });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createRecipeRoutes };
