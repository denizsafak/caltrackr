const { run, get } = require("./connection");

async function createTables() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      daily_calorie_goal INTEGER NOT NULL DEFAULT 2000,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fats REAL NOT NULL DEFAULT 0,
      meal_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      log_date TEXT NOT NULL,
      total_calories INTEGER NOT NULL DEFAULT 0,
      total_protein REAL NOT NULL DEFAULT 0,
      total_carbs REAL NOT NULL DEFAULT 0,
      total_fats REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, log_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS weekly_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      plan_json TEXT NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      plan_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fats REAL NOT NULL,
      prep_time_minutes INTEGER NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      allergen_tag TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      recipe_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      PRIMARY KEY (recipe_id, ingredient_id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    )
  `);
}

async function seedData() {
  const user = await get("SELECT id FROM users WHERE id = 1");
  if (!user) {
    await run(
      "INSERT INTO users (id, name, daily_calorie_goal) VALUES (1, ?, ?)",
      ["Demo User", 2000]
    );
  }

  const recipeCount = await get("SELECT COUNT(*) AS count FROM recipes");
  if (recipeCount.count > 0) {
    return;
  }

  const recipes = [
    {
      name: "Greek Yogurt Berry Bowl",
      calories: 320,
      protein: 28,
      carbs: 42,
      fats: 5,
      prep: 8,
      ingredients: [["greek yogurt", "dairy"], ["berries", null], ["oats", "gluten"], ["honey", null]]
    },
    {
      name: "Chicken Rice Power Plate",
      calories: 610,
      protein: 46,
      carbs: 64,
      fats: 18,
      prep: 25,
      ingredients: [["chicken", null], ["rice", null], ["broccoli", null], ["olive oil", null]]
    },
    {
      name: "Avocado Egg Toast",
      calories: 430,
      protein: 18,
      carbs: 38,
      fats: 23,
      prep: 12,
      ingredients: [["egg", "egg"], ["avocado", null], ["bread", "gluten"], ["lemon", null]]
    },
    {
      name: "Lentil Tomato Soup",
      calories: 380,
      protein: 24,
      carbs: 56,
      fats: 7,
      prep: 30,
      ingredients: [["lentils", null], ["tomato", null], ["carrot", null], ["onion", null]]
    },
    {
      name: "Salmon Quinoa Salad",
      calories: 540,
      protein: 39,
      carbs: 44,
      fats: 22,
      prep: 20,
      ingredients: [["salmon", "fish"], ["quinoa", null], ["spinach", null], ["cucumber", null]]
    }
  ];

  const ingredientIds = new Map();
  for (const recipe of recipes) {
    const insertedRecipe = await run(
      `INSERT INTO recipes (name, calories, protein, carbs, fats, prep_time_minutes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [recipe.name, recipe.calories, recipe.protein, recipe.carbs, recipe.fats, recipe.prep]
    );

    for (const [ingredientName, allergenTag] of recipe.ingredients) {
      if (!ingredientIds.has(ingredientName)) {
        const insertedIngredient = await run(
          "INSERT OR IGNORE INTO ingredients (name, allergen_tag) VALUES (?, ?)",
          [ingredientName, allergenTag]
        );
        const row = await get("SELECT id FROM ingredients WHERE name = ?", [ingredientName]);
        ingredientIds.set(ingredientName, insertedIngredient.id || row.id);
      }

      await run(
        "INSERT INTO recipe_ingredients (recipe_id, ingredient_id) VALUES (?, ?)",
        [insertedRecipe.id, ingredientIds.get(ingredientName)]
      );
    }
  }
}

async function initDatabase() {
  await createTables();
  await seedData();
}

module.exports = { initDatabase };
