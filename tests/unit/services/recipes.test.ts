import {
  searchMealDbRecipes,
  searchSpoonacularRecipes,
  searchMealDbAndSpoonacularRecipes,
  getExternalRecipeById,
  searchExternalRecipes
} from '@/services/recipes';

// Mock fetch globally
global.fetch = jest.fn();

describe('Recipes Service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('searchMealDbRecipes', () => {
    it('returns null if no ingredients or query provided', async () => {
      const result = await searchMealDbRecipes({ ingredients: [] });
      expect(result).toBeNull();
    });

    it('searches by query if query provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meals: [
            { idMeal: '1', strMeal: 'Test Meal', strCategory: 'Beef', strArea: 'US' }
          ]
        })
      });

      const result = await searchMealDbRecipes({ ingredients: [], query: 'Test' });
      expect(result?.recipes.length).toBe(1);
      expect(result?.recipes[0].id).toBe('themealdb-1');
      expect(result?.source).toBe('TheMealDB free API');
    });

    it('throws error if mealdb search fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(searchMealDbRecipes({ ingredients: [], query: 'Test' })).rejects.toThrow('TheMealDB recipe search returned 500');
    });

    it('searches by ingredients', async () => {
      // Mock filter.php
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meals: [
            { idMeal: '1', strMeal: 'Test Meal' }
          ]
        })
      });

      // Mock lookup.php
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meals: [
            { idMeal: '1', strMeal: 'Test Meal', strIngredient1: 'Beef', strMeasure1: '1kg', strInstructions: 'Cook it.' }
          ]
        })
      });

      const result = await searchMealDbRecipes({ ingredients: ['Beef'] });
      expect(result?.recipes.length).toBe(1);
      expect(result?.recipes[0].title).toBe('Test Meal');
    });
  });

  describe('searchSpoonacularRecipes', () => {
    it('returns null if no EXPO_PUBLIC_SPOONACULAR_API_KEY', async () => {
      const old = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;
      delete process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;
      const result = await searchSpoonacularRecipes({ ingredients: ['chicken'] });
      expect(result).toBeNull();
      process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY = old;
    });

    it('searches by query', async () => {
      process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY = 'test-key';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { id: 1, title: 'Test Spoonacular Meal', nutrition: { nutrients: [{ name: 'Calories', amount: 500 }] } }
          ]
        })
      });

      const result = await searchSpoonacularRecipes({ ingredients: [], query: 'Test' });
      expect(result?.recipes.length).toBe(1);
      expect(result?.recipes[0].id).toBe('spoonacular-1');
      expect(result?.source).toBe('Spoonacular');
    });

    it('searches by ingredients', async () => {
      process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY = 'test-key';
      // Mock findByIngredients
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { id: 1, title: 'Ingredient Meal', image: 'test.jpg' }
        ])
      });
      // Mock informationBulk
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { id: 1, title: 'Ingredient Meal', readyInMinutes: 20 }
        ])
      });

      const result = await searchSpoonacularRecipes({ ingredients: ['chicken'] });
      expect(result?.recipes.length).toBe(1);
      expect(result?.recipes[0].prepMinutes).toBe(20);
    });
  });

  describe('searchMealDbAndSpoonacularRecipes', () => {
    it('combines results from both', async () => {
      process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY = 'test-key';
      
      // Mock for MealDb search
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meals: [{ idMeal: '1', strMeal: 'MealDB Meal' }]
        })
      });
      // Mock for Spoonacular search
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 1, title: 'Spoon Meal' }]
        })
      });

      const result = await searchMealDbAndSpoonacularRecipes({ ingredients: [], query: 'Test' });
      expect(result?.recipes.length).toBe(2);
      expect(result?.source).toContain('TheMealDB');
      expect(result?.source).toContain('Spoonacular');
    });

    it('throws if both fail', async () => {
      process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY = 'test-key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(searchMealDbAndSpoonacularRecipes({ ingredients: [], query: 'Test' })).rejects.toBeTruthy();
    });
  });

  describe('getExternalRecipeById', () => {
    it('gets MealDB recipe', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meals: [{ idMeal: '1', strMeal: 'MealDB Meal' }]
        })
      });

      const result = await getExternalRecipeById('themealdb-1');
      expect(result?.id).toBe('themealdb-1');
    });

    it('gets Spoonacular recipe', async () => {
      process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY = 'test-key';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1, title: 'Spoon Meal'
        })
      });

      const result = await getExternalRecipeById('spoonacular-1');
      expect(result?.id).toBe('spoonacular-1');
    });

    it('returns null for unknown prefix', async () => {
      const result = await getExternalRecipeById('unknown-1');
      expect(result).toBeNull();
    });
  });

  describe('searchExternalRecipes', () => {
    it('uses fallback if MealDB fails', async () => {
      process.env.EXPO_PUBLIC_ENABLE_SPOONACULAR_FALLBACK = 'true';
      process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY = 'test-key';

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // MealDB fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      // Spoonacular succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 1, title: 'Spoon Meal' }]
        })
      });

      const result = await searchExternalRecipes({ ingredients: [], query: 'Test' });
      expect(result?.source).toBe('Spoonacular');
      
      warnSpy.mockRestore();
    });
  });
});
