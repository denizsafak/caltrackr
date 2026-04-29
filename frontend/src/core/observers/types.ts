import { DailySummary } from "../../types";

export interface CalorieObserver {
  update(summary: DailySummary): void;
}
