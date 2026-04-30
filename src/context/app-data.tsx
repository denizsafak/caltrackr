import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
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
  buildTemplateFromPlan,
  defaultProfile,
  todayISO,
} from '@/data/defaults';
import recipeCatalog from '../../data/recipe-catalog.json';
import { useAuth } from '@/context/auth';
import { db } from '@/lib/firebase';
import { getExternalRecipeById, searchExternalRecipes } from '@/services/recipes';
import { MealDraft, MealLog, MealType, PlanMeal, PlanTemplate, Recipe, ShoppingList, UserProfile, UserRole, WeeklyPlan } from '@/types/domain';

type AppDataContextValue = {
  profile: UserProfile | null;
  recipes: Recipe[];
  assignedClients: UserProfile[];
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
  deletePlan: (id: string) => Promise<void>;
  swapMeal: (dayDate: string, mealId: string) => Promise<void>;
  saveTemplate: (title?: string) => Promise<void>;
  loadTemplate: (templateId: string) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  buildClientPlanDraft: (clientId: string, mode: 'current' | 'auto' | 'empty') => Promise<WeeklyPlan>;
  savePlanForClient: (clientId: string, plan: WeeklyPlan) => Promise<void>;
  generateShoppingList: () => Promise<void>;
  toggleShoppingItem: (itemId: string) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  allUsers: UserProfile[];
  setUserRole: (uid: string, role: UserRole) => Promise<void>;
  assignClientToDietitian: (clientUid: string, nextDietitianUid: string | null) => Promise<void>;
  deleteUserAccount: (targetUid: string) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);
const planDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const planMealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];
const localCatalogRecipes = (recipeCatalog as { recipes: Recipe[] }).recipes.map((recipe) => ({
  ...recipe,
  source: recipe.source ?? 'local',
})) satisfies Recipe[];

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

const normalizeRecipeTitle = (title: string) => title.toLowerCase().replace('fasting window snack:', '').trim();

const mealTypesForProfile = (profile: UserProfile | null): MealType[] =>
  profile?.preferences.intermittentFasting ? ['Lunch', 'Dinner', 'Snack'] : planMealTypes;

const recipeMatchesProfile = (recipe: Recipe, profile: UserProfile | null) => {
  const haystack = `${recipe.title} ${recipe.summary} ${recipe.ingredients.join(' ')} ${recipe.tags.join(' ')} ${recipe.allergens.join(' ')}`.toLowerCase();
  const allergenText = [profile?.preferences.nutAllergy ? 'nut' : '', ...(profile?.allergens ?? [])]
    .join(' ')
    .toLowerCase();

  if (profile?.preferences.vegan && !haystack.includes('vegan') && !recipe.tags.some((tag) => tag.toLowerCase().includes('plant'))) {
    return false;
  }

  if (allergenText.includes('nut') && (haystack.includes('nut') || haystack.includes('peanut') || haystack.includes('almond'))) {
    return false;
  }

  return (profile?.allergens ?? []).every((allergen) => !haystack.includes(allergen.toLowerCase()));
};

const filterRecipesForProfile = (recipes: Recipe[], profile: UserProfile | null) => {
  return recipes.filter((recipe) => recipeMatchesProfile(recipe, profile));
};

async function searchRecipesForPlan(profile: UserProfile | null) {
  const preferenceTerms = [
    profile?.preferences.vegan ? 'vegan' : 'high protein',
    profile?.preferences.nutAllergy ? 'nut free' : '',
    ...(profile?.allergens ?? []).map((allergen) => `${allergen} free`),
  ].filter(Boolean);

  const result = await searchExternalRecipes({
    ingredients: profile?.pantry ?? [],
    query: preferenceTerms.join(' ') || 'healthy meal',
    number: 24,
  });

  return result?.recipes ?? [];
}

const uniqueRecipes = (recipes: Recipe[]) => Array.from(new Map(recipes.map((recipe) => [recipe.id, recipe])).values());

async function recipesForPlanGeneration(profile: UserProfile | null, recipes: Recipe[]) {
  const filteredLocalRecipes = filterRecipesForProfile(recipes, profile);
  const apiRecipes = await searchRecipesForPlan(profile);
  const combinedRecipes = uniqueRecipes([...filteredLocalRecipes, ...filterRecipesForProfile(apiRecipes, profile)]);

  if (combinedRecipes.length) return combinedRecipes;

  throw new Error('No recipes were found for this profile. Add matching Firestore recipes or search API recipes from the Recipe Finder first.');
}

