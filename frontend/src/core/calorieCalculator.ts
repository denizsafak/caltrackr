import { ApiClient } from "../api/client";
import { AddMealResponse, DailySummary, MealInput } from "../types";
import { CalorieObserver } from "./observers/types";

export class CalorieCalculatorAPI {
  private observers: CalorieObserver[] = [];

  constructor(private readonly api: ApiClient) {}

  addObserver(observer: CalorieObserver) {
    this.observers.push(observer);
  }

  async addMeal(meal: MealInput): Promise<AddMealResponse> {
    const result = await this.api.addMeal(meal);
    this.notify(result.summary);
    return result;
  }

  async getToday(): Promise<DailySummary> {
    return this.api.getToday();
  }

  private notify(summary: DailySummary) {
    this.observers.forEach((observer) => observer.update(summary));
  }
}
