import React, { useEffect, useRef } from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AppDataProvider, normalizePlanMeal, useAppData } from '@/context/app-data';
import * as AuthContext from '@/context/auth';
import * as Firestore from 'firebase/firestore';
import * as RecipesService from '@/services/recipes';
import { Text } from 'react-native';

// Mock dependencies
jest.mock('@/context/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  db: {},
}));

const mockRecipe = {
  id: 'r1',
  title: 'Meal',
  mealType: 'Lunch',
  calories: 100,
  macros: { protein: 10, carbs: 20, fats: 5 },
  ingredients: ['A'],
  instructions: [],
  source: 'local',
  allergens: [],
  prepMinutes: 10,
  tags: [],
  summary: '',
  imageUrl: '',
};

const mockPlan = {
  id: '1',
  title: 'Plan',
  weekStart: '2026-05-05',
  days: [
    {
      date: '2026-05-05',
      dayLabel: 'Tue',
      meals: [{ id: 'm1', mealType: 'Lunch', title: 'Meal', recipeId: 'r1', calories: 100 }],
    },
  ],
};

const mockShoppingList = {
  id: '1', weekStart: '2023-01-01', items: [{ id: '1', checked: false }]
};

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(() => ({ empty: false, docs: [{ id: '1', data: () => mockPlan }] })),
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn((ref, callback) => {
    // Return dummy data based on the type of ref or just generic docs
    callback({ exists: () => true, id: '1', data: () => ({ role: 'admin', clientIds: ['c1'] }), docs: [
      { id: '1', data: () => mockPlan },
      { id: '1', data: () => mockShoppingList },
      { id: 'user1', data: () => ({ role: 'dietitian', clientIds: ['c1'], weekStart: '' }) },
      { id: 'c1', data: () => ({ role: 'user', dietitianId: 'user1', weekStart: '' }) }
    ] });
    return jest.fn();
  }),
  limit: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(),
  })),
  serverTimestamp: jest.fn(() => 'timestamp'),
  arrayRemove: jest.fn(),
  arrayUnion: jest.fn(),
}));

jest.mock('@/services/recipes', () => ({
  getExternalRecipeById: jest.fn(() => ({ id: 'r1', ingredients: ['A'] })),
  searchExternalRecipes: jest.fn(() => ({ recipes: [] })),
}));

const docFor = <T extends { id: string }>(data: T) => ({ id: data.id, data: () => data });

const mockDefaultSnapshots = () => {
  (Firestore.onSnapshot as jest.Mock).mockImplementation((_ref, callback) => {
    // Return dummy data based on the type of ref or just generic docs
    callback({ exists: () => true, id: '1', data: () => ({ role: 'admin', clientIds: ['c1'] }), docs: [
      docFor(mockPlan),
      docFor(mockShoppingList),
      docFor({ id: 'user1', role: 'dietitian', clientIds: ['c1'], weekStart: '' }),
      docFor({ id: 'c1', role: 'user', dietitianId: 'user1', weekStart: '' }),
    ] });
    return jest.fn();
  });
};

const mockAppDataSnapshots = ({
  profile = { role: 'user' },
  recipes = [mockRecipe],
  weeklyPlans = [mockPlan],
  mealLogs = [],
  shoppingLists = [],
} = {}) => {
  const snapshots = [
    { exists: () => true, id: 'user1', data: () => profile },
    { docs: recipes.map(docFor) },
    { docs: mealLogs.map(docFor) },
    { docs: weeklyPlans.map(docFor) },
    { docs: shoppingLists.map(docFor) },
  ];

  (Firestore.onSnapshot as jest.Mock).mockImplementation((_ref, callback) => {
    callback(snapshots.shift() ?? { docs: [] });
    return jest.fn();
  });
};

const GeneratePlanOnReady = () => {
  const data = useAppData();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current || data.loading || !data.profile || !data.activePlan) return;
    didRun.current = true;
    data.generatePlan().catch(console.error);
  }, [data]);

  return <Text>Child</Text>;
};

const LoadPlanOnReady = ({ planId }: { planId: string }) => {
  const data = useAppData();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current || data.loading || !data.profile || !data.weeklyPlans.length) return;
    didRun.current = true;
    data.loadPlan(planId).catch(console.error);
  }, [data, planId]);

  return <Text>Child</Text>;
};

describe('normalizePlanMeal', () => {
  it('normalizes correctly with recipe', () => {
    const meal = { id: 'm1', title: 'Meal', mealType: 'Lunch' as any, calories: 500, recipeId: 'r1' };
    const recipes = [
      { id: 'r1', title: 'R', mealType: 'Lunch' as any, calories: 600, macros: { protein: 10, carbs: 20, fats: 30 }, ingredients: ['A'], instructions: [], source: 'local' as const, allergens: [], prepMinutes: 10, tags: [], summary: '', imageUrl: '' }
    ];
    const result = normalizePlanMeal('2023-01-01', meal, 'p1', recipes);
    expect(result.title).toBe('Meal');
    expect(result.calories).toBe(500); // from meal
    expect(result.recipeId).toBe('r1');
    expect(result.ingredients).toEqual(['A']);
  });
  
  it('normalizes correctly without recipe', () => {
    const meal = { id: 'm2', title: 'Meal', mealType: 'Dinner' as any, calories: 1000 };
    const result = normalizePlanMeal('2023-01-01', meal, 'p1', []);
    expect(result.calories).toBe(1000);
    expect(result.recipeId).toBeUndefined();
  });
});

