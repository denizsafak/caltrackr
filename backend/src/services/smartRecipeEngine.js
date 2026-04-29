const recipeRepository = require("../repositories/recipeRepository");
const { FastestRecipesStrategy, AllergenSafeStrategy } = require("../patterns/recipeStrategies");

class SmartRecipeEngine {
  async search(input = {}) {
    const availableIngredients = this.normalizeList(input.ingredients);
    const excludedIngredients = this.normalizeList(input.excludeIngredients);
    const excludedAllergens = this.normalizeList(input.excludeAllergens);
    const maxPrepTime = input.maxPrepTime ? Number(input.maxPrepTime) : null;

    let recipes = await recipeRepository.getAllRecipes();

    recipes = recipes
      .map((recipe) => ({
        ...recipe,
        matchCount: recipe.ingredients.filter((ingredient) =>
          availableIngredients.includes(ingredient.name.toLowerCase())
        ).length
      }))
      .filter((recipe) => recipe.matchCount > 0)
      .filter((recipe) =>
        recipe.ingredients.every(
          (ingredient) => !excludedIngredients.includes(ingredient.name.toLowerCase())
        )
      );

    if (maxPrepTime) {
      recipes = recipes.filter((recipe) => recipe.prepTimeMinutes <= maxPrepTime);
    }

    recipes = new AllergenSafeStrategy(excludedAllergens).apply(recipes);

    if (input.strategy === "fastest") {
      recipes = new FastestRecipesStrategy().apply(recipes);
    } else {
      recipes = recipes.sort((a, b) => b.matchCount - a.matchCount);
    }

    return recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fats: recipe.fats,
      prepTimeMinutes: recipe.prepTimeMinutes,
      ingredients: recipe.ingredients.map((ingredient) => ingredient.name),
      matchCount: recipe.matchCount
    }));
  }

  normalizeList(value) {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    }

    return String(value)
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }
}

module.exports = { SmartRecipeEngine };
