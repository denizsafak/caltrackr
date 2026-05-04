import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { UserProfile, DailyDiary, WeeklyPlan, MealEntry, MealType } from '@/types';
import { format } from 'date-fns';

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function createUserProfile(
  uid: string,
  data: { name: string; email: string; photoURL: string | null }
) {
  const defaultGoal = 2000;
  const profile: Omit<UserProfile, 'uid'> = {
    name: data.name,
    email: data.email,
    photoURL: data.photoURL,
    createdAt: new Date().toISOString(),
    dailyCalorieGoal: defaultGoal,
    weight: null,
    height: null,
    age: null,
    gender: null,
    activityLevel: 'moderate',
    dietaryPreferences: [],
    allergens: [],
    macroGoals: { protein: 150, carbs: 200, fat: 65 },
    onboardingComplete: false,
  };
  await setDoc(doc(db, 'users', uid), profile);
  return { uid, ...profile } as UserProfile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as UserProfile;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(db, 'users', uid), data as Record<string, unknown>);
}

// ─── Daily Diary ──────────────────────────────────────────────────────────────

function diaryRef(uid: string, date: string) {
  return doc(db, 'users', uid, 'diary', date);
}

function emptyDiary(date: string): DailyDiary {
  return {
    date,
    meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
  };
}

export async function getDailyDiary(uid: string, date: string): Promise<DailyDiary> {
  const snap = await getDoc(diaryRef(uid, date));
  if (!snap.exists()) return emptyDiary(date);
  return snap.data() as DailyDiary;
}

export async function addMealEntry(uid: string, date: string, entry: MealEntry) {
  const diary = await getDailyDiary(uid, date);
  const mealKey = entry.mealType as MealType;
  diary.meals[mealKey] = [...diary.meals[mealKey], entry];
  diary.totalCalories += entry.calories;
  diary.totalProtein += entry.protein;
  diary.totalCarbs += entry.carbs;
  diary.totalFat += entry.fat;
  await setDoc(diaryRef(uid, date), diary);
  return diary;
}

export async function removeMealEntry(uid: string, date: string, entryId: string, mealType: MealType) {
  const diary = await getDailyDiary(uid, date);
  const entry = diary.meals[mealType].find((e) => e.id === entryId);
  if (!entry) return diary;

  diary.meals[mealType] = diary.meals[mealType].filter((e) => e.id !== entryId);
  diary.totalCalories = Math.max(0, diary.totalCalories - entry.calories);
  diary.totalProtein = Math.max(0, diary.totalProtein - entry.protein);
  diary.totalCarbs = Math.max(0, diary.totalCarbs - entry.carbs);
  diary.totalFat = Math.max(0, diary.totalFat - entry.fat);
  await setDoc(diaryRef(uid, date), diary);
  return diary;
}

export async function getRecentDiaries(uid: string, days = 7): Promise<DailyDiary[]> {
  const ref = collection(db, 'users', uid, 'diary');
  const q = query(ref, orderBy('date', 'desc'), limit(days));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as DailyDiary);
}

// ─── Weekly Plans ─────────────────────────────────────────────────────────────

export async function saveWeeklyPlan(uid: string, plan: WeeklyPlan) {
  await setDoc(doc(db, 'users', uid, 'weeklyPlans', plan.id), plan);
}

export async function getWeeklyPlan(uid: string, planId: string): Promise<WeeklyPlan | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'weeklyPlans', planId));
  if (!snap.exists()) return null;
  return snap.data() as WeeklyPlan;
}

export async function getWeeklyPlans(uid: string): Promise<WeeklyPlan[]> {
  const ref = collection(db, 'users', uid, 'weeklyPlans');
  const q = query(ref, orderBy('createdAt', 'desc'), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as WeeklyPlan);
}

export async function deleteWeeklyPlan(uid: string, planId: string) {
  await deleteDoc(doc(db, 'users', uid, 'weeklyPlans', planId));
}
