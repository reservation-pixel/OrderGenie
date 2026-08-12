import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  isHydrated: boolean;
  toggle: () => void;
  setHydrated: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isHydrated: false,
      toggle: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'ordergenie-sidebar',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
