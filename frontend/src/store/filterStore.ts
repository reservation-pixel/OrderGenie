import { create } from 'zustand';

export type DateRangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

interface FilterState {
  outletId: string | 'all';
  range: DateRangePreset;
  customFrom: string | null;
  customTo: string | null;
  setOutletId: (outletId: string | 'all') => void;
  setRange: (range: DateRangePreset) => void;
  setCustomRange: (from: string, to: string) => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// The Header's date filter is always two explicit Start/End date inputs (no presets
// UI), so the store defaults to an explicit today-to-today custom range from the
// start, rather than an implicit preset the UI wouldn't have a way to display.
export const useFilterStore = create<FilterState>((set) => ({
  outletId: 'all',
  range: 'custom',
  customFrom: todayIso(),
  customTo: todayIso(),
  setOutletId: (outletId) => set({ outletId }),
  setRange: (range) => set({ range }),
  setCustomRange: (customFrom, customTo) => set({ customFrom, customTo, range: 'custom' }),
}));
