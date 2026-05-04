import { create } from 'zustand';
import { format } from 'date-fns';
import type { DailyDiary, MealEntry, MealType } from '@/types';
import {
  getDailyDiary,
  addMealEntry as dbAddMeal,
  removeMealEntry as dbRemoveMeal,
} from '@/services/firebase/firestore';
import { useAuthStore } from './auth';
import { nanoid } from './utils';

interface DiaryState {
  diary: DailyDiary | null;
  selectedDate: string;
  isLoading: boolean;
  loadDiary: (date?: string) => Promise<void>;
  addMeal: (entry: Omit<MealEntry, 'id' | 'loggedAt'>) => Promise<void>;
  removeMeal: (entryId: string, mealType: MealType) => Promise<void>;
  setSelectedDate: (date: string) => void;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  diary: null,
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  isLoading: false,

  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().loadDiary(date);
  },

  loadDiary: async (date) => {
    const uid = useAuthStore.getState().firebaseUid;
    if (!uid) return;
    const targetDate = date ?? get().selectedDate;
    set({ isLoading: true });
    try {
      const diary = await getDailyDiary(uid, targetDate);
      set({ diary, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addMeal: async (entryData) => {
    const uid = useAuthStore.getState().firebaseUid;
    if (!uid) return;
    const entry: MealEntry = {
      ...entryData,
      id: nanoid(),
      loggedAt: new Date().toISOString(),
    };
    const diary = await dbAddMeal(uid, get().selectedDate, entry);
    set({ diary });
  },

  removeMeal: async (entryId, mealType) => {
    const uid = useAuthStore.getState().firebaseUid;
    if (!uid) return;
    const diary = await dbRemoveMeal(uid, get().selectedDate, entryId, mealType);
    set({ diary });
  },
}));
