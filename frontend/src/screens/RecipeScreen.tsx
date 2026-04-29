import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiClient } from "../api/client";
import { Card } from "../components/Card";
import { CalorieCalculatorAPI } from "../core/calorieCalculator";
import { colors } from "../theme/colors";
import { Recipe } from "../types";

export function RecipeScreen({
  api,
  calorieCalculator
}: {
  api: ApiClient;
  calorieCalculator: CalorieCalculatorAPI;
}) {
  const [ingredients, setIngredients] = useState("chicken, rice, broccoli");
  const [excludeAllergens, setExcludeAllergens] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [status, setStatus] = useState("");

  async function search() {
    setStatus("Searching recipes...");
    try {
      const results = await api.searchRecipes({
        ingredients,
        excludeAllergens,
        maxPrepTime: 30,
        strategy: "fastest"
      });
      setRecipes(results);
      setStatus(`${results.length} recipe suggestion(s) found.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to search recipes.");
    }
  }

  async function logRecipe(recipe: Recipe) {
    await calorieCalculator.addMeal({
      name: recipe.name,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fats: recipe.fats
    });
    setStatus(`${recipe.name} logged as a meal.`);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Recipes</Text>
      <Text style={styles.subtitle}>Use what you have and avoid what you cannot eat.</Text>

      <Card>
        <TextInput
          style={styles.input}
          value={ingredients}
          onChangeText={setIngredients}
          placeholder="Ingredients, comma separated"
          placeholderTextColor={colors.muted}
        />
        <TextInput
          style={styles.input}
          value={excludeAllergens}
          onChangeText={setExcludeAllergens}
          placeholder="Exclude allergens, e.g. dairy, gluten"
          placeholderTextColor={colors.muted}
        />
        <Pressable style={styles.primaryButton} onPress={search}>
          <Text style={styles.primaryText}>Search</Text>
        </Pressable>
        {!!status && <Text style={styles.status}>{status}</Text>}
      </Card>

      {recipes.map((recipe) => (
        <Card key={recipe.id}>
          <View style={styles.recipeHeader}>
            <View style={styles.recipeTitleWrap}>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <Text style={styles.recipeMeta}>
                {recipe.prepTimeMinutes} min · {recipe.calories} kcal
              </Text>
            </View>
            <Pressable style={styles.logButton} onPress={() => logRecipe(recipe)}>
              <Text style={styles.logText}>Log</Text>
            </Pressable>
          </View>
          <Text style={styles.ingredients}>{recipe.ingredients.join(", ")}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    marginBottom: 16,
    marginTop: 4
  },
  input: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginBottom: 10,
    padding: 13
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14
  },
  primaryText: {
    color: colors.surface,
    fontWeight: "900"
  },
  status: {
    color: colors.primaryDark,
    fontWeight: "700",
    marginTop: 12
  },
  recipeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  recipeTitleWrap: {
    flex: 1,
    paddingRight: 12
  },
  recipeName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  recipeMeta: {
    color: colors.muted,
    marginTop: 4
  },
  ingredients: {
    color: colors.muted,
    marginTop: 12
  },
  logButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  logText: {
    color: colors.primaryDark,
    fontWeight: "900"
  }
});
