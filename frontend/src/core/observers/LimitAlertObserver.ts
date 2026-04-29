import { DailySummary } from "../../types";
import { CalorieObserver } from "./types";

export class LimitAlertObserver implements CalorieObserver {
  constructor(private readonly setAlert: (message: string) => void) {}

  update(summary: DailySummary) {
    if (summary.progressPercent >= 100) {
      this.setAlert("Daily calorie goal exceeded.");
      return;
    }

    if (summary.progressPercent >= 90) {
      this.setAlert("You are close to your daily calorie goal.");
      return;
    }

    this.setAlert("You are on track.");
  }
}
