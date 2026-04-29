class FastestRecipesStrategy {
  apply(recipes) {
    return [...recipes].sort((a, b) => a.prepTimeMinutes - b.prepTimeMinutes);
  }
}

class AllergenSafeStrategy {
  constructor(excludedAllergens = []) {
    this.excludedAllergens = excludedAllergens.map((item) => item.toLowerCase());
  }

  apply(recipes) {
    if (this.excludedAllergens.length === 0) {
      return recipes;
    }

    return recipes.filter((recipe) =>
      recipe.ingredients.every((ingredient) => {
        if (!ingredient.allergenTag) {
          return true;
        }
        return !this.excludedAllergens.includes(ingredient.allergenTag.toLowerCase());
      })
    );
  }
}

module.exports = { FastestRecipesStrategy, AllergenSafeStrategy };
