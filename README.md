# CalTrackr Expo Product Demo

CalTrackr is an Expo React Native app with web support, Firebase Auth, and Firestore persistence. It turns the midterm report into a usable product demo for calorie tracking, weekly planning, recipe search, profile goals, shopping lists, and saved templates.

CalTrackr stores real application data in Firebase Auth and Firestore. The tracker can estimate nutrition from natural-language entries such as `grilled chicken rice bowl`, and the recipe finder can pull live recipes from external APIs.

Recipe Finder supports pantry-based matching:

- `Best pantry fit` returns only recipes with at least one non-staple pantry match and ranks stronger matches first.
- `Must include all` returns only recipes containing every selected non-staple ingredient.
- `Browse all` clears pantry filtering and intentionally shows the full catalog.
- `MealDB search` only uses TheMealDB so classroom demos do not burn Spoonacular quota.
- `Both APIs` deliberately searches both TheMealDB and Spoonacular, then pins external API results above the local catalog.
- API recipe cards open the same detail page as local recipes; the external source link is shown from that detail page.
- Weekly Planner shows `Regenerate plan` once a plan exists and replaces the week with a fresh randomized breakfast/lunch/dinner plan.

The Firestore schema and role model are documented in `docs/firebase-schema.md`.

## Local Tooling

This workspace uses a user-local Node 22 binary at:

```bash
/home/huseyin/.local/node/bin
```

Prefix commands with that path if `node` is not installed globally:

```bash
PATH=/home/huseyin/.local/node/bin:$PATH npm run web
```

## Run With Firebase

Create a Firebase project with Authentication and Firestore enabled, then put the web app config in `.env.local`:

```text
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

Start Expo Web:

```bash
PATH=/home/huseyin/.local/node/bin:$PATH npx expo start --web --port 8082
```

## Local Emulator Option

Firebase emulators are still useful for local testing. Set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true`, then run `npm run emulators` in a separate terminal.

## Nutrition Estimate APIs

The tracker estimates calories/macros from plain text.

- Preferred: API Ninjas Nutrition with `EXPO_PUBLIC_API_NINJAS_KEY`.
- Default: USDA FoodData Central with `EXPO_PUBLIC_USDA_API_KEY=DEMO_KEY`.
- Optional fallback: set `EXPO_PUBLIC_CALORIE_NINJAS_API_KEY` for CalorieNinjas.

For production web builds, put commercial nutrition keys behind a backend or Cloud Function instead of shipping them as public Expo env vars.

## Recipe APIs

- `MealDB search`: TheMealDB free API with `EXPO_PUBLIC_THEMEALDB_API_KEY=1`.
- `Both APIs`: TheMealDB plus Spoonacular using `EXPO_PUBLIC_SPOONACULAR_API_KEY`.
- Legacy provider mode is still available in code with `EXPO_PUBLIC_RECIPE_API_PROVIDER`, but the visible app uses the two explicit buttons above.

## Useful URLs

- App: http://localhost:8082
- Firebase Emulator UI: http://127.0.0.1:4000
- Auth emulator: http://127.0.0.1:4000/auth
- Firestore emulator: http://127.0.0.1:4000/firestore

## Checks

```bash
PATH=/home/huseyin/.local/node/bin:$PATH npm run typecheck
PATH=/home/huseyin/.local/node/bin:$PATH npm run lint
```
