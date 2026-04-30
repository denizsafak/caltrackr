import { MealType, PlanDay, PlanTemplate, Recipe, ShoppingList, UserProfile, WeeklyPlan } from '@/types/domain';

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDaysISO = (start: string, offset: number) => {
  const date = new Date(`${start}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const planMealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

export const defaultProfile = (uid: string, email: string, name = 'New user'): UserProfile => ({
  id: uid,
  name,
  email,
  role: 'user',
  dailyGoal: 1800,
  macroTargets: { protein: 115, carbs: 220, fats: 60 },
  weightKg: 78,
  targetWeightKg: 70,
  preferences: {
    vegan: false,
    nutAllergy: false,
    intermittentFasting: false,
  },
  allergens: [],
  pantry: [],
  dietitianId: null,
});

const randomRecipe = (pool: Recipe[], currentRecipeId?: string) => {
  const candidates = pool.filter((recipe) => recipe.id !== currentRecipeId);
  const options = candidates.length ? candidates : pool;
  return options[Math.floor(Math.random() * options.length)];
};

export const buildPlanFromRecipes = (
  recipes: Recipe[],
  id = `week-${todayISO()}`,
  start = todayISO(),
  mealTypes = planMealTypes,
  currentPlan?: WeeklyPlan | null,
): WeeklyPlan => {
  if (!recipes.length) {
    throw new Error('Add recipes to Firestore or fetch live API recipes before generating a weekly plan.');
  }

  const days: PlanDay[] = dayNames.map((dayLabel, dayIndex) => {
    const date = addDaysISO(start, dayIndex);
    const meals = mealTypes.map((mealType, mealIndex) => {
      const recipePool = recipes.filter((recipe) => recipe.mealType === mealType);
      const currentMeal = currentPlan?.days[dayIndex]?.meals[mealIndex];
      const recipe = randomRecipe(recipePool.length ? recipePool : recipes, currentMeal?.recipeId);

      return {
        id: `${dayIndex}-${mealType.toLowerCase()}-${recipe.id}`,
        mealType,
        title: recipe.title,
        calories: recipe.calories,
        recipeId: recipe.id,
      };
    });

    return {
      date,
      dayLabel,
      meals,
    };
  });

  return {
    id,
    title: 'Generated weekly meal plan',
    weekStart: start,
    days,
  };
};

export const buildTemplateFromPlan = (plan: WeeklyPlan, title?: string): PlanTemplate => {
  const averageCalories = Math.round(
    plan.days.reduce((sum, day) => sum + day.meals.reduce((mealSum, meal) => mealSum + meal.calories, 0), 0) /
      plan.days.length,
  );
  const cleanTitle = title?.trim();

  return {
    id: `template-${Date.now()}`,
    title: cleanTitle || `${plan.title} template`,
    averageCalories,
    days: plan.days,
  };
};

export const buildShoppingList = (plan: WeeklyPlan, recipes: Recipe[]): ShoppingList => {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const counts = new Map<string, number>();

  plan.days.forEach((day) => {
    day.meals.forEach((meal) => {
      const recipe = meal.recipeId ? recipeById.get(meal.recipeId) : recipes.find((item) => item.title === meal.title);
      recipe?.ingredients.forEach((ingredient) => counts.set(ingredient, (counts.get(ingredient) ?? 0) + 1));
    });
  });

  return {
    id: `shopping-${plan.id}`,
    title: 'This Week Shopping List',
    createdFromPlanId: plan.id,
    items: Array.from(counts.entries()).map(([label, count], index) => ({
      id: `${index}-${label.replace(/\s+/g, '-')}`,
      label,
      quantity: count > 1 ? `${count} portions` : '1 portion',
      checked: false,
    })),
  };
};
