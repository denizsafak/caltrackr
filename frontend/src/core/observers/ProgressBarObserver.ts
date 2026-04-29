import { DailySummary } from "../../types";
import { CalorieObserver } from "./types";

export class ProgressBarObserver implements CalorieObserver {
  constructor(private readonly setSummary: (summary: DailySummary) => void) {}

  update(summary: DailySummary) {
    this.setSummary(summary);
  }
}