async function recipesForMealSwap(meal: PlanMeal, profile: UserProfile | null, recipes: Recipe[]) {
  const notCurrentRecipe = (recipe: Recipe) => recipe.id !== meal.recipeId && normalizeRecipeTitle(recipe.title) !== normalizeRecipeTitle(meal.title);
  const matchingLocalRecipes = filterRecipesForProfile(recipes, profile)
    .filter((recipe) => recipe.mealType === meal.mealType)
    .filter(notCurrentRecipe);

  if (matchingLocalRecipes.length) return matchingLocalRecipes;

  const result = await searchExternalRecipes({
    ingredients: profile?.pantry ?? [],
    query: `${meal.mealType} ${profile?.preferences.vegan ? 'vegan' : 'high protein'}`,
    number: 12,
  });
  const matchingApiRecipes = filterRecipesForProfile(result?.recipes ?? [], profile).filter(notCurrentRecipe);
  if (matchingApiRecipes.length) return matchingApiRecipes;

  const fallbackApiRecipes = filterRecipesForProfile(await searchRecipesForPlan(profile), profile).filter(notCurrentRecipe);
  if (fallbackApiRecipes.length) return fallbackApiRecipes;

  throw new Error('No alternative recipe was found for this meal. Try adding recipes or changing your pantry/preferences.');
}

async function resolveRecipeForPlanMeal(meal: PlanMeal, recipes: Recipe[]): Promise<Recipe | null> {
  const localMatch = meal.recipeId
    ? recipes.find((recipe) => recipe.id === meal.recipeId)
    : recipes.find((recipe) => normalizeRecipeTitle(recipe.title) === normalizeRecipeTitle(meal.title));
  if (localMatch?.ingredients.length) return localMatch;

  if (meal.recipeId) {
    try {
      const externalRecipe = await getExternalRecipeById(meal.recipeId);
      if (externalRecipe?.ingredients.length) return externalRecipe;
    } catch (error) {
      console.warn(`Could not load external recipe ${meal.recipeId}`, error);
    }
  }

  try {
    const result = await searchExternalRecipes({
      ingredients: [],
      query: normalizeRecipeTitle(meal.title),
      number: 3,
    });
    const recipe = result?.recipes.find((item) => item.ingredients.length);
    if (!recipe) return null;

    return {
      ...recipe,
      id: meal.recipeId ?? recipe.id,
      title: meal.title,
    };
  } catch (error) {
    console.warn(`Could not search external recipe ingredients for ${meal.title}`, error);
    return null;
  }
}

