import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  addDaysISO,
  buildPlanFromRecipes,
  buildShoppingList,
  buildStarterPlan,
  buildTemplateFromPlan,
  defaultProfile,
  todayISO,
} from '@/data/defaults';
import { useAuth } from '@/context/auth';
import { db } from '@/lib/firebase';
import { MealDraft, MealLog, MealType, PlanMeal, PlanTemplate, Recipe, ShoppingList, UserProfile, WeeklyPlan } from '@/types/domain';

type AppDataContextValue = {
  profile: UserProfile | null;
  recipes: Recipe[];
  mealLogs: MealLog[];
  weeklyPlans: WeeklyPlan[];
  templates: PlanTemplate[];
  shoppingLists: ShoppingList[];
  activePlan: WeeklyPlan | null;
  activeShoppingList: ShoppingList | null;
  loading: boolean;
  todayMeals: MealLog[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  logMeal: (draft: MealDraft) => Promise<void>;
  updateMeal: (id: string, draft: MealDraft) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  cookAndLog: (recipe: Recipe, mealType?: MealType) => Promise<void>;
  logPlanDay: (dayDate: string) => Promise<number>;
  choosePlanMeal: (dayDate: string, mealId: string, recipeId: string) => Promise<void>;
  generatePlan: () => Promise<void>;
  swapMeal: (dayDate: string, mealId: string) => Promise<void>;
  saveTemplate: (title?: string) => Promise<void>;
  loadTemplate: (templateId: string) => Promise<void>;
  generateShoppingList: () => Promise<void>;
  toggleShoppingItem: (itemId: string) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);
const legacyDemoMealIds = ['breakfast-demo', 'lunch-demo'];
const planDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const planMealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const splitIngredients = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function normalizeMeal(draft: MealDraft): Omit<MealLog, 'id'> {
  const meal: Omit<MealLog, 'id'> = {
    title: draft.title.trim() || 'Untitled meal',
    mealType: draft.mealType,
    calories: Number(draft.calories) || 0,
    macros: {
      protein: Number(draft.protein) || 0,
      carbs: Number(draft.carbs) || 0,
      fats: Number(draft.fats) || 0,
    },
    ingredients: splitIngredients(draft.ingredients),
    date: draft.date ?? todayISO(),
  };

  const recipeId = draft.recipeId?.trim();
  if (recipeId) {
    meal.recipeId = recipeId;
  }

  return meal;
}

const makePlanMealLogId = (planId: string, dayDate: string, mealId: string) =>
  `plan-${planId}-${dayDate}-${mealId}`.replace(/[^A-Za-z0-9_-]/g, '-');

const estimateMacrosFromCalories = (calories: number) => ({
  protein: Math.round((calories * 0.25) / 4),
  carbs: Math.round((calories * 0.45) / 4),
  fats: Math.round((calories * 0.3) / 9),
});

function normalizePlanMeal(dayDate: string, meal: PlanMeal, planId: string, recipes: Recipe[]): Omit<MealLog, 'id'> {
  const recipe = meal.recipeId ? recipes.find((item) => item.id === meal.recipeId) : undefined;
  const log: Omit<MealLog, 'id'> = {
    date: dayDate,
    mealType: meal.mealType,
    title: meal.title,
    calories: Number(meal.calories) || recipe?.calories || 0,
    macros: recipe?.macros ?? estimateMacrosFromCalories(Number(meal.calories) || 0),
    ingredients: recipe?.ingredients ?? [],
    sourcePlanId: planId,
    sourcePlanMealId: meal.id,
  };

  if (meal.recipeId) {
    log.recipeId = meal.recipeId;
  }

  return log;
}

function planMealFromRecipe(meal: PlanMeal, recipe: Recipe): PlanMeal {
  return {
    ...meal,
    mealType: recipe.mealType,
    title: recipe.title,
    calories: recipe.calories,
    recipeId: recipe.id,
  };
}

function randomRecipe(pool: Recipe[], currentRecipeId?: string) {
  const candidates = pool.filter((recipe) => recipe.id !== currentRecipeId);
  const options = candidates.length ? candidates : pool;
  return options[Math.floor(Math.random() * options.length)];
}

function buildRegeneratedPlan(profile: UserProfile | null, recipes: Recipe[], id = `week-${todayISO()}`, start = todayISO()): WeeklyPlan {
  if (!recipes.length) {
    return buildStarterPlan(profile?.dailyGoal, profile?.preferences, profile?.allergens, id, start);
  }

  const days = planDayNames.map((dayLabel, dayIndex) => {
    const date = addDaysISO(start, dayIndex);
    const meals = planMealTypes.map((mealType, mealIndex) => {
      const recipePool = recipes.filter((recipe) => recipe.mealType === mealType);
      const recipe = randomRecipe(recipePool.length ? recipePool : recipes);
      return {
        id: `${dayIndex}-${mealType.toLowerCase()}-${recipe.id}`,
        mealType,
        title: recipe.title,
        calories: recipe.calories,
        recipeId: recipe.id,
      } satisfies PlanMeal;
    });

    return {
      date,
      dayLabel,
      meals,
    };
  });

  return {
    id,
    title: 'Regenerated smart week',
    weekStart: start,
    days,
  };
}

function sortPlans(plans: WeeklyPlan[]) {
  return [...plans].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

function normalizeUserProfile(id: string, data: Partial<UserProfile>): UserProfile {
  return {
    ...defaultProfile(id, data.email ?? 'caltrackr@example.com', data.name ?? 'New user'),
    ...data,
    id,
    role: data.role ?? 'user',
    dietitianId: data.dietitianId ?? null,
    clientIds: data.clientIds ?? [],
  };
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);

  const ensureUserBootstrap = useCallback(async () => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) return;

    const batch = writeBatch(db);
    const createdAt = serverTimestamp();

    batch.set(userRef, {
      ...defaultProfile(user.uid, user.email ?? 'caltrackr@example.com', user.displayName ?? 'New user'),
      createdAt,
      updatedAt: createdAt,
    });

    await batch.commit();
  }, [user]);

  const cleanupLegacyDemoMeals = useCallback(async () => {
    if (!user) return;
    await Promise.all(legacyDemoMealIds.map((id) => deleteDoc(doc(db, 'users', user.uid, 'mealLogs', id))));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setMealLogs([]);
      setWeeklyPlans([]);
      setTemplates([]);
      setShoppingLists([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    ensureUserBootstrap()
      .catch(console.error)
      .finally(() => setLoading(false));
    cleanupLegacyDemoMeals().catch(console.error);

    const handleSnapshotError = (label: string) => (error: Error) => {
      console.error(`Firestore ${label} listener failed`, error);
      setLoading(false);
    };

    const unsubscribers = [
      onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          setProfile(snapshot.exists() ? normalizeUserProfile(snapshot.id, snapshot.data() as Partial<UserProfile>) : null);
        },
        handleSnapshotError('profile'),
      ),
      onSnapshot(
        query(collection(db, 'recipes'), orderBy('title')),
        (snapshot) => {
          const nextRecipes = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Recipe);
          setRecipes(nextRecipes);
        },
        handleSnapshotError('recipes'),
      ),
      onSnapshot(
        query(collection(db, 'users', user.uid, 'mealLogs'), orderBy('date', 'desc')),
        (snapshot) => {
          setMealLogs(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as MealLog));
        },
        handleSnapshotError('meal logs'),
      ),
      onSnapshot(
        collection(db, 'users', user.uid, 'weeklyPlans'),
        (snapshot) => {
          setWeeklyPlans(sortPlans(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as WeeklyPlan)));
        },
        handleSnapshotError('weekly plans'),
      ),
      onSnapshot(
        collection(db, 'users', user.uid, 'planTemplates'),
        (snapshot) => {
          setTemplates(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as PlanTemplate));
        },
        handleSnapshotError('plan templates'),
      ),
      onSnapshot(
        collection(db, 'users', user.uid, 'shoppingLists'),
        (snapshot) => {
          setShoppingLists(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ShoppingList));
          setLoading(false);
        },
        handleSnapshotError('shopping lists'),
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [cleanupLegacyDemoMeals, ensureUserBootstrap, user]);

  const activePlan = weeklyPlans[0] ?? null;
  const activeShoppingList = shoppingLists[0] ?? null;
  const todayMeals = mealLogs.filter((meal) => meal.date === todayISO());
  const totals = todayMeals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.calories,
      protein: sum.protein + meal.macros.protein,
      carbs: sum.carbs + meal.macros.carbs,
      fats: sum.fats + meal.macros.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  const requireUser = useCallback(() => {
    if (!user) throw new Error('You must be signed in.');
    return user.uid;
  }, [user]);

  const logMeal = useCallback(
    async (draft: MealDraft) => {
      const uid = requireUser();
      await addDoc(collection(db, 'users', uid, 'mealLogs'), { ...normalizeMeal(draft), createdAt: serverTimestamp() });
    },
    [requireUser],
  );

  const updateMeal = useCallback(
    async (id: string, draft: MealDraft) => {
      const uid = requireUser();
      await setDoc(doc(db, 'users', uid, 'mealLogs', id), { ...normalizeMeal(draft), updatedAt: serverTimestamp() }, { merge: true });
    },
    [requireUser],
  );

  const deleteMeal = useCallback(
    async (id: string) => {
      const uid = requireUser();
      await deleteDoc(doc(db, 'users', uid, 'mealLogs', id));
    },
    [requireUser],
  );

  const cookAndLog = useCallback(
    async (recipe: Recipe, mealType: MealType = recipe.mealType) => {
      await logMeal({
        title: recipe.title,
        mealType,
        calories: recipe.calories,
        protein: recipe.macros.protein,
        carbs: recipe.macros.carbs,
        fats: recipe.macros.fats,
        ingredients: recipe.ingredients.join(', '),
        recipeId: recipe.id,
      });
    },
    [logMeal],
  );

  const logPlanDay = useCallback(
    async (dayDate: string) => {
      const uid = requireUser();
      if (!activePlan) throw new Error('No active plan is available.');

      const day = activePlan.days.find((item) => item.date === dayDate);
      if (!day) throw new Error('That planned day could not be found.');

      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      day.meals.forEach((meal) => {
        batch.set(
          doc(db, 'users', uid, 'mealLogs', makePlanMealLogId(activePlan.id, day.date, meal.id)),
          {
            ...normalizePlanMeal(day.date, meal, activePlan.id, recipes),
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          { merge: true },
        );
      });

      await batch.commit();
      return day.meals.length;
    },
    [activePlan, recipes, requireUser],
  );

  const generatePlan = useCallback(async () => {
    const uid = requireUser();
    const plan = activePlan?.id
      ? buildRegeneratedPlan(profile, recipes, activePlan.id)
      : recipes.length
        ? buildPlanFromRecipes(recipes)
        : buildStarterPlan(profile?.dailyGoal, profile?.preferences, profile?.allergens);
    await setDoc(
      doc(db, 'users', uid, 'weeklyPlans', plan.id),
      {
        ...plan,
        createdAt: activePlan?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }, [activePlan, profile, recipes, requireUser]);

  const choosePlanMeal = useCallback(
    async (dayDate: string, mealId: string, recipeId: string) => {
      const uid = requireUser();
      if (!activePlan) return;

      const recipe = recipes.find((item) => item.id === recipeId);
      if (!recipe) throw new Error('That recipe is not available in the catalog.');

      const nextDays = activePlan.days.map((day) => {
        if (day.date !== dayDate) return day;
        return {
          ...day,
          meals: day.meals.map((meal) => (meal.id === mealId ? planMealFromRecipe(meal, recipe) : meal)),
        };
      });

      await updateDoc(doc(db, 'users', uid, 'weeklyPlans', activePlan.id), {
        days: nextDays,
        updatedAt: serverTimestamp(),
      });
    },
    [activePlan, recipes, requireUser],
  );

  const swapMeal = useCallback(
    async (dayDate: string, mealId: string) => {
      const uid = requireUser();
      if (!activePlan) return;

      const nextDays = activePlan.days.map((day) => {
        if (day.date !== dayDate) return day;
        return {
          ...day,
          meals: day.meals.map((meal) => {
            if (meal.id !== mealId) return meal;
            const sameMealType = recipes.filter((recipe) => recipe.mealType === meal.mealType);
            const nextRecipe = randomRecipe(sameMealType.length ? sameMealType : recipes, meal.recipeId);
            return nextRecipe ? planMealFromRecipe(meal, nextRecipe) : meal;
          }),
        };
      });

      await updateDoc(doc(db, 'users', uid, 'weeklyPlans', activePlan.id), {
        days: nextDays,
        updatedAt: serverTimestamp(),
      });
    },
    [activePlan, recipes, requireUser],
  );

  const saveTemplate = useCallback(async (title?: string) => {
    const uid = requireUser();
    if (!activePlan) return;
    const template = buildTemplateFromPlan(activePlan, title);

    await setDoc(doc(db, 'users', uid, 'planTemplates', template.id), { ...template, createdAt: serverTimestamp() });
  }, [activePlan, requireUser]);

  const loadTemplate = useCallback(
    async (templateId: string) => {
      const uid = requireUser();
      const template = templates.find((item) => item.id === templateId);
      if (!template) return;
      const plan: WeeklyPlan = {
        id: `week-${todayISO()}`,
        title: template.title,
        weekStart: todayISO(),
        days: template.days,
      };
      await setDoc(doc(db, 'users', uid, 'weeklyPlans', plan.id), { ...plan, createdAt: serverTimestamp() }, { merge: true });
    },
    [requireUser, templates],
  );

  const generateShoppingList = useCallback(async () => {
    const uid = requireUser();
    if (!activePlan) return;
    const list = buildShoppingList(activePlan, recipes);
    await setDoc(doc(db, 'users', uid, 'shoppingLists', list.id), { ...list, createdAt: serverTimestamp() }, { merge: true });
  }, [activePlan, recipes, requireUser]);

  const toggleShoppingItem = useCallback(
    async (itemId: string) => {
      const uid = requireUser();
      if (!activeShoppingList) return;
      const items = activeShoppingList.items.map((item) => (item.id === itemId ? { ...item, checked: !item.checked } : item));
      await updateDoc(doc(db, 'users', uid, 'shoppingLists', activeShoppingList.id), { items, updatedAt: serverTimestamp() });
    },
    [activeShoppingList, requireUser],
  );

  const patchProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      const uid = requireUser();
      await setDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    },
    [requireUser],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      profile,
      recipes,
      mealLogs,
      weeklyPlans,
      templates,
      shoppingLists,
      activePlan,
      activeShoppingList,
      loading,
      todayMeals,
      totals,
      logMeal,
      updateMeal,
      deleteMeal,
      cookAndLog,
      logPlanDay,
      choosePlanMeal,
      generatePlan,
      swapMeal,
      saveTemplate,
      loadTemplate,
      generateShoppingList,
      toggleShoppingItem,
      updateProfile: patchProfile,
    }),
    [
      activePlan,
      activeShoppingList,
      choosePlanMeal,
      cookAndLog,
      deleteMeal,
      generatePlan,
      generateShoppingList,
      loadTemplate,
      loading,
      logPlanDay,
      logMeal,
      mealLogs,
      patchProfile,
      profile,
      recipes,
      saveTemplate,
      shoppingLists,
      swapMeal,
      templates,
      todayMeals,
      toggleShoppingItem,
      totals,
      updateMeal,
      weeklyPlans,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider');
  }
  return context;
}
