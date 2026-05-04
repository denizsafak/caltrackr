import { todayISO, addDaysISO, defaultProfile, buildPlanFromRecipes, buildShoppingList } from '@/data/defaults';
import { Recipe } from '@/types/domain';

const mockRecipes: Recipe[] = [
  { id: '1', title: 'Eggs', mealType: 'Breakfast', calories: 300, ingredients: ['Eggs'], instructions: [], prepTimeMin: 5 },
  { id: '2', title: 'Salad', mealType: 'Lunch', calories: 400, ingredients: ['Lettuce'], instructions: [], prepTimeMin: 10 },
  { id: '3', title: 'Steak', mealType: 'Dinner', calories: 600, ingredients: ['Steak'], instructions: [], prepTimeMin: 20 },
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
  });
});
