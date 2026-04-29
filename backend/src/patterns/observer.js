class CalorieSubject {
  constructor() {
    this.observers = [];
  }

  addObserver(observer) {
    this.observers.push(observer);
  }

  notify(summary) {
    return this.observers.map((observer) => observer.update(summary));
  }
}

class ProgressBarObserver {
  update(summary) {
    return {
      observer: "ProgressBar",
      progressPercent: summary.progressPercent
    };
  }
}

class LimitAlertObserver {
  update(summary) {
    if (summary.progressPercent >= 100) {
      return {
        observer: "LimitAlert",
        level: "danger",
        message: "Daily calorie goal exceeded."
      };
    }

    if (summary.progressPercent >= 90) {
      return {
        observer: "LimitAlert",
        level: "warning",
        message: "You are close to your daily calorie goal."
      };
    }

    return {
      observer: "LimitAlert",
      level: "ok",
      message: "You are on track."
    };
  }
}

module.exports = { CalorieSubject, ProgressBarObserver, LimitAlertObserver };