async function resolveRecipesForShoppingList(plan: WeeklyPlan, recipes: Recipe[]) {
  const resolvedRecipes = await Promise.all(plan.days.flatMap((day) => day.meals.map((meal) => resolveRecipeForPlanMeal(meal, recipes))));
  return Array.from(
    new Map(
      [...recipes, ...resolvedRecipes.filter((recipe): recipe is Recipe => Boolean(recipe))].map((recipe) => [recipe.id, recipe]),
    ).values(),
  );
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>(localCatalogRecipes);
  const [assignedClients, setAssignedClients] = useState<UserProfile[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
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

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setAssignedClients([]);
      setMealLogs([]);
      setWeeklyPlans([]);
      setTemplates([]);
      setShoppingLists([]);
      setAllUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    ensureUserBootstrap()
      .catch(console.error)
      .finally(() => setLoading(false));

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
          setRecipes(uniqueRecipes([...nextRecipes, ...localCatalogRecipes]));
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
  }, [ensureUserBootstrap, user]);

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      setAllUsers([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), orderBy('email')),
      (snapshot) => {
        setAllUsers(snapshot.docs.map((item) => normalizeUserProfile(item.id, item.data() as Partial<UserProfile>)));
      },
      (error) => {
        console.error('Firestore all users listener failed', error);
        setAllUsers([]);
      },
    );

    return () => unsubscribe();
  }, [profile?.role, user]);

  useEffect(() => {
    if (!user || profile?.role !== 'dietitian') {
      setAssignedClients([]);
      return;
    }

    const clientIds = profile.clientIds ?? [];
    if (!clientIds.length) {
      setAssignedClients([]);
      return;
    }

    const byId = new Map<string, UserProfile>();
    const setOrderedClients = () =>
      setAssignedClients(
        clientIds
          .map((id) => byId.get(id))
          .filter((client): client is UserProfile => Boolean(client) && client!.dietitianId === user.uid),
      );

    const unsubscribers = clientIds.map((clientId) =>
      onSnapshot(
        doc(db, 'users', clientId),
        (snapshot) => {
          if (snapshot.exists()) {
            byId.set(clientId, normalizeUserProfile(snapshot.id, snapshot.data() as Partial<UserProfile>));
          } else {
            byId.delete(clientId);
          }
          setOrderedClients();
        },
        (error) => console.error(`Firestore assigned client ${clientId} listener failed`, error),
      ),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [profile?.clientIds, profile?.role, user]);

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
    const planRecipes = await recipesForPlanGeneration(profile, recipes);
    const plan = buildPlanFromRecipes(
      planRecipes,
      activePlan?.id ?? `week-${todayISO()}`,
      activePlan?.weekStart ?? todayISO(),
      mealTypesForProfile(profile),
      activePlan,
    );

    await setDoc(
      doc(db, 'users', uid, 'weeklyPlans', plan.id),
      {
        ...plan,
        title: activePlan?.id ? 'Regenerated smart week' : plan.title,
        createdAt: activePlan?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }, [activePlan, profile, recipes, requireUser]);

  const deletePlan = useCallback(
    async (id: string) => {
      const uid = requireUser();
      await Promise.all([
        deleteDoc(doc(db, 'users', uid, 'weeklyPlans', id)),
        deleteDoc(doc(db, 'users', uid, 'shoppingLists', `shopping-${id}`)),
      ]);
    },
    [requireUser],
  );

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
      const targetDay = activePlan.days.find((day) => day.date === dayDate);
      const targetMeal = targetDay?.meals.find((meal) => meal.id === mealId);
      if (!targetMeal) throw new Error('That planned meal could not be found.');
      const recipeOptions = await recipesForMealSwap(targetMeal, profile, recipes);
      const nextRecipe = randomRecipe(recipeOptions, targetMeal.recipeId);

      const nextDays = activePlan.days.map((day) => {
        if (day.date !== dayDate) return day;
        return {
          ...day,
          meals: day.meals.map((meal) => {
            if (meal.id !== mealId) return meal;
            return planMealFromRecipe(meal, { ...nextRecipe, mealType: meal.mealType });
          }),
        };
      });

      await updateDoc(doc(db, 'users', uid, 'weeklyPlans', activePlan.id), {
        days: nextDays,
        updatedAt: serverTimestamp(),
      });
    },
    [activePlan, profile, recipes, requireUser],
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

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      const uid = requireUser();
      await deleteDoc(doc(db, 'users', uid, 'planTemplates', templateId));
    },
    [requireUser],
  );

  const buildClientPlanDraft = useCallback(
    async (clientId: string, mode: 'current' | 'auto' | 'empty'): Promise<WeeklyPlan> => {
      requireUser();
      if (profile?.role !== 'dietitian') {
        throw new Error('Only dietitians can build plans for clients.');
      }

      const client = assignedClients.find((item) => item.id === clientId);
      if (!client) throw new Error('That client is not assigned to this dietitian account.');

      if (mode === 'current') {
        const plansRef = collection(db, 'users', clientId, 'weeklyPlans');
        const plansQuery = query(plansRef, orderBy('weekStart', 'desc'), limit(1));
        const snap = await getDocs(plansQuery);
        if (!snap.empty) {
          return { id: snap.docs[0].id, ...snap.docs[0].data() } as WeeklyPlan;
        }
      }

      const start = todayISO();
      const planId = `week-${start}`;
      const mealTypes = mealTypesForProfile(client);

      if (mode === 'auto') {
        const planRecipes = await recipesForPlanGeneration(client, recipes);
        return {
          ...buildPlanFromRecipes(planRecipes, planId, start, mealTypes),
          title: `Dietitian plan for ${client.name}`,
        };
      }

      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return {
        id: planId,
        title: `Dietitian plan for ${client.name}`,
        weekStart: start,
        days: dayLabels.map((dayLabel, dayIndex) => ({
          date: addDaysISO(start, dayIndex),
          dayLabel,
          meals: mealTypes.map((mealType) => ({
            id: `${dayIndex}-${mealType.toLowerCase()}-empty`,
            mealType,
            title: 'No meal selected',
            calories: 0,
          })),
        })),
      };
    },
    [assignedClients, profile?.role, recipes, requireUser],
  );

  const savePlanForClient = useCallback(
    async (clientId: string, plan: WeeklyPlan) => {
      const uid = requireUser();
      if (profile?.role !== 'dietitian') {
        throw new Error('Only dietitians can save plans for clients.');
      }

      const client = assignedClients.find((item) => item.id === clientId);
      if (!client) throw new Error('That client is not assigned to this dietitian account.');

      await setDoc(
        doc(db, 'users', clientId, 'weeklyPlans', plan.id),
        {
          ...plan,
          title: plan.title || `Dietitian plan for ${client.name}`,
          createdByUid: uid,
          createdByRole: 'dietitian',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [assignedClients, profile?.role, requireUser],
  );

  const generateShoppingList = useCallback(async () => {
    const uid = requireUser();
    if (!activePlan) return;
    const resolvedRecipes = await resolveRecipesForShoppingList(activePlan, recipes);
    const list = buildShoppingList(activePlan, resolvedRecipes);
    if (!list.items.length) {
      throw new Error('No ingredients were found for this plan. Add recipes to Firestore or fetch API recipes before building the shopping list.');
    }
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

  const setUserRole = useCallback(
    async (uid: string, role: UserRole) => {
      requireUser();
      if (profile?.role !== 'admin') throw new Error('Only admins can change user roles.');

      const target = allUsers.find((item) => item.id === uid);
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      const willKeepClients = role === 'dietitian' && target?.role === 'dietitian';

      batch.set(
        doc(db, 'users', uid),
        {
          role,
          dietitianId: role === 'user' ? (target?.dietitianId ?? null) : null,
          clientIds: willKeepClients ? (target?.clientIds ?? []) : [],
          updatedAt: timestamp,
        },
        { merge: true },
      );

      if (!willKeepClients && target?.role === 'dietitian') {
        (target.clientIds ?? []).forEach((clientUid) => {
          batch.set(doc(db, 'users', clientUid), { dietitianId: null, updatedAt: timestamp }, { merge: true });
        });
      }

      if (role !== 'user' && target?.dietitianId) {
        batch.set(
          doc(db, 'users', target.dietitianId),
          { clientIds: arrayRemove(uid), updatedAt: timestamp },
          { merge: true },
        );
      }

      await batch.commit();
    },
    [allUsers, profile?.role, requireUser],
  );

  const assignClientToDietitian = useCallback(
    async (clientUid: string, nextDietitianUid: string | null) => {
      requireUser();
      if (profile?.role !== 'admin') throw new Error('Only admins can assign dietitians.');

      const client = allUsers.find((item) => item.id === clientUid);
      if (!client) throw new Error('Client not found.');
      if (client.role !== 'user') throw new Error('Only accounts with the user role can be assigned a dietitian.');

      if (nextDietitianUid) {
        const dietitian = allUsers.find((item) => item.id === nextDietitianUid);
        if (!dietitian || dietitian.role !== 'dietitian') {
          throw new Error('Pick an account with the dietitian role.');
        }
      }

      const batch = writeBatch(db);
      const timestamp = serverTimestamp();

      batch.set(
        doc(db, 'users', clientUid),
        { dietitianId: nextDietitianUid, updatedAt: timestamp },
        { merge: true },
      );

      if (client.dietitianId && client.dietitianId !== nextDietitianUid) {
        batch.set(
          doc(db, 'users', client.dietitianId),
          { clientIds: arrayRemove(clientUid), updatedAt: timestamp },
          { merge: true },
        );
      }

      if (nextDietitianUid && nextDietitianUid !== client.dietitianId) {
        batch.set(
          doc(db, 'users', nextDietitianUid),
          { clientIds: arrayUnion(clientUid), updatedAt: timestamp },
          { merge: true },
        );
      }

      await batch.commit();
    },
    [allUsers, profile?.role, requireUser],
  );

  const deleteUserAccount = useCallback(
    async (targetUid: string) => {
      requireUser();
      if (profile?.role !== 'admin') throw new Error('Only admins can delete accounts.');

      const target = allUsers.find((item) => item.id === targetUid);
      if (!target) throw new Error('Account not found.');
      if (targetUid === profile.id) throw new Error('You cannot delete your own admin account.');

      const batch = writeBatch(db);
      const timestamp = serverTimestamp();

      if (target.dietitianId) {
        batch.set(
          doc(db, 'users', target.dietitianId),
          { clientIds: arrayRemove(targetUid), updatedAt: timestamp },
          { merge: true },
        );
      }

      if (target.role === 'dietitian' && target.clientIds) {
        target.clientIds.forEach((clientUid) => {
          batch.set(doc(db, 'users', clientUid), { dietitianId: null, updatedAt: timestamp }, { merge: true });
        });
      }

      batch.delete(doc(db, 'users', targetUid));
      await batch.commit();
    },
    [allUsers, profile, requireUser],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      profile,
      recipes,
      assignedClients,
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
      deletePlan,
      swapMeal,
      saveTemplate,
      loadTemplate,
      deleteTemplate,
      buildClientPlanDraft,
      savePlanForClient,
      generateShoppingList,
      toggleShoppingItem,
      updateProfile: patchProfile,
      allUsers,
      setUserRole,
      assignClientToDietitian,
      deleteUserAccount,
    }),
    [
      activePlan,
      activeShoppingList,
      allUsers,
      assignClientToDietitian,
      assignedClients,
      buildClientPlanDraft,
      choosePlanMeal,
      cookAndLog,
      deleteMeal,
      deletePlan,
      deleteTemplate,
      deleteUserAccount,
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
      savePlanForClient,
      saveTemplate,
      setUserRole,
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
