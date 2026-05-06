export type MacroTotals = {
  protein: number;
  carbs: number;
  fats: number;
};

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type UserRole = 'user' | 'dietitian' | 'admin';

export type Recipe = {
  id: string;
  title: string;
  summary: string;
  mealType: MealType;
  calories: number;
  macros: MacroTotals;
  prepMinutes: number;
  ingredients: string[];
  allergens: string[];
  imageUrl: string;
  instructions: string[];
  tags: string[];
  source?: 'local' | 'spoonacular' | 'themealdb';
  sourceUrl?: string;
};

export type MealLog = {
  id: string;
  date: string;
  mealType: MealType;
  title: string;
  calories: number;
  macros: MacroTotals;
  ingredients: string[];
  recipeId?: string;
  sourcePlanId?: string;
  sourcePlanMealId?: string;
  createdAt?: unknown;
};

export type PlanMeal = {
  id: string;
  mealType: MealType;
  title: string;
  calories: number;
  recipeId?: string;
};

export type PlanDay = {
  date: string;
  dayLabel: string;
  meals: PlanMeal[];
};

export type WeeklyPlan = {
  id: string;
  title: string;
  weekStart: string;
  days: PlanDay[];
  createdByUid?: string;
  createdByRole?: UserRole;
  createdAt?: unknown;
};

export type ShoppingItem = {
  id: string;
  label: string;
  quantity: string;
  checked: boolean;
  source?: string;
};

export type ShoppingList = {
  id: string;
  title: string;
  createdFromPlanId?: string;
  items: ShoppingItem[];
  createdAt?: unknown;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dailyGoal: number;
  macroTargets: MacroTotals;
  weightKg: number;
  targetWeightKg: number;
  preferences: {
    vegan: boolean;
    nutAllergy: boolean;
    intermittentFasting: boolean;
  };
  allergens: string[];
  dietitianId?: string | null;
  clientIds?: string[];
  createdAt?: unknown;
};

export type MealDraft = {
  title: string;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string;
  recipeId?: string;
  date?: string;
};
