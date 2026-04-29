class WeeklyPlanMemento {
  constructor(plan) {
    this.snapshot = JSON.stringify(plan);
  }

  restore() {
    return JSON.parse(this.snapshot);
  }
}

module.exports = { WeeklyPlanMemento };
