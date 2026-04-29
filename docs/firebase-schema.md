# Firebase Schema

CalTrackr uses Firebase Auth for identity and Firestore for application data.

## Roles

Every user profile has a `role` field:

```ts
role: 'user' | 'dietitian' | 'admin'
```

- `user`: tracks meals and manages their own plans.
- `dietitian`: can read assigned clients and create/update their plans, templates, and shopping lists.
- `admin`: can manage users and the global recipe catalog.

## Collections

```text
recipes/{recipeId}
users/{uid}
users/{uid}/mealLogs/{logId}
users/{uid}/weeklyPlans/{planId}
users/{uid}/planTemplates/{templateId}
users/{uid}/shoppingLists/{listId}
```

## Example Documents

```json
{
  "users/aliceUid": {
    "name": "Alice Student",
    "email": "alice@example.com",
    "role": "user",
    "dietitianId": "dietitianUid",
    "dailyGoal": 1800,
    "macroTargets": { "protein": 115, "carbs": 220, "fats": 60 },
    "weightKg": 78,
    "targetWeightKg": 70,
    "preferences": {
      "vegan": false,
      "nutAllergy": false,
      "intermittentFasting": false
    },
    "allergens": ["peanut"],
    "pantry": ["rice", "chicken", "spinach"]
  }
}
```

```json
{
  "users/dietitianUid": {
    "name": "Dr. Rivera",
    "email": "dietitian@example.com",
    "role": "dietitian",
    "clientIds": ["aliceUid"]
  }
}
```

```json
{
  "recipes/chicken-rice-bowl": {
    "title": "Chicken Rice Bowl",
    "mealType": "Lunch",
    "calories": 520,
    "macros": { "protein": 42, "carbs": 58, "fats": 14 },
    "ingredients": ["chicken breast", "rice", "spinach"],
    "allergens": [],
    "source": "local"
  }
}
```

## Security Model

- Users can create and update their own profile, but cannot promote themselves to `admin` or `dietitian`.
- Dietitians can access client data only when the client profile has `dietitianId` equal to the dietitian's UID.
- Admins can manage users and the global recipe catalog.