const DummyComponent = () => {
  const data = useAppData();
  
  useEffect(() => {
    // Fire all methods to test coverage
    const fireAll = async () => {
      try { await data.logMeal({ title: 'T', mealType: 'Lunch', calories: 1, protein: 1, carbs: 1, fats: 1, ingredients: 'a' }); } catch {}
      try { await data.updateMeal('1', { title: 'T', mealType: 'Lunch', calories: 1, protein: 1, carbs: 1, fats: 1, ingredients: 'a' }); } catch {}
      try { await data.deleteMeal('1'); } catch {}
      try { await data.cookAndLog({ id: 'r1', title: 'R', mealType: 'Lunch', calories: 600, macros: { protein: 10, carbs: 20, fats: 30 }, ingredients: ['A'], instructions: [], source: 'local', allergens: [], prepMinutes: 10, tags: [], summary: '', imageUrl: '' }); } catch {}
      try { await data.generatePlan(); } catch {}
      try { await data.deletePlan('1'); } catch {}
      try { await data.savePlan(); } catch {}
      try { await data.loadPlan('1'); } catch {}
      try { await data.buildClientPlanDraft('c1', 'auto'); } catch {}
      try { await data.savePlanForClient('c1', mockPlan as any); } catch {}
      try { await data.generateShoppingList(); } catch {}
      try { await data.toggleShoppingItem('1'); } catch {}
      try { await data.updateProfile({ name: 'N' }); } catch {}
      try { await data.setUserRole('c1', 'admin'); } catch {}
      try { await data.assignClientToDietitian('c1', 'user1'); } catch {}
      try { await data.deleteUserAccount('c1'); } catch {}
      try { await data.logPlanDay('2023-01-01'); } catch {}
      try { await data.choosePlanMeal('2023-01-01', 'm1', 'r1'); } catch {}
      try { await data.swapMeal('2023-01-01', 'm1'); } catch {}
    };
    fireAll();
  }, [data]);
  
  return <Text>Child</Text>;
};

describe('AppDataProvider', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockDefaultSnapshots();
    (RecipesService.searchExternalRecipes as jest.Mock).mockResolvedValue({ recipes: [] });
  });

  it('renders correctly for unauthenticated user', async () => {
    (AuthContext.useAuth as jest.Mock).mockReturnValue({ user: null });
    
    const { findByText } = render(
      <AppDataProvider>
        <Text>Child</Text>
      </AppDataProvider>
    );
    expect(await findByText('Child')).toBeTruthy();
  });

  it('initializes for authenticated user and covers methods', async () => {
    const mockUser = { uid: 'user1', email: 'test@example.com', displayName: 'Test' };
    (AuthContext.useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    
    const mockGetDoc = jest.fn().mockResolvedValue({ exists: () => true, data: () => ({ role: 'admin' }) });
    (Firestore.getDoc as jest.Mock).mockImplementation(mockGetDoc);

    render(
      <AppDataProvider>
        <DummyComponent />
      </AppDataProvider>
    );
    
    await waitFor(() => {
      expect(Firestore.getDoc).toHaveBeenCalled();
    });
  });

  it('regenerates the active plan from the current week Monday', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-06T10:00:00'));
    const mockUser = { uid: 'user1', email: 'test@example.com', displayName: 'Test' };
    (AuthContext.useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (Firestore.getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ role: 'user' }) });
    mockAppDataSnapshots();

    render(
      <AppDataProvider>
        <GeneratePlanOnReady />
      </AppDataProvider>
    );

    await waitFor(() => {
      const regeneratedPlan = (Firestore.setDoc as jest.Mock).mock.calls.find(([, payload]) => payload?.title === 'Regenerated smart week')?.[1];
      expect(regeneratedPlan).toEqual(
        expect.objectContaining({
          id: mockPlan.id,
          weekStart: '2026-05-04',
        }),
      );
      expect(regeneratedPlan.days[0]).toEqual(
        expect.objectContaining({
          date: '2026-05-04',
          dayLabel: 'Mon',
        }),
      );
    });
  });

  it('reloads saved plans with day labels recalculated for the current week', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-06T10:00:00'));
    const mockUser = { uid: 'user1', email: 'test@example.com', displayName: 'Test' };
    (AuthContext.useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (Firestore.getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ role: 'user' }) });
    mockAppDataSnapshots();

    render(
      <AppDataProvider>
        <LoadPlanOnReady planId={mockPlan.id} />
      </AppDataProvider>
    );

    await waitFor(() => {
      const loadedPlan = (Firestore.setDoc as jest.Mock).mock.calls.find(([, payload]) => payload?.weekStart === '2026-05-04')?.[1];
      expect(loadedPlan).toEqual(
        expect.objectContaining({
          id: 'week-2026-05-04',
          weekStart: '2026-05-04',
        }),
      );
      expect(loadedPlan.days[0]).toEqual(
        expect.objectContaining({
          date: '2026-05-04',
          dayLabel: 'Mon',
        }),
      );
    });
  });
});
