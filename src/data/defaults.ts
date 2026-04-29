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

type StarterMealTemplate = {
  mealType: MealType;
  title: string;
  ratio: number;
  tags: string[];
};

const starterMealTemplates: StarterMealTemplate[] = [
  { mealType: 'Breakfast', title: 'Turkey egg breakfast skillet', ratio: 0.3, tags: ['meat', 'high-protein'] },
  { mealType: 'Breakfast', title: 'Greek yogurt berry bowl', ratio: 0.25, tags: ['dairy', 'high-protein'] },
  { mealType: 'Breakfast', title: 'Egg toast and greens', ratio: 0.28, tags: ['high-protein'] },
  { mealType: 'Breakfast', title: 'Tofu scramble with avocado toast', ratio: 0.3, tags: ['vegan', 'high-protein'] },
  { mealType: 'Breakfast', title: 'Overnight oats with seeds', ratio: 0.26, tags: ['vegan'] },
  { mealType: 'Breakfast', title: 'Peanut butter banana oats', ratio: 0.3, tags: ['vegan', 'nuts'] },
  { mealType: 'Lunch', title: 'Chicken rice power bowl', ratio: 0.38, tags: ['meat', 'high-protein'] },
  { mealType: 'Lunch', title: 'Beef and sweet potato plate', ratio: 0.4, tags: ['meat', 'high-protein'] },
  { mealType: 'Lunch', title: 'Tuna pasta salad', ratio: 0.35, tags: ['fish', 'high-protein'] },
  { mealType: 'Lunch', title: 'Lentil quinoa bowl', ratio: 0.36, tags: ['vegan', 'high-protein'] },
  { mealType: 'Lunch', title: 'Chickpea vegetable wrap', ratio: 0.34, tags: ['vegan'] },
  { mealType: 'Lunch', title: 'Tofu noodle bowl', ratio: 0.37, tags: ['vegan', 'high-protein'] },
  { mealType: 'Dinner', title: 'Salmon asparagus dinner', ratio: 0.36, tags: ['fish', 'high-protein'] },
  { mealType: 'Dinner', title: 'Lean turkey chili', ratio: 0.35, tags: ['meat', 'high-protein'] },
  { mealType: 'Dinner', title: 'Chicken vegetable stir fry', ratio: 0.34, tags: ['meat', 'high-protein'] },
  { mealType: 'Dinner', title: 'Black bean fajita bowl', ratio: 0.35, tags: ['vegan', 'high-protein'] },
  { mealType: 'Dinner', title: 'Tofu curry with rice', ratio: 0.36, tags: ['vegan', 'high-protein'] },
  { mealType: 'Dinner', title: 'Vegetable soup and hummus plate', ratio: 0.32, tags: ['vegan'] },
];

const chooseStarterMeal = (
  mealType: MealType,
  preferences: UserProfile['preferences'],
  allergens: string[],
  dayIndex: number,
  offset: number,
) => {
  const allergyText = allergens.join(' ').toLowerCase();
  const pool = starterMealTemplates
    .filter((meal) => meal.mealType === mealType)
    .filter((meal) => !preferences.vegan || meal.tags.includes('vegan'))
    .filter((meal) => !preferences.nutAllergy && !allergyText.includes('nut') ? true : !meal.tags.includes('nuts'));
  const weighted = preferences.vegan ? pool : [...pool, ...pool.filter((meal) => meal.tags.includes('meat') || meal.tags.includes('fish'))];
  const options = weighted.length ? weighted : starterMealTemplates.filter((meal) => meal.mealType === mealType);

  return options[(dayIndex + offset + Math.floor(Math.random() * options.length)) % options.length];
};

export const buildStarterPlan = (
  dailyGoal = 1800,
  preferences: UserProfile['preferences'] = defaultProfile('', '').preferences,
  allergens: string[] = [],
  id = `week-${todayISO()}`,
  start = todayISO(),
): WeeklyPlan => {
  const mealsForDay = preferences.intermittentFasting
    ? (['Lunch', 'Dinner', 'Snack'] as MealType[])
    : (['Breakfast', 'Lunch', 'Dinner'] as MealType[]);

  return {
    id,
    title: preferences.vegan ? 'Generated plant-based week' : 'Generated high-protein week',
    weekStart: start,
    days: dayNames.map((dayLabel, dayIndex) => {
      return {
        date: addDaysISO(start, dayIndex),
        dayLabel,
        meals: mealsForDay.map((mealType, mealIndex) => {
          const meal = chooseStarterMeal(mealType === 'Snack' ? 'Breakfast' : mealType, preferences, allergens, dayIndex, mealIndex);
          return {
            id: `${dayIndex}-${mealType.toLowerCase()}-${mealIndex}`,
            mealType,
            title: mealType === 'Snack' ? `Fasting window snack: ${meal.title}` : meal.title,
            calories: Math.round(dailyGoal * (mealType === 'Snack' ? 0.18 : meal.ratio)),
          };
        }),
      };
    }),
  };
};

export const buildPlanFromRecipes = (recipes: Recipe[], id = `week-${todayISO()}`, start = todayISO()): WeeklyPlan => {
  if (!recipes.length) {
    throw new Error('Add recipes to Firestore or fetch live API recipes before generating a weekly plan.');
  }

  const days: PlanDay[] = dayNames.map((dayLabel, dayIndex) => {
    const date = addDaysISO(start, dayIndex);
    const meals = planMealTypes.map((mealType) => {
      const recipePool = recipes.filter((recipe) => recipe.mealType === mealType);
      const recipe = randomRecipe(recipePool.length ? recipePool : recipes);

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
      const recipe = meal.recipeId ? recipeById.get(meal.recipeId) : undefined;
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
