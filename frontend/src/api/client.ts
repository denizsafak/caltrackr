import {
  AddMealResponse,
  DailySummary,
  MealInput,
  Recipe,
  UserProfile,
  WeeklyPlan
} from "../types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export class ApiClient {
  async getToday(): Promise<DailySummary> {
    return this.request<DailySummary>("/meals/today");
  }

  async addMeal(meal: MealInput): Promise<AddMealResponse> {
    return this.request<AddMealResponse>("/meals", {
      method: "POST",
      body: JSON.stringify(meal)
    });
  }

  async generatePlan(dailyGoal?: number): Promise<WeeklyPlan> {
    return this.request<WeeklyPlan>("/plans/generate", {
      method: "POST",
      body: JSON.stringify({ dailyGoal })
    });
  }

  async savePlanTemplate(name: string): Promise<{ id: number; name: string }> {
    return this.request<{ id: number; name: string }>("/plans/save-template", {
      method: "POST",
      body: JSON.stringify({ name })
    });
  }

  async searchRecipes(input: {
    ingredients: string;
    excludeIngredients?: string;
    excludeAllergens?: string;
    maxPrepTime?: number;
    strategy?: "fastest" | "bestMatch";
  }): Promise<Recipe[]> {
    const response = await this.request<{ recipes: Recipe[] }>("/recipes/search", {
      method: "POST",
      body: JSON.stringify(input)
    });
    return response.recipes;
  }

  async getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>("/profile");
  }

  async updateGoal(dailyGoal: number): Promise<UserProfile> {
    return this.request<UserProfile>("/profile/goal", {
      method: "PUT",
      body: JSON.stringify({ dailyGoal })
    });
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json"
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "API request failed." }));
      throw new Error(error.message);
    }

    return response.json();
  }
}
