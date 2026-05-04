import { create } from 'zustand';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import type { WeeklyPlan, DayPlan } from '@/types';
import { generateWeeklyMealPlan } from '@/services/spoonacular/client';
import { saveWeeklyPlan, getWeeklyPlans, deleteWeeklyPlan } from '@/services/firebase/firestore';
import { useAuthStore } from './auth';
import { nanoid } from './utils';

interface PlannerState {
  currentPlan: WeeklyPlan | null;
  savedPlans: WeeklyPlan[];
  isGenerating: boolean;
  isSaving: boolean;
  weekOffset: number;
  generatePlan: (targetCalories: number, diet?: string, exclude?: string[]) => Promise<void>;
  savePlan: (templateName?: string) => Promise<void>;
  loadSavedPlans: () => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  loadTemplate: (plan: WeeklyPlan) => void;
  setWeekOffset: (offset: number) => void;
  getWeekDates: () => { start: Date; end: Date; label: string };
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  currentPlan: null,
  savedPlans: [],
  isGenerating: false,
  isSaving: false,
  weekOffset: 0,

  getWeekDates: () => {
    const base = addWeeks(new Date(), get().weekOffset);
    const start = startOfWeek(base, { weekStartsOn: 1 });
    const end = endOfWeek(base, { weekStartsOn: 1 });
    const label = `${format(start, 'MMM d')} — ${format(end, 'MMM d')}`;
    return { start, end, label };
  },

  setWeekOffset: (offset) => set({ weekOffset: offset }),

  generatePlan: async (targetCalories, diet, exclude) => {
    set({ isGenerating: true });
    try {
      const { start, end } = get().getWeekDates();
      const days = await generateWeeklyMealPlan(targetCalories, diet, exclude, start);
      const plan: WeeklyPlan = {
        id: nanoid(),
        weekStart: format(start, 'yyyy-MM-dd'),
        weekEnd: format(end, 'yyyy-MM-dd'),
        dailyTarget: targetCalories,
        days,
        createdAt: new Date().toISOString(),
        isTemplate: false,
        templateName: null,
      };
      set({ currentPlan: plan, isGenerating: false });
    } catch (err) {
      set({ isGenerating: false });
      throw err;
    }
  },

  savePlan: async (templateName) => {
    const uid = useAuthStore.getState().firebaseUid;
    const plan = get().currentPlan;
    if (!uid || !plan) return;
    set({ isSaving: true });
    try {
      const updated: WeeklyPlan = {
        ...plan,
        isTemplate: !!templateName,
        templateName: templateName ?? null,
      };
      await saveWeeklyPlan(uid, updated);
      set({ isSaving: false });
      await get().loadSavedPlans();
    } catch {
      set({ isSaving: false });
    }
  },

  loadSavedPlans: async () => {
    const uid = useAuthStore.getState().firebaseUid;
    if (!uid) return;
    const plans = await getWeeklyPlans(uid);
    set({ savedPlans: plans });
  },

  deletePlan: async (planId) => {
    const uid = useAuthStore.getState().firebaseUid;
    if (!uid) return;
    await deleteWeeklyPlan(uid, planId);
    set((s) => ({ savedPlans: s.savedPlans.filter((p) => p.id !== planId) }));
  },

  loadTemplate: (plan) => set({ currentPlan: plan }),
}));
