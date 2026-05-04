import { create } from 'zustand';
import type { UserProfile } from '@/types';
import { onAuthChanged } from '@/services/firebase/auth';
import { getUserProfile } from '@/services/firebase/firestore';

interface AuthState {
  user: UserProfile | null;
  firebaseUid: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUid: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user, firebaseUid: user?.uid ?? null }),
  setLoading: (isLoading) => set({ isLoading }),
  updateProfile: (data) => {
    const current = get().user;
    if (current) set({ user: { ...current, ...data } });
  },

  initialize: () => {
    const unsubscribe = onAuthChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          set({ user: profile, firebaseUid: firebaseUser.uid, isLoading: false, isInitialized: true });
        } catch {
          set({ user: null, firebaseUid: null, isLoading: false, isInitialized: true });
        }
      } else {
        set({ user: null, firebaseUid: null, isLoading: false, isInitialized: true });
      }
    });
    return unsubscribe;
  },
}));
