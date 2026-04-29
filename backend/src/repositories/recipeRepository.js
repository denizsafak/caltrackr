const { all } = require("../database/connection");

async function getAllRecipes() {
  const rows = await all(`
    SELECT
      r.id,
      r.name,
      r.calories,
      r.protein,
      r.carbs,
      r.fats,
      r.prep_time_minutes AS prepTimeMinutes,
      i.name AS ingredientName,
      i.allergen_tag AS allergenTag
    FROM recipes r
    JOIN recipe_ingredients ri ON ri.recipe_id = r.id
    JOIN ingredients i ON i.id = ri.ingredient_id
    ORDER BY r.id
  `);

  const recipesById = new Map();
  for (const row of rows) {
    if (!recipesById.has(row.id)) {
      recipesById.set(row.id, {
        id: row.id,
        name: row.name,
        calories: row.calories,
        protein: row.protein,
        carbs: row.carbs,
        fats: row.fats,
        prepTimeMinutes: row.prepTimeMinutes,
        ingredients: []
      });
    }

    recipesById.get(row.id).ingredients.push({
      name: row.ingredientName,
      allergenTag: row.allergenTag
    });
  }

  return Array.from(recipesById.values());
}

module.exports = { getAllRecipes };
