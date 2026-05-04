export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Gender = 'male' | 'female' | 'other';
export type DietaryPreference = 'vegetarian' | 'vegan' | 'gluten_free' | 'dairy_free' | 'keto' | 'paleo' | 'intermittent_fasting';
export type Allergen = 'nuts' | 'gluten' | 'dairy' | 'eggs' | 'soy' | 'shellfish' | 'fish';

export interface MacroGoals {
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  createdAt: string;
  dailyCalorieGoal: number;
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: Gender | null;
  activityLevel: ActivityLevel;
  dietaryPreferences: DietaryPreference[];
  allergens: Allergen[];
  macroGoals: MacroGoals;
  onboardingComplete: boolean;
}

export interface MealEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  imageUrl: string | null;
  sourceId: number | null;
  sourceType: 'recipe' | 'ingredient' | 'custom';
  loggedAt: string;
  mealType: MealType;
}

export interface DailyMeals {
  breakfast: MealEntry[];
  lunch: MealEntry[];
  dinner: MealEntry[];
  snack: MealEntry[];
}

export interface DailyDiary {
  date: string;
  meals: DailyMeals;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface PlannedMeal {
  id: number;
  title: string;
  calories: number;
  image: string;
  readyInMinutes: number;
  servings: number;
}

export interface DayPlan {
  date: string;
  dayName: string;
  meals: {
    breakfast: PlannedMeal | null;
    lunch: PlannedMeal | null;
    dinner: PlannedMeal | null;
  };
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface WeeklyPlan {
  id: string;
  weekStart: string;
  weekEnd: string;
  dailyTarget: number;
  days: DayPlan[];
  createdAt: string;
  isTemplate: boolean;
  templateName: string | null;
}

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  readyInMinutes: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  usedIngredientCount?: number;
  missedIngredientCount?: number;
  summary?: string;
  instructions?: string;
  extendedIngredients?: SpoonacularIngredient[];
  nutrition?: SpoonacularNutrition;
}

export interface SpoonacularIngredient {
  id: number;
  name: string;
  original: string;
  amount: number;
  unit: string;
  image: string;
}

export interface SpoonacularNutrition {
  nutrients: Array<{
    name: string;
    amount: number;
    unit: string;
    percentOfDailyNeeds: number;
  }>;
}

export interface FoodSearchResult {
  id: number;
  name: string;
  image: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  sourceType: 'recipe' | 'ingredient';
}
