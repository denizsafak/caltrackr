import { todayISO, addDaysISO, defaultProfile, buildPlanFromRecipes, buildShoppingList } from '@/data/defaults';
import { Recipe } from '@/types/domain';

const mockRecipes: Recipe[] = [
  { id: '1', title: 'Eggs', mealType: 'Breakfast', calories: 300, ingredients: ['Eggs'], instructions: [], prepMinutes: 5, macros: { protein: 0, carbs: 0, fats: 0 }, source: 'local', allergens: [], tags: [], summary: '', imageUrl: '' },
  { id: '2', title: 'Salad', mealType: 'Lunch', calories: 400, ingredients: ['Lettuce'], instructions: [], prepMinutes: 10, macros: { protein: 0, carbs: 0, fats: 0 }, source: 'local', allergens: [], tags: [], summary: '', imageUrl: '' },
  { id: '3', title: 'Steak', mealType: 'Dinner', calories: 600, ingredients: ['Steak'], instructions: [], prepMinutes: 20, macros: { protein: 0, carbs: 0, fats: 0 }, source: 'local', allergens: [], tags: [], summary: '', imageUrl: '' },
];

describe('Data Defaults', () => {
  it('exports expected defaults', () => {
    expect(todayISO()).toBeDefined();
    expect(addDaysISO(todayISO(), 5)).toBeDefined();
    
    const profile = defaultProfile('123', 'test@test.com');
    expect(profile.id).toBe('123');
    expect(profile.email).toBe('test@test.com');
    expect(profile.role).toBe('user');
  });

  it('builds a plan from recipes', () => {
    const plan = buildPlanFromRecipes(mockRecipes);
    expect(plan.days.length).toBe(7);
    expect(plan.days[0].meals.length).toBe(3);
  });

  it('fails to build plan without recipes', () => {
    expect(() => buildPlanFromRecipes([])).toThrow();
  });

  it('builds a shopping list from a plan', () => {
    const plan = buildPlanFromRecipes(mockRecipes);
    const list = buildShoppingList(plan, mockRecipes);
    expect(list.items.length).toBeGreaterThan(0);
    expect(list.items[0].label).toBeDefined();
    expect(list.items[0].quantity).toMatch(/g$/);
    expect(list.items[0].quantity).not.toContain('portion');
  });

  it('aggregates grammed recipe ingredients for shopping lists', () => {
    const recipes: Recipe[] = [
      {
        id: 'chicken-rice',
        title: 'Chicken Rice',
        mealType: 'Dinner',
        calories: 600,
        ingredients: ['180 g chicken breast', '75 g rice', '10 g olive oil'],
        instructions: [],
        prepMinutes: 20,
        macros: { protein: 0, carbs: 0, fats: 0 },
        source: 'local',
        allergens: [],
        tags: [],
        summary: '',
        imageUrl: '',
      },
    ];
    const plan = {
      id: 'test-plan',
      title: 'Test plan',
      weekStart: todayISO(),
      days: [
        {
          date: todayISO(),
          dayLabel: 'Mon',
          meals: [
            { id: 'meal-1', mealType: 'Dinner' as const, title: 'Chicken Rice', calories: 600, recipeId: 'chicken-rice' },
            { id: 'meal-2', mealType: 'Dinner' as const, title: 'Chicken Rice', calories: 600, recipeId: 'chicken-rice' },
          ],
        },
      ],
    };

    const list = buildShoppingList(plan, recipes);

    expect(list.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'chicken breast', quantity: '360 g' }),
        expect.objectContaining({ label: 'rice', quantity: '150 g' }),
        expect.objectContaining({ label: 'olive oil', quantity: '20 g' }),
      ]),
    );
  });
});
