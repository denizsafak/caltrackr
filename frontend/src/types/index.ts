export type MealInput = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  date?: string;
};

export type Meal = MealInput & {
  id: number;
};

export type DailySummary = {
  date: string;
  goal: number;
  consumed: number;
  remaining: number;
  progressPercent: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  meals: Meal[];
  alert: string;
};

export type AddMealResponse = {
  meal: Meal;
  summary: DailySummary;
  observerUpdates: Array<Record<string, unknown>>;
};

export type WeeklyMeal = {
  name: string;
  calories: number;
};

export type PlanDay = {
  day: number;
  date: string;
  breakfast: WeeklyMeal;
  lunch: WeeklyMeal;
  dinner: WeeklyMeal;
};

export type WeeklyPlan = {
  id: number;
  startDate: string;
  days: PlanDay[];
};

export type Recipe = {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  prepTimeMinutes: number;
  ingredients: string[];
  matchCount: number;
};

export type UserProfile = {
  id: number;
  name: string;
  daily_calorie_goal: number;
};
